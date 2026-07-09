# ClassHub API

Base URL: `/api`

## Settings

- `GET /api/settings` — Get app settings
- `PUT /api/settings` — Update settings
- `POST /api/setup` — First-run setup

## Courses

- `GET /api/courses` — List installed courses
- `POST /api/courses/import` — Import zip bundle
- `DELETE /api/courses/:id` — Remove course
- `GET /api/courses/:id/manifest` — Get course.json
- `GET /api/courses/:id/asset?path=` — Get bundle file (base64)

## Progress

- `GET /api/progress/:courseId` — Progress snapshot
- `POST /api/progress/lesson` — Update lesson progress

## Quiz

- `GET /api/quiz/:courseId?path=` — Get quiz (answers stripped)
- `POST /api/quiz/submit` — Submit answers

## Users

- `GET /api/users` — List users
- `POST /api/users` — Create/switch user
- `PUT /api/users/:id` — Update user

## Access

- `GET /api/access/:courseId?targetType=&targetId=` — Check access
- `POST /api/license/activate` — Activate license key

## Notes

- `GET /api/notes/:courseId?lessonId=` — Instructor notes
