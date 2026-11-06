import { Languages, LogOut } from 'lucide-react';

import { Button } from '@inventory-u3/ui';
import { ThemeToggle } from '../../features/theme/theme-toggle.js';
import { useSession } from '../../features/auth/session-provider.js';
import { useTranslation } from '../../i18n/index.js';

/**
 * The application header.
 *
 * The signed-in user, the theme toggle, the language switch and sign-out.
 */
export function Header() {
  const { user, signOut } = useSession();
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="flex h-16 items-center justify-between gap-4 border-b bg-background px-6">
      <div className="flex flex-1 items-center" />
      <div className="flex items-center gap-2">
        {user ? (
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <span className="max-w-40 truncate">{user.fullName}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
              {user.role}
            </span>
          </div>
        ) : null}
        <ThemeToggle />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={
            locale === 'es'
              ? t('common.language.switchToEnglish')
              : t('common.language.switchToSpanish')
          }
          onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
        >
          <Languages aria-hidden className="mr-2 h-4 w-4" />
          {locale === 'es' ? 'EN' : 'ES'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('common.header.signOut')}
        </Button>
      </div>
    </div>
  );
}
