import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider, useTranslation } from './index.js';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './locale.js';

function Probe() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="title">{t('dashboard.title')}</p>
      <p data-testid="runtime">{t('common.runtime.web')}</p>
      <button type="button" onClick={() => setLocale('en')}>
        English
      </button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe('I18nProvider', () => {
  it('uses Spanish by default', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('locale')).toHaveTextContent(DEFAULT_LOCALE);
    expect(screen.getByTestId('title')).toHaveTextContent('Panel');
    expect(screen.getByTestId('runtime')).toHaveTextContent('Web');
    expect(document.documentElement.lang).toBe('es');
  });

  it('restores a stored language choice', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('title')).toHaveTextContent('Dashboard');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists a language change and updates the document language', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('title')).toHaveTextContent('Dashboard');
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps component tests in English when there is no provider', () => {
    render(<Probe />);

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('title')).toHaveTextContent('Dashboard');
  });
});
