'use client';

import {useEffect, useState} from 'react';
import {useAutoRecovery} from './use-auto-recovery';

const TEXTS = {
    es: {
        title: 'Algo ha fallado',
        message: 'No hemos podido cargar la tienda. Suele ser un problema puntual.',
        redirecting: (s: number) => `Te llevamos al inicio en ${s} s…`,
        reloading: (s: number) => `Volvemos a intentarlo en ${s} s…`,
        goHome: 'Ir al inicio',
        stay: 'Quedarme aquí',
    },
    en: {
        title: 'Something went wrong',
        message: "We couldn't load the shop. It's usually a temporary problem.",
        redirecting: (s: number) => `Taking you to the home page in ${s} s…`,
        reloading: (s: number) => `Trying again in ${s} s…`,
        goHome: 'Go to home page',
        stay: 'Stay here',
    },
};

/**
 * Error global (global-error.tsx): solo aparece si falla el propio layout raíz, así
 * que sustituye a toda la página. No hay traducciones, tema ni estilos del layout
 * disponibles: lleva su propio <html>, estilos en línea y el idioma deducido de la
 * URL. Misma recuperación automática que la página de error normal.
 */
export default function GlobalErrorPage({error}: {error: Error & {digest?: string}}) {
    const [lang, setLang] = useState<'es' | 'en'>('es');
    const homeHref = lang === 'en' ? '/en' : '/';
    const {mode, seconds, cancel} = useAutoRecovery({homeHref, seconds: 6});
    const t = TEXTS[lang];

    useEffect(() => {
        console.error(error);
        if (/^\/en(\/|$)/.test(window.location.pathname)) setLang('en');
    }, [error]);

    const button: React.CSSProperties = {
        padding: '12px 20px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', border: '1px solid #e7000b',
    };

    return (
        <html lang={lang}>
            <body style={{margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#0b0b0c', color: '#ffffff'}}>
                <main role="alert" style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'}}>
                    <div style={{maxWidth: 440}}>
                        <p style={{fontSize: 14, letterSpacing: 4, color: '#e7000b', fontWeight: 700, margin: 0}}>IRON SAVAGE</p>
                        <h1 style={{fontSize: 30, margin: '16px 0 8px'}}>{t.title}</h1>
                        <p style={{color: '#b5b5b5', lineHeight: 1.5, margin: 0}}>{t.message}</p>
                        {mode !== 'none' && (
                            <p aria-live="polite" style={{marginTop: 16, fontWeight: 600}}>
                                {mode === 'redirect' ? t.redirecting(seconds) : t.reloading(seconds)}
                            </p>
                        )}
                        <div style={{display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28}}>
                            <button type="button" onClick={() => window.location.assign(homeHref)} style={{...button, background: '#e7000b', color: '#ffffff'}}>
                                {t.goHome}
                            </button>
                            {mode !== 'none' && (
                                <button type="button" onClick={cancel} style={{...button, background: 'transparent', color: '#ffffff', borderColor: '#555'}}>
                                    {t.stay}
                                </button>
                            )}
                        </div>
                        {error.digest && <p style={{marginTop: 24, fontSize: 12, color: '#777'}}>Ref: {error.digest}</p>}
                    </div>
                </main>
            </body>
        </html>
    );
}
