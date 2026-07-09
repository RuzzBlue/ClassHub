"""ClassHub Python fallback server for Mac/Linux."""

import json
import os
import shutil
import sqlite3
import hashlib
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="ClassHub Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_ROOT = Path(os.environ.get("CLASSHUB_DATA", REPO_ROOT / "data"))
COURSES_PATH = REPO_ROOT / "courses"
DB_PATH = DATA_ROOT / "classhub.db"
SETTINGS_PATH = DATA_ROOT / "settings.json"
REGISTRY_PATH = DATA_ROOT / "registry.json"
DEMO_LICENSE = "CLASSHUB-DEMO-2026"


def ensure_dirs():
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    COURSES_PATH.mkdir(parents=True, exist_ok=True)


def get_db():
    ensure_dirs()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, displayName TEXT, role TEXT, avatar TEXT, prefs TEXT, createdAt TEXT
        );
        CREATE TABLE IF NOT EXISTS course_progress (
            userId TEXT, courseId TEXT, percent REAL, lastLessonId TEXT, updatedAt TEXT,
            PRIMARY KEY (userId, courseId)
        );
        CREATE TABLE IF NOT EXISTS lesson_progress (
            userId TEXT, courseId TEXT, lessonId TEXT, status TEXT, sectionsViewed TEXT,
            currentSection TEXT, completedAt TEXT, PRIMARY KEY (userId, courseId, lessonId)
        );
        CREATE TABLE IF NOT EXISTS quiz_results (
            id TEXT PRIMARY KEY, userId TEXT, courseId TEXT, quizId TEXT,
            score INTEGER, maxScore INTEGER, passed INTEGER, answers TEXT, attemptedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS licenses (
            userId TEXT, courseId TEXT, keyHash TEXT, status TEXT, expiresAt TEXT,
            PRIMARY KEY (userId, courseId)
        );
    """)
    if not conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        conn.execute(
            "INSERT INTO users VALUES (?,?,?,?,?,?)",
            ("user-demo", "Demo Learner", "learner", None, "{}", datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    return conn


def load_settings():
    ensure_dirs()
    defaults = {
        "dataRoot": str(DATA_ROOT),
        "coursesPath": str(COURSES_PATH),
        "locale": "en",
        "theme": {"accent": "#6c5ce7", "mode": "dark", "sounds": True},
        "activeUserId": "user-default",
        "setupComplete": True,
    }
    if SETTINGS_PATH.exists():
        defaults.update(json.loads(SETTINGS_PATH.read_text()))
    return defaults


def save_settings(s):
    ensure_dirs()
    SETTINGS_PATH.write_text(json.dumps(s, indent=2))


def load_registry():
    ensure_dirs()
    if REGISTRY_PATH.exists():
        return json.loads(REGISTRY_PATH.read_text())
    return {"courses": []}


def save_registry(r):
    REGISTRY_PATH.write_text(json.dumps(r, indent=2))


def load_manifest(course_path: Path):
    manifest_file = course_path / "course.json"
    if not manifest_file.exists():
        return None
    return json.loads(manifest_file.read_text(encoding="utf-8"))


@app.get("/api/settings")
def get_settings():
    return load_settings()


@app.put("/api/settings")
def put_settings(body: dict):
    s = load_settings()
    s.update(body)
    save_settings(s)
    return s


@app.post("/api/setup")
def setup(body: dict):
    global DATA_ROOT, COURSES_PATH
    DATA_ROOT = Path(body["dataRoot"])
    COURSES_PATH = Path(body.get("coursesPath", DATA_ROOT / "courses"))
    ensure_dirs()
    s = {
        "dataRoot": str(DATA_ROOT),
        "coursesPath": str(COURSES_PATH),
        "locale": "en",
        "theme": {"accent": "#6c5ce7", "mode": "dark", "sounds": True},
        "activeUserId": "user-default",
        "setupComplete": True,
    }
    save_settings(s)
    get_db()
    if body.get("installDemo"):
        demo_src = Path(__file__).parent.parent.parent / "courses" / "crypto-101"
        if demo_src.exists():
            dest = COURSES_PATH / "crypto-101"
            if not dest.exists():
                shutil.copytree(demo_src, dest)
            reg = load_registry()
            if not any(c["id"] == "crypto-101" for c in reg["courses"]):
                m = load_manifest(dest)
                reg["courses"].append({
                    "id": "crypto-101",
                    "path": str(dest),
                    "installedAt": datetime.now(timezone.utc).isoformat(),
                    "version": m.get("version", "1.0.0") if m else "1.0.0",
                })
                save_registry(reg)
    return s


@app.get("/api/courses")
def list_courses():
    settings = load_settings()
    user_id = settings.get("activeUserId", "user-default")
    registry = load_registry()
    conn = get_db()
    result = []
    for entry in registry["courses"]:
        m = load_manifest(Path(entry["path"]))
        if not m:
            continue
        prog = conn.execute(
            "SELECT percent FROM course_progress WHERE userId=? AND courseId=?",
            (user_id, entry["id"]),
        ).fetchone()
        lessons = sum(len(u["lessons"]) for mod in m["navigation"]["modules"] for u in mod["units"])
        result.append({
            "id": m["id"],
            "title": m["title"],
            "description": m["description"],
            "author": m["author"],
            "version": m["version"],
            "level": m.get("level", "beginner"),
            "language": m.get("language", "es"),
            "estimatedHours": m.get("estimatedHours"),
            "thumbnailUrl": f"/api/courses/{m['id']}/asset?path={m.get('thumbnail', '')}",
            "coverUrl": f"/api/courses/{m['id']}/asset?path={m.get('cover', '')}",
            "tags": m.get("tags", []),
            "moduleCount": len(m["navigation"]["modules"]),
            "lessonCount": lessons,
            "progress": prog["percent"] if prog else 0,
            "accessPolicy": m.get("access", {}).get("defaultPolicy", "free"),
            "installedAt": entry["installedAt"],
        })
    conn.close()
    return result


@app.post("/api/courses/import")
async def import_course(file: UploadFile = File(...)):
    ensure_dirs()
    staging = DATA_ROOT / "staging" / f"import-{datetime.now().timestamp()}"
    staging.mkdir(parents=True)
    zip_path = staging / file.filename
    with open(zip_path, "wb") as f:
        f.write(await file.read())
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(staging)
    bundle_root = staging
    entries = list(staging.iterdir())
    if len(entries) == 1 and entries[0].is_dir() and not (entries[0] / "course.json").exists():
        bundle_root = entries[0]
    elif len(entries) == 1 and entries[0].is_dir():
        bundle_root = entries[0]
    if not (bundle_root / "course.json").exists():
        children = [d for d in staging.iterdir() if d.is_dir()]
        for c in children:
            if (c / "course.json").exists():
                bundle_root = c
                break
    manifest = load_manifest(bundle_root)
    if not manifest:
        shutil.rmtree(staging, ignore_errors=True)
        raise HTTPException(400, "Invalid bundle: missing course.json")
    target = COURSES_PATH / manifest["id"]
    if target.exists():
        shutil.rmtree(target)
    shutil.move(str(bundle_root), str(target))
    shutil.rmtree(staging, ignore_errors=True)
    reg = load_registry()
    entry = {
        "id": manifest["id"],
        "path": str(target),
        "installedAt": datetime.now(timezone.utc).isoformat(),
        "version": manifest["version"],
    }
    reg["courses"] = [c for c in reg["courses"] if c["id"] != manifest["id"]]
    reg["courses"].append(entry)
    save_registry(reg)
    return {"success": True}


@app.get("/api/courses/{course_id}/manifest")
def get_manifest(course_id: str):
    reg = load_registry()
    entry = next((c for c in reg["courses"] if c["id"] == course_id), None)
    if not entry:
        raise HTTPException(404)
    return load_manifest(Path(entry["path"]))


@app.get("/api/courses/{course_id}/asset")
def get_asset(course_id: str, path: str):
    reg = load_registry()
    entry = next((c for c in reg["courses"] if c["id"] == course_id), None)
    if not entry:
        raise HTTPException(404)
    course_path = Path(entry["path"]).resolve()
    asset = (course_path / path).resolve()
    if not str(asset).startswith(str(course_path)):
        raise HTTPException(403)
    if not asset.exists():
        raise HTTPException(404)
    import base64
    content = asset.read_bytes()
    ext = asset.suffix.lower()
    mime = {
        ".html": "text/html", ".json": "application/json", ".png": "image/png",
        ".svg": "image/svg+xml", ".css": "text/css", ".md": "text/markdown",
        ".txt": "text/plain", ".pdf": "application/pdf",
    }.get(ext, "application/octet-stream")
    return {"content": base64.b64encode(content).decode(), "mimeType": mime, "path": str(asset)}


@app.get("/api/progress/{course_id}")
def get_progress(course_id: str):
    settings = load_settings()
    user_id = settings.get("activeUserId", "user-default")
    conn = get_db()
    course = conn.execute(
        "SELECT * FROM course_progress WHERE userId=? AND courseId=?", (user_id, course_id)
    ).fetchone()
    lessons = conn.execute(
        "SELECT * FROM lesson_progress WHERE userId=? AND courseId=?", (user_id, course_id)
    ).fetchall()
    quizzes = conn.execute(
        "SELECT * FROM quiz_results WHERE userId=? AND courseId=?", (user_id, course_id)
    ).fetchall()
    conn.close()
    return {
        "course": dict(course) if course else None,
        "lessons": [dict(l) for l in lessons],
        "quizzes": [dict(q) for q in quizzes],
        "grades": [],
    }


@app.post("/api/progress/lesson")
def update_lesson(body: dict):
    settings = load_settings()
    user_id = settings.get("activeUserId", "user-default")
    conn = get_db()
    conn.execute(
        """INSERT OR REPLACE INTO lesson_progress
        (userId, courseId, lessonId, status, sectionsViewed, currentSection, completedAt)
        VALUES (?,?,?,?,?,?,?)""",
        (
            user_id, body["courseId"], body["lessonId"],
            body.get("status", "in_progress"),
            json.dumps(body.get("sectionsViewed", [])),
            body.get("currentSection"),
            body.get("completedAt") or (datetime.now(timezone.utc).isoformat() if body.get("status") == "completed" else None),
        ),
    )
    conn.commit()
    conn.close()
    return get_progress(body["courseId"])


@app.post("/api/license/activate")
def activate_license(body: dict):
    settings = load_settings()
    user_id = settings.get("activeUserId", "user-default")
    key = body.get("key", "").strip().upper()
    if key != DEMO_LICENSE:
        return {"valid": False}
    conn = get_db()
    h = hashlib.sha256(key.encode()).hexdigest()
    conn.execute(
        "INSERT OR REPLACE INTO licenses VALUES (?,?,?,?,?)",
        (user_id, body["courseId"], h, "valid", None),
    )
    conn.commit()
    conn.close()
    return {"valid": True}


@app.get("/api/users")
def get_users():
    conn = get_db()
    rows = conn.execute("SELECT * FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def run():
    ensure_dirs()
    get_db()
    static_dir = Path(__file__).parent.parent.parent.parent / "out" / "renderer"
    if not static_dir.exists():
        static_dir = Path(__file__).parent.parent.parent.parent / "dist"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
    print(f"ClassHub server starting at http://localhost:8765")
    print(f"Data root: {DATA_ROOT}")
    uvicorn.run(app, host="0.0.0.0", port=8765)


if __name__ == "__main__":
    run()
