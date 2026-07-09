# ClassHub

Desktop course runtime and package manager for installable Course Bundles.

## Features (MVP)

- Import `.zip` Course Bundles into the bundled `courses/` folder
- **Sync Courses** — rescan `courses/` for manually added course folders
- **Export Course** — save an installed course back to `.zip`
- Course library with filterable cards and progress tracking
- Module → Unit → Lesson navigation with slide-like sections
- Quiz engine, bilingual UI (EN/ES), theme customization
- Login with test account; profile modal for settings
- Demo course: **Crypto 101** (pre-installed in `courses/crypto-101/`)

---

## Run the desktop app (Windows — Electron)

From the repo root:

```bash
npm install --legacy-peer-deps
npm run dev
```

This opens the ClassHub window. Courses live in `courses/` next to the repo. User data (progress, login) in `data/`.

**Demo login:** `demo@classhub.local` / `demo123`

---

## Run in the browser (local server)

Use **one** server only — Python **or** Node — on port **8765**.

### Option A — Python server (Mac / Linux / classroom)

**Requirements:** Python **3.10–3.12** (avoid 3.14 — `pip` may hang)

```bash
# 1. From repo root — build the UI once
npm install --legacy-peer-deps
npm run build

# 2. Install Python dependencies
cd server/python
py -3.12 -m pip install -r requirements.txt

# 3. Start the server (from server/python)
py -3.12 -m classhub_server.main
```

Open **http://localhost:8765**

### Option B — Node server (no Python, Windows-friendly)

```bash
# From repo root — builds UI and starts server
npm install --legacy-peer-deps
npm run serve:full
```

Open **http://localhost:8765**

### If port 8765 is already in use

Stop any other ClassHub server (Ctrl+C), then:

```powershell
netstat -ano | findstr :8765
taskkill /PID <pid> /F
```

### Manually added courses

If you copy a course folder into `courses/` (must contain `course.json`), click **Import Course ▾ → Sync Courses** in the library header.

---

## Build Windows .exe

```bash
npm run build:win
```

Installer output: `release/`

---

## Importing, syncing, and exporting courses

| Action | How |
|--------|-----|
| **Import Course** | Header button — pick a `.zip` bundle |
| **Sync Courses** | Import Course ▾ → rescans `courses/` folder |
| **Export Course** | Import Course ▾ → pick course → save `.zip` |

Works in both the desktop app and browser mode.

---

## Demo license key

`CLASSHUB-DEMO-2026` (for locked course content)

---

## Repository

https://github.com/RuzzBlue/ClassHub
