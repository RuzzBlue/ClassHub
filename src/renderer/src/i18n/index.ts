import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      app: { name: 'ClassHub', tagline: 'Your learning hub' },
      nav: { library: 'Library', settings: 'Settings', import: 'Import Bundle', help: 'Help' },
      library: {
        title: 'Course Library',
        search: 'Search courses...',
        filter: 'Filter',
        noCourses: 'No courses installed yet.',
        importFirst: 'Import a course bundle or install the demo course.',
        open: 'Open Course',
        remove: 'Remove',
        modules: 'modules',
        lessons: 'lessons',
        hours: 'hours',
        progress: 'Progress',
        free: 'Free',
        licensed: 'Licensed',
        flip: 'More info'
      },
      setup: {
        title: 'Welcome to ClassHub',
        subtitle: 'Choose where to store your courses and progress.',
        dataRoot: 'ClassHub data folder',
        coursesPath: 'Courses install folder',
        browse: 'Browse...',
        installDemo: 'Install demo course (Crypto 101)',
        continue: 'Get Started'
      },
      settings: {
        title: 'Settings',
        profile: 'Profile',
        appSettings: 'App Settings',
        displayName: 'Display name',
        role: 'Role',
        learner: 'Learner',
        instructor: 'Instructor',
        language: 'Language',
        theme: 'Theme',
        accentColor: 'Accent color',
        darkMode: 'Dark mode',
        lightMode: 'Light mode',
        sounds: 'Sound effects',
        save: 'Save',
        saved: 'Settings saved',
        license: 'Licensing',
        activate: 'Activate',
        comingSoon: 'Coming soon'
      },
      auth: {
        login: 'Log In',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        email: 'Email',
        password: 'Password',
        newPassword: 'New password',
        confirmPassword: 'Confirm password',
        leaveBlank: 'Leave blank to keep current',
        invalidCredentials: 'Invalid email or password',
        passwordMismatch: 'Passwords do not match',
        demoHint: 'Demo: demo@classhub.local / demo123'
      },
      course: {
        dashboard: 'Dashboard',
        overview: 'Overview',
        extras: 'Extras',
        presenter: 'Presenter Mode',
        back: 'Back to Library',
        locked: 'Locked',
        completed: 'Completed',
        inProgress: 'In Progress',
        notStarted: 'Not Started',
        quiz: 'Quiz',
        prevSection: 'Previous',
        nextSection: 'Next',
        prevLesson: 'Previous Lesson',
        nextLesson: 'Next Lesson',
        takeQuiz: 'Take Quiz',
        submitQuiz: 'Submit Quiz',
        quizPassed: 'Quiz passed!',
        quizFailed: 'Quiz not passed. Try again.',
        enterLicense: 'This content requires a license.',
        licensePlaceholder: 'Enter license key'
      },
      presenter: {
        title: 'Presenter Mode',
        currentSlide: 'Current Slide',
        nextSlide: 'Next Slide',
        notes: 'Instructor Notes',
        followMode: 'Follow Mode (coming soon)'
      },
      levels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
    }
  },
  es: {
    translation: {
      app: { name: 'ClassHub', tagline: 'Tu centro de aprendizaje' },
      nav: { library: 'Biblioteca', settings: 'Configuración', import: 'Importar Paquete', help: 'Ayuda' },
      library: {
        title: 'Biblioteca de Cursos',
        search: 'Buscar cursos...',
        filter: 'Filtrar',
        noCourses: 'No hay cursos instalados.',
        importFirst: 'Importa un paquete de curso o instala el curso demo.',
        open: 'Abrir Curso',
        remove: 'Eliminar',
        modules: 'módulos',
        lessons: 'lecciones',
        hours: 'horas',
        progress: 'Progreso',
        free: 'Gratis',
        licensed: 'Con licencia',
        flip: 'Más info'
      },
      setup: {
        title: 'Bienvenido a ClassHub',
        subtitle: 'Elige dónde guardar tus cursos y progreso.',
        dataRoot: 'Carpeta de datos de ClassHub',
        coursesPath: 'Carpeta de instalación de cursos',
        browse: 'Explorar...',
        installDemo: 'Instalar curso demo (Crypto 101)',
        continue: 'Comenzar'
      },
      settings: {
        title: 'Configuración',
        profile: 'Perfil',
        appSettings: 'Ajustes de la app',
        displayName: 'Nombre',
        role: 'Rol',
        learner: 'Estudiante',
        instructor: 'Instructor',
        language: 'Idioma',
        theme: 'Tema',
        accentColor: 'Color de acento',
        darkMode: 'Modo oscuro',
        lightMode: 'Modo claro',
        sounds: 'Efectos de sonido',
        save: 'Guardar',
        saved: 'Configuración guardada',
        license: 'Licencias',
        activate: 'Activar',
        comingSoon: 'Próximamente'
      },
      auth: {
        login: 'Iniciar sesión',
        signIn: 'Entrar',
        signOut: 'Cerrar sesión',
        email: 'Correo',
        password: 'Contraseña',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar contraseña',
        leaveBlank: 'Dejar vacío para mantener la actual',
        invalidCredentials: 'Correo o contraseña incorrectos',
        passwordMismatch: 'Las contraseñas no coinciden',
        demoHint: 'Demo: demo@classhub.local / demo123'
      },
      course: {
        dashboard: 'Panel',
        overview: 'Resumen',
        extras: 'Extras',
        presenter: 'Modo Presentador',
        back: 'Volver a Biblioteca',
        locked: 'Bloqueado',
        completed: 'Completado',
        inProgress: 'En progreso',
        notStarted: 'Sin iniciar',
        quiz: 'Cuestionario',
        prevSection: 'Anterior',
        nextSection: 'Siguiente',
        prevLesson: 'Lección anterior',
        nextLesson: 'Siguiente lección',
        takeQuiz: 'Hacer cuestionario',
        submitQuiz: 'Enviar',
        quizPassed: '¡Cuestionario aprobado!',
        quizFailed: 'No aprobado. Intenta de nuevo.',
        enterLicense: 'Este contenido requiere licencia.',
        licensePlaceholder: 'Ingresa la clave de licencia'
      },
      presenter: {
        title: 'Modo Presentador',
        currentSlide: 'Diapositiva actual',
        nextSlide: 'Siguiente diapositiva',
        notes: 'Notas del instructor',
        followMode: 'Modo seguimiento (próximamente)'
      },
      levels: { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' }
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
