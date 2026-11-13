/**
 * Strings shared by every screen. A key lives here only when more than one
 * feature renders it; feature-specific copy belongs to that feature's catalogue.
 */
export const common = {
  'common.nav.dashboard': 'Dashboard',
  'common.nav.inventory': 'Inventory',
  'common.nav.products': 'Products',
  'common.nav.settings': 'Settings',
  'common.nav.primary': 'Primary',
  'common.shell.workspace': 'Inventory workspace',
  'common.shell.organizationManagement': 'Organization management',
  'common.shell.collapseSidebar': 'Collapse sidebar',
  'common.shell.expandSidebar': 'Expand sidebar',
  'common.shell.foundationBody':
    'The application foundation is in place. Inventory features arrive in later milestones; no business logic runs in this shell.',
  'common.shell.footer': 'Inventory U3 · Milestone 2 · application shell',
  'common.header.signOut': 'Sign out',
  'common.language.label': 'Language',
  'common.language.switchToSpanish': 'Switch to Spanish',
  'common.language.switchToEnglish': 'Switch to English',
  'common.language.english': 'English',
  'common.language.spanish': 'Español',
  'common.unavailable': 'Unavailable',
  'common.loading': 'Loading…',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.notProvided': '—',
  'common.runtime.desktop': 'Desktop',
  'common.runtime.web': 'Web',
  'common.theme.toggle': 'Toggle theme',
  'common.error.title': 'Something went wrong',
  'common.error.fallback': 'An unexpected error occurred',
  'common.error.retry': 'Try again',
  'common.notFound.title': '404',
  'common.notFound.description': 'Page not found',
} as const;
