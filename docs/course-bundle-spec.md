# ClassHub Course Bundle Specification v1.0

## Package Structure

```
MyCourse/
  course.json          # Required — source of truth
  thumbnail.png        # Optional — library card image
  cover.png            # Optional — cover image
  assets/              # Shared assets (CSS, images)
  content/             # Module/unit/lesson content
    m01-module/
      u01-unit/
        l01-lesson/
          lesson.html  # Single renderable lesson with sections
          quiz.json    # Optional structured quiz
          assets/      # Lesson-specific assets
    notes/             # Optional presenter notes: {lessonId}.md
  extras/              # Optional author-shipped extras (glossary, downloads, links)
  lab/                 # Optional — declare in course.json to show Lab in Menu
```

## course.json

The manifest defines metadata, navigation, access rules, extras, and optional lab.
Role menus (instructor/student panels, grades, tickets, etc.) are provided by the ClassHub app — not by course packs.

Presenter notes live under `content/notes/{lessonId}.md` by default (optional `notesRoot` override).

Inspect any installed course's `course.json` after import for a complete example.

### Optional `lab`

When present, ClassHub shows a Lab item in the course Menu for students and instructors.
Define multiple labs, each with its own HTML instructions and a curriculum due point:

```json
"lab": {
  "title": "Laboratorio",
  "icon": "fa-flask",
  "labs": [
    {
      "id": "lab-01-explorer",
      "title": "Blockchain explorer",
      "order": 1,
      "dueAfterLessonId": "l02-blockchain-basics",
      "entry": "lab/lab-01-explorer/lab.html",
      "summary": "Inspect a public transaction.",
      "expectedResult": "Screenshot of a transaction detail page."
    }
  ]
}
```

Students upload evidence locally; instructor review/stats land when cloud sync is available.

### Required fields

- `schemaVersion` — must be `"1.0"`
- `id` — unique course identifier
- `title`, `description`, `author`, `version`
- `navigation.modules[]` — hierarchical content tree

### Lesson HTML format

Each lesson uses a single `lesson.html` with sections acting as slides:

```html
<section data-slide id="s1" data-title="Introduction">...</section>
<section data-slide id="s2" data-title="Content">...</section>
```

### quiz.json format

```json
{
  "id": "quiz-id",
  "title": "Quiz Title",
  "passingScore": 70,
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "prompt": "Question text?",
      "options": ["A", "B", "C"],
      "correct": ["b"],
      "explanation": "Optional explanation"
    }
  ]
}
```

Option letters in `correct` are lowercase a, b, c... matching option index.

## Access Policies

- `free` — available to all users
- `licensed` — requires valid license key
- `instructor` — instructor role only

## Import

Bundles are distributed as `.zip` files. The app validates schema and file references before installing.
