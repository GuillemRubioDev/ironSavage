import {getRouteLocale} from '@/platform/i18n/server';
import {topBarMessages} from './top-bar-messages';
import type {Locale} from '@/platform/i18n/routing';
import {getTranslations} from 'next-intl/server';

/**
 * Franja de avisos estática (sin JS ni rotación) sobre la cabecera: un Server
 * Component, sin coste en el navegador. La altura sale de --top-bar-h (globals.css),
 * la única fuente de verdad que también usan la posición de Navbar y el relleno
 * superior de <main>; ver locale-layout.tsx.
 */
export async function TopBar() {
    const locale = (await getRouteLocale()) as Locale;

    if (!topBarMessages.length) return null;
    const t = await getTranslations({locale, namespace: 'Navigation'});

    return (
        <aside aria-label={t('announcements')} className="fixed top-0 left-0 right-0 z-50 print:hidden h-[var(--top-bar-h)] bg-[oklch(0.13_0.004_260)]">
            <div className="container mx-auto h-full px-4 flex items-center justify-center">
                {/* Todos los mensajes a partir de md, solo el primero en móvil: sin rotación por JS. */}
                <div className="hidden md:flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-white/70">
                    {topBarMessages.map((msg, i) => (
                        <span key={msg.id} className="flex items-center gap-3">
                            {i > 0 && <span className="text-primary" aria-hidden="true">/</span>}
                            {msg.text[locale]}
                        </span>
                    ))}
                </div>
                <div className="md:hidden text-[11px] font-medium uppercase tracking-wide text-white/70">
                    {topBarMessages[0].text[locale]}
                </div>
            </div>
        </aside>
    );
}
