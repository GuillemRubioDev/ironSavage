import {getRouteLocale} from '@/platform/i18n/server';
import {topBarMessages} from './top-bar-messages';
import type {Locale} from '@/platform/i18n/routing';

/**
 * Static (no JS/rotation) announcement strip above the header — a Server
 * Component, zero client-side cost. Height comes from --top-bar-h
 * (globals.css), the single source of truth also used by Navbar's
 * position and <main>'s top padding — see locale-layout.tsx.
 */
export async function TopBar() {
    const locale = (await getRouteLocale()) as Locale;

    if (!topBarMessages.length) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-[var(--top-bar-h)] bg-[oklch(0.13_0.004_260)]">
            <div className="container mx-auto h-full px-4 flex items-center justify-center">
                {/* All messages on md+, just the first on mobile — no JS rotation needed. */}
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
        </div>
    );
}
