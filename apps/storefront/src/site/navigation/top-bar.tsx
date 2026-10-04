import {getRouteLocale} from '@/platform/i18n/server';
import {topBarMessages} from './top-bar-messages';
import type {Locale} from '@/platform/i18n/routing';
import {getTranslations} from 'next-intl/server';
import {Marquee} from '@/components/brand/marquee';

/**
 * Franja de avisos sobre la cabecera, ahora como cinta roja en movimiento (Marquee;
 * quieta con "reducir movimiento"). Server Component. La altura sale de --top-bar-h
 * (globals.css), la única fuente de verdad que también usan la posición de Navbar y
 * el relleno superior de <main>; ver locale-layout.tsx.
 */
export async function TopBar() {
    const locale = (await getRouteLocale()) as Locale;

    if (!topBarMessages.length) return null;
    const t = await getTranslations({locale, namespace: 'Navigation'});

    return (
        <aside className="fixed top-0 left-0 right-0 z-50 print:hidden h-[var(--top-bar-h)] bg-primary-solid">
            <Marquee items={topBarMessages.map(msg => msg.text[locale])} label={t('announcements')} pauseLabel={t('pauseAnnouncements')} />
        </aside>
    );
}
