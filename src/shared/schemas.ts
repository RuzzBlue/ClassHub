import { z } from 'zod'

export const AccessPolicySchema = z.enum(['free', 'licensed', 'instructor'])

export const AccessRuleSchema = z.object({
  target: z.string(),
  policy: AccessPolicySchema
})

export const AccessConfigSchema = z.object({
  defaultPolicy: AccessPolicySchema.default('free'),
  licenseRequired: z.boolean().default(false),
  rules: z.array(AccessRuleSchema).default([])
})

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  entry: z.string(),
  quiz: z.string().nullable().optional(),
  access: AccessPolicySchema.default('free'),
  estimatedMinutes: z.number().optional()
})

export const UnitSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  lessons: z.array(LessonSchema),
  quiz: z.string().nullable().optional(),
  access: AccessPolicySchema.optional()
})

export const ModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  units: z.array(UnitSchema),
  quiz: z.string().nullable().optional(),
  access: AccessPolicySchema.optional()
})

export const NavigationSchema = z.object({
  modules: z.array(ModuleSchema)
})

export const ExtraSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['html', 'files', 'links']),
  entry: z.string(),
  icon: z.string().default('fa-puzzle-piece'),
  roles: z.array(z.enum(['learner', 'instructor'])),
  order: z.number()
})

export const InstructorConfigSchema = z.object({
  notesRoot: z.string().optional()
})

export const LabItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  /** Curriculum lesson after which this lab is intended. */
  dueAfterLessonId: z.string(),
  /** HTML instructions for this lab. */
  entry: z.string(),
  /** Short list blurb. */
  summary: z.string().optional(),
  /** What success looks like (shown in the app Lab panel). */
  expectedResult: z.string().optional()
})

/** Optional hands-on practice area outside Overview slides/quizzes. */
export const LabConfigSchema = z.object({
  title: z.string().optional(),
  icon: z.string().default('fa-flask'),
  labs: z.array(LabItemSchema).default([])
})

export const CourseManifestSchema = z.object({
  schemaVersion: z.string(),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  author: z.string(),
  version: z.string(),
  language: z.string().default('es'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimatedHours: z.number().optional(),
  thumbnail: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).default([]),
  roles: z.array(z.enum(['learner', 'instructor'])).default(['learner', 'instructor']),
  access: AccessConfigSchema.default({}),
  navigation: NavigationSchema,
  extras: z.array(ExtraSchema).default([]),
  instructor: InstructorConfigSchema.optional(),
  lab: LabConfigSchema.optional(),
  demoLicenseKey: z.string().optional()
})

export type CourseManifest = z.infer<typeof CourseManifestSchema>
export type Module = z.infer<typeof ModuleSchema>
export type Unit = z.infer<typeof UnitSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type Extra = z.infer<typeof ExtraSchema>
export type LabItem = z.infer<typeof LabItemSchema>
export type LabConfig = z.infer<typeof LabConfigSchema>
export type AccessPolicy = z.infer<typeof AccessPolicySchema>

export const QuizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['single', 'multiple']),
  prompt: z.string(),
  options: z.array(z.string()),
  correct: z.array(z.string()),
  explanation: z.string().optional()
})

export const QuizSchema = z.object({
  id: z.string(),
  title: z.string(),
  passingScore: z.number().default(70),
  questions: z.array(QuizQuestionSchema)
})

export type Quiz = z.infer<typeof QuizSchema>
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

export function validateCourseManifest(data: unknown): CourseManifest {
  return CourseManifestSchema.parse(data)
}

export function validateQuiz(data: unknown): Quiz {
  return QuizSchema.parse(data)
}

export function collectAllIds(manifest: CourseManifest): string[] {
  const ids: string[] = [manifest.id]
  for (const mod of manifest.navigation.modules) {
    ids.push(mod.id)
    for (const unit of mod.units) {
      ids.push(unit.id)
      for (const lesson of unit.lessons) {
        ids.push(lesson.id)
      }
    }
  }
  return ids
}

export function countLessons(manifest: CourseManifest): number {
  return manifest.navigation.modules.reduce(
    (acc, m) => acc + m.units.reduce((uacc, u) => uacc + u.lessons.length, 0),
    0
  )
}

export function countModules(manifest: CourseManifest): number {
  return manifest.navigation.modules.length
}

export function findLesson(
  manifest: CourseManifest,
  lessonId: string
): { lesson: Lesson; module: Module; unit: Unit } | null {
  for (const mod of manifest.navigation.modules) {
    for (const unit of mod.units) {
      const lesson = unit.lessons.find((l) => l.id === lessonId)
      if (lesson) return { lesson, module: mod, unit }
    }
  }
  return null
}

export function countQuizzes(manifest: CourseManifest): number {
  let count = 0
  for (const mod of manifest.navigation.modules) {
    if (mod.quiz) count++
    for (const unit of mod.units) {
      if (unit.quiz) count++
      for (const lesson of unit.lessons) {
        if (lesson.quiz) count++
      }
    }
  }
  return count
}

export function getOrderedLessons(manifest: CourseManifest): Lesson[] {
  const lessons: Lesson[] = []
  const sortedModules = [...manifest.navigation.modules].sort((a, b) => a.order - b.order)
  for (const mod of sortedModules) {
    const sortedUnits = [...mod.units].sort((a, b) => a.order - b.order)
    for (const unit of sortedUnits) {
      const sortedLessons = [...unit.lessons].sort((a, b) => a.order - b.order)
      lessons.push(...sortedLessons)
    }
  }
  return lessons
}
