import logoUrl from './assets/logo_titulo.png';

/**
 * Sustituye el logo de Vendure en la pantalla de login del dashboard con el punto
 * de extensión oficial `login.logo` (@vendure/dashboard, desde la 3.4.0). Discreto
 * a propósito: es la única pantalla con la marca así; el informe de la Fase 16.3
 * explica por qué no se cambió el tema de todo el dashboard.
 */
export function LoginLogo() {
    return <img src={logoUrl} alt="Iron Savage" className="h-10 w-auto object-contain" />;
}
