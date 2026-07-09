# ClassHub

Desktop course runtime and package manager for installable Course Bundles.

## Features (MVP)

- Import `.zip` Course Bundles directly into the bundled `courses/` folder
- Course library with filterable cards and progress tracking
- Module → Unit → Lesson navigation with slide-like sections
- Quiz engine, bilingual UI (EN/ES), theme customization
- Login with test account; profile modal for settings
- Demo course: **Crypto 101** (pre-installed in `courses/crypto-101/`)

## Quick Start (Windows — Electron)

```bash
npm install --legacy-peer-deps
npm run dev
```

Courses live in `courses/` next to the app. User data (progress, login) in `data/`.

**Demo login:** `demo@classhub.local` / `demo123`

## Build Windows .exe

```bash
npm run build:win
```

Installer output: `release/`

## Mac / Linux / Classroom (Python server)

Clone the repo — courses are in `courses/` at the project root:

```bash
cd server/python
pip install -e .
classhub-server
```

Open http://localhost:8765

## Importing courses

Use **Import Bundle** in the header to select a `.zip` file. It extracts into `courses/<course-id>/`.

## Demo license key

`CLASSHUB-DEMO-2026` (for locked course content)

## Repository

https://github.com/RuzzBlue/ClassHub
