import { createFileRoute, Link } from '@tanstack/react-router';
import { Boxes, Settings2, Users } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@inventory-u3/ui';

import { useTranslation } from '../i18n/index.js';

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('dashboard.description')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes aria-hidden className="size-5" />
              {t('dashboard.cards.inventory.title')}
            </CardTitle>
            <CardDescription>{t('dashboard.cards.inventory.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/inventory">{t('dashboard.cards.inventory.action')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users aria-hidden className="size-5" />
              {t('dashboard.cards.team.title')}
            </CardTitle>
            <CardDescription>{t('dashboard.cards.team.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('dashboard.cards.team.note')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 aria-hidden className="size-5" />
              {t('dashboard.cards.settings.title')}
            </CardTitle>
            <CardDescription>{t('dashboard.cards.settings.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">{t('dashboard.cards.settings.action')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
