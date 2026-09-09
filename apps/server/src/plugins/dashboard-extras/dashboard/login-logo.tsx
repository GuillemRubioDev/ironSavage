import logoUrl from './assets/logo_titulo.png';

/**
 * Replaces the default Vendure logo on the Dashboard login screen via the
 * official `login.logo` extension point (@vendure/dashboard, since 3.4.0).
 * Discreet by design — this is the only screen branded this way; see the
 * Fase 16.3 report for why a sitewide re-theme wasn't attempted.
 */
export function LoginLogo() {
    return <img src={logoUrl} alt="Iron Savage" className="h-10 w-auto object-contain" />;
}
