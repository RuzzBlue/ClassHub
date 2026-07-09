"""ClassHub Python fallback server for Mac/Linux."""

import json
import os
import shutil
import sqlite3
import hashlib
import zipfile
import base64
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
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


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


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
    for col, typedef in [("email", "TEXT"), ("passwordHash", "TEXT")]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
        except sqlite3.OperationalError:
            pass
    demo = conn.execute("SELECT id FROM users WHERE id=?", ("user-demo",)).fetchone()
    if not demo:
        conn.execute(
            "INSERT INTO users (id, displayName, role, avatar, prefs, createdAt, email, passwordHash) VALUES (?,?,?,?,?,?,?,?)",
            (
                "user-demo",
                "Demo Learner",
                "learner",
                None,
                "{}",
                datetime.now(timezone.utc).isoformat(),
                "demo@classhub.local",
                hash_password("demo123"),
            ),
        )
        conn.commit()
    else:
        conn.execute(
            "UPDATE users SET email=?, passwordHash=? WHERE id=? AND (email IS NULL OR email='')",
            ("demo@classhub.local", hash_password("demo123"), "user-demo"),
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


def sync_course_registry():
    """Scan courses/ folder and sync registry.json (matches Electron bundle-service)."""
    ensure_dirs()
    registry = load_registry()
    found = {}
    if COURSES_PATH.exists():
        for entry in COURSES_PATH.iterdir():
            if not entry.is_dir():
                continue
            manifest_path = entry / "course.json"
            if not manifest_path.exists():
                continue
            try:
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                course_id = manifest.get("id", entry.name)
                existing = next((c for c in registry["courses"] if c["id"] == course_id), None)
                found[course_id] = {
                    "id": course_id,
                    "path": str(entry.resolve()),
                    "installedAt": existing["installedAt"] if existing else datetime.now(timezone.utc).isoformat(),
                    "version": manifest.get("version", "1.0.0"),
                }
            except (json.JSONDecodeError, OSError):
                continue
    registry["courses"] = list(found.values())
    save_registry(registry)


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


@app.post("/api/auth/login")
def auth_login(body: dict):
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE lower(email)=lower(?)", (email,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(401, "Invalid email or password")
    user = dict(row)
    if user.get("passwordHash") != hash_password(password):
        raise HTTPException(401, "Invalid email or password")
    settings = load_settings()
    settings["activeUserId"] = user["id"]
    save_settings(settings)
    user.pop("passwordHash", None)
    return {"user": user}


@app.post("/api/auth/logout")
def auth_logout():
    settings = load_settings()
    settings["activeUserId"] = ""
    save_settings(settings)
    return {"loggedOut": True}


@app.get("/api/auth/me")
def auth_me():
    settings = load_settings()
    user_id = settings.get("activeUserId")
    if not user_id:
        return {"user": None}
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return {"user": None}
    user = dict(row)
    user.pop("passwordHash", None)
    return {"user": user}


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
    sync_course_registry()
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


def import_bundle_from_zip(zip_path: Path) -> dict:
    staging = zip_path.parent
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(staging)
    bundle_root = staging
    entries = [e for e in staging.iterdir() if e.name != zip_path.name]
    if len(entries) == 1 and entries[0].is_dir() and not (entries[0] / "course.json").exists():
        bundle_root = entries[0]
    elif len(entries) == 1 and entries[0].is_dir():
        bundle_root = entries[0]
    if not (bundle_root / "course.json").exists():
        for c in staging.iterdir():
            if c.is_dir() and (c / "course.json").exists():
                bundle_root = c
                break
    manifest = load_manifest(bundle_root)
    if not manifest:
        raise HTTPException(400, "Invalid bundle: missing course.json")
    target = COURSES_PATH / manifest["id"]
    if target.exists():
        shutil.rmtree(target)
    shutil.move(str(bundle_root), str(target))
    shutil.rmtree(staging, ignore_errors=True)
    reg = load_registry()
    entry = {
        "id": manifest["id"],
        "path": str(target.resolve()),
        "installedAt": datetime.now(timezone.utc).isoformat(),
        "version": manifest["version"],
    }
    reg["courses"] = [c for c in reg["courses"] if c["id"] != manifest["id"]]
    reg["courses"].append(entry)
    save_registry(reg)
    sync_course_registry()
    return {"success": True}


@app.post("/api/courses/sync")
def sync_courses():
    sync_course_registry()
    reg = load_registry()
    courses = list_courses()
    return {
        "synced": len(reg["courses"]),
        "courseIds": [c["id"] for c in reg["courses"]],
        "courses": courses,
    }


@app.post("/api/courses/import")
async def import_course(request: Request, file: UploadFile = File(None)):
    ensure_dirs()
    staging = DATA_ROOT / "staging" / f"import-{datetime.now().timestamp()}"
    staging.mkdir(parents=True)
    content_type = request.headers.get("content-type", "")
    if file and file.filename:
        zip_path = staging / file.filename
        with open(zip_path, "wb") as f:
            f.write(await file.read())
    elif "application/json" in content_type:
        body = await request.json()
        if not body.get("content"):
            raise HTTPException(400, "content required")
        zip_path = staging / (body.get("fileName") or "import.zip")
        with open(zip_path, "wb") as f:
            f.write(base64.b64decode(body["content"]))
    else:
        raise HTTPException(400, "zip file or JSON content required")
    return import_bundle_from_zip(zip_path)


@app.post("/api/courses/{course_id}/export")
def export_course_api(course_id: str, body: Optional[dict] = None):
    body = body or {}
    sync_course_registry()
    reg = load_registry()
    entry = next((c for c in reg["courses"] if c["id"] == course_id), None)
    if not entry:
        raise HTTPException(404, "Course not found")
    course_path = Path(entry["path"])
    if not course_path.exists():
        raise HTTPException(404, "Course folder not found")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(course_path):
            for name in files:
                full = Path(root) / name
                zf.write(full, full.relative_to(course_path))
    data = buffer.getvalue()
    save_path = body.get("savePath")
    if save_path:
        Path(save_path).write_bytes(data)
        return {"success": True, "path": save_path}
    return {"fileName": f"{course_id}.zip", "content": base64.b64encode(data).decode()}


@app.delete("/api/courses/{course_id}")
def delete_course(course_id: str):
    sync_course_registry()
    reg = load_registry()
    entry = next((c for c in reg["courses"] if c["id"] == course_id), None)
    if not entry:
        raise HTTPException(404, "Course not found")
    course_path = Path(entry["path"])
    if course_path.exists():
        shutil.rmtree(course_path)
    reg["courses"] = [c for c in reg["courses"] if c["id"] != course_id]
    save_registry(reg)
    return {"removed": True}


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
    users = []
    for row in rows:
        user = dict(row)
        user.pop("passwordHash", None)
        users.append(user)
    return users


def register_static_routes(static_dir: Path):
    """Serve built React UI and SPA fallback (register once at startup)."""

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str = ""):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(404)
        if full_path:
            file_path = (static_dir / full_path).resolve()
            if not str(file_path).startswith(str(static_dir.resolve())):
                raise HTTPException(403)
            if file_path.is_file():
                return FileResponse(file_path)
        index = static_dir / "index.html"
        if not index.exists():
            raise HTTPException(503, "UI not built. Run: npm run build")
        return FileResponse(index)


def run():
    ensure_dirs()
    sync_course_registry()
    get_db()
    static_dir = REPO_ROOT / "out" / "renderer"
    if not static_dir.exists():
        static_dir = REPO_ROOT / "dist"
    if static_dir.exists():
        register_static_routes(static_dir)
        print(f"Static UI: {static_dir}")
    else:
        print("WARNING: No built UI found. Run 'npm run build' from repo root, then restart.")
    print("ClassHub server starting at http://localhost:8765")
    print(f"Data root: {DATA_ROOT}")
    print("Stop any other server on port 8765 before starting (npm run serve OR Python, not both).")
    uvicorn.run(app, host="0.0.0.0", port=8765)


if __name__ == "__main__":
    run()
