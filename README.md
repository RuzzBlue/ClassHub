# ClassHub

Desktop course runtime and package manager for installable Course Bundles.

## Features

- Import `.zip` Course Bundles into a local `courses/` folder
- **Sync Courses** — rescan `courses/` for manually added course folders
- **Export Course** — save an installed course back to `.zip`
- **Neon PostgreSQL** — cloud user accounts (admin, instructor, learner)
- **Admin Dashboard** — manage groups, license types, users, and course enrollments
- Course library with filterable cards and progress tracking
- Module → Unit → Lesson navigation with slide-like sections
- Quiz engine, bilingual UI (EN/ES), theme customization

---

## Requirements

- **Node.js 20+** (LTS recommended)
- **npm**
- **Neon PostgreSQL** database ([neon.tech](https://neon.tech)) for login and user management

```bash
npm install --legacy-peer-deps
cp .env.example .env
```

Edit `.env` and set your **Neon pooler** connection string:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-PROJECT-pooler.region.aws.neon.tech/neondb?sslmode=require
CLASSHUB_SEED_ADMIN_EMAIL=admin@classhub.local
CLASSHUB_SEED_ADMIN_PASSWORD=changeme
```

On first startup (empty database), ClassHub creates tables and seeds the admin user above.

**First login:** use `CLASSHUB_SEED_ADMIN_EMAIL` / `CLASSHUB_SEED_ADMIN_PASSWORD`

Neon scale-to-zero may add ~1–2 seconds on the first query after idle — normal for small teams.

---

## Windows — desktop app

```bash
npm run dev
```

Opens the ClassHub Electron window. Courses live in `courses/` next to the project. Local progress/settings in `data/`.

### Windows — browser app

```bash
npm run serve:full
```

Open **http://localhost:8765**

---

## macOS / Linux — browser app

```bash
npm run serve:full
```

Open **http://localhost:8765**

---

## Roles

| Role | Access |
|------|--------|
| **Admin** | Library + **Admin Dashboard** (users, groups, licenses, enrollments) |
| **Instructor** | Library + **Instructor Area** (placeholder) |
| **Learner** | Library + **Student Hub** (placeholder) |

Admins see **Instructor Area** and **Student Hub** buttons in Profile → Role for testing.

---

## Build Windows installer (.exe)

```bash
npm run build:win
```

Output: `release/`

---

## Courses folder

The `courses/` directory is **not tracked in git**. Each user keeps their own courses locally.

- Use **Import Course ▾ → Sync Courses** after copying folders into `courses/`.

---

## Port already in use

Only one server can use port **8765**. Stop any running ClassHub server (Ctrl+C), then:

**Windows:** `netstat -ano | findstr :8765` then `taskkill /PID <pid> /F`

**macOS / Linux:** `lsof -i :8765` then `kill <pid>`

---

## Demo license key

`CLASSHUB-DEMO-2026` (for locked course content in course bundles)

---

## Repository

https://github.com/RuzzBlue/ClassHub
