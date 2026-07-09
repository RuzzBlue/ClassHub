# ClassHub

Desktop course runtime and package manager for installable Course Bundles.

## Features

- Import `.zip` Course Bundles into a local `courses/` folder
- **Sync Courses** — rescan `courses/` for manually added course folders
- **Export Course** — save an installed course back to `.zip`
- Course library with filterable cards and progress tracking
- Module → Unit → Lesson navigation with slide-like sections
- Quiz engine, bilingual UI (EN/ES), theme customization
- Login with test account; profile modal for settings

---

## Requirements

- **Node.js 20+** (LTS recommended)
- **npm**

Clone the repo, then from the project root:

```bash
npm install --legacy-peer-deps
```

**Demo login:** `demo@classhub.local` / `demo123`

---

## Windows — desktop app

```bash
npm run dev
```

Opens the ClassHub Electron window. Courses live in `courses/` next to the project. User data (progress, settings, login) in `data/`.

### Windows — browser app (same machine)

```bash
npm run serve:full
```

Open **http://localhost:8765**

Use this to test the Mac/Linux workflow on Windows, or if you prefer running in a browser.

---

## macOS / Linux — browser app

ClassHub runs as a local web server. There is no separate desktop build for these platforms yet.

```bash
npm run serve:full
```

Open **http://localhost:8765**

The server uses the same backend as the Windows desktop app. Courses go in `courses/`; progress and settings in `data/`.

---

## Build Windows installer (.exe)

```bash
npm run build:win
```

Output: `release/`

Installed courses are not bundled — add them via **Import Course** or copy folders into `courses/` and **Sync Courses**.

---

## Courses folder

The `courses/` directory is **not tracked in git**. Each user keeps their own courses locally.

- On first run, ClassHub creates `courses/` automatically if it does not exist.
- Each course is a folder with a `course.json` at its root (e.g. `courses/my-course/course.json`).
- If you copy course folders manually, use **Import Course ▾ → Sync Courses** in the library.

| Action | How |
|--------|-----|
| **Import Course** | Header button — pick a `.zip` bundle |
| **Sync Courses** | Import Course ▾ → rescan `courses/` |
| **Export Course** | Import Course ▾ → pick course → save `.zip` |

---

## Port already in use

Only one server can use port **8765**. Stop any running ClassHub server (Ctrl+C), then:

**Windows:**

```powershell
netstat -ano | findstr :8765
taskkill /PID <pid> /F
```

**macOS / Linux:**

```bash
lsof -i :8765
kill <pid>
```

---

## Demo license key

`CLASSHUB-DEMO-2026` (for locked course content)

---

## Repository

https://github.com/RuzzBlue/ClassHub
