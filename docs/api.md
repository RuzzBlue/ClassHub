# ClassHub API

Base URL: `/api`

## Auth (Neon PostgreSQL)

- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me` — Current user

## Admin (requires admin role)

- `GET/POST/PUT/DELETE /api/admin/groups`
- `GET/POST/PUT/DELETE /api/admin/license-types`
- `GET /api/admin/users?role=admin|instructor|learner&groupId=` — List users
- `POST /api/admin/users` — Create user
- `PUT/DELETE /api/admin/users/:id`
- `GET/POST/DELETE /api/admin/enrollments` — Course ↔ instructor ↔ learner links

## Settings

- `GET /api/settings` — Get app settings
- `PUT /api/settings` — Update settings

## Courses

- `GET /api/courses` — List installed courses (auto-syncs `courses/` folder)
- `POST /api/courses/sync` — Rescan `courses/` and refresh registry
- `POST /api/courses/import` — Import zip bundle (`zipPath` or base64 `content`)
- `POST /api/courses/:id/export` — Export course to zip
- `DELETE /api/courses/:id` — Remove course
- `GET /api/courses/:id/manifest` — Get course.json
- `GET /api/courses/:id/asset?path=` — Get bundle file (base64)

## Progress

- `GET /api/progress/:courseId` — Progress snapshot
- `POST /api/progress/lesson` — Update lesson progress

## Quiz

- `GET /api/quiz/:courseId?path=` — Get quiz (answers stripped)
- `POST /api/quiz/submit` — Submit answers

## Users (self-service profile)

- `PUT /api/users/:id` — Update own profile (display name, email, password)

## Access

- `GET /api/access/:courseId?targetType=&targetId=` — Check access
- `POST /api/license/activate` — Activate license key

## Notes

- `GET /api/notes/:courseId?lessonId=` — Instructor notes
