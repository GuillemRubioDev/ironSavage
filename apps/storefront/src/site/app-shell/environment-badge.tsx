type BadgeEnvironment = 'local' | 'develop';

/**
 * Entorno en el que se está viendo la tienda, para no confundir local, desarrollo
 * y producción:
 *   - `npm run dev` en el equipo de cada persona → "local".
 *   - Build del servidor de desarrollo → "develop". NEXT_PUBLIC_DEPLOY_ENV lo pasa
 *     el Dockerfile desde DEPLOY_ENV del .env.prod (ver docker-compose.prod.yml).
 *   - Producción, o cualquier otro caso → sin indicador.
 * Se resuelve al compilar: cambiar DEPLOY_ENV exige recompilar el storefront.
 */
function currentEnvironment(): BadgeEnvironment | null {
    if (process.env.NODE_ENV === 'development') {
        return 'local';
    }
    if (process.env.NEXT_PUBLIC_DEPLOY_ENV === 'development') {
        return 'develop';
    }
    return null;
}

const STYLES: Record<BadgeEnvironment, {label: string; className: string}> = {
    local: {label: 'Local', className: 'bg-green-300/60 text-green-950'},
    develop: {label: 'Develop', className: 'bg-rose-400/60 text-rose-950'},
};

/**
 * Triángulo semitransparente en la esquina superior izquierda con el nombre del
 * entorno. Queda por encima de todo pero no recibe clics (pointer-events-none), no
 * lo leen los lectores de pantalla y no sale al imprimir.
 * vt-environment-badge (globals.css): en los cambios de página es su propio grupo de
 * transición, quieto y encima de todo. Sin él formaba parte de la captura de fondo,
 * que se pinta debajo de la cabecera, y desaparecía a medias en cada navegación.
 */
export function EnvironmentBadge() {
    const environment = currentEnvironment();
    if (!environment) {
        return null;
    }
    const {label, className} = STYLES[environment];

    return (
        <div
            aria-hidden="true"
            data-environment={environment}
            className={`vt-environment-badge pointer-events-none fixed top-0 left-0 z-[100] size-20 select-none print:hidden [clip-path:polygon(0_0,100%_0,0_100%)] ${className}`}
        >
            {/* Centrado sobre una línea paralela a la diagonal, a ~22px de la esquina. */}
            <span className="absolute top-[15px] -left-7 w-[100px] -rotate-45 text-center font-display text-[9px] font-bold uppercase leading-[14px] tracking-wider">
                {label}
            </span>
        </div>
    );
}
