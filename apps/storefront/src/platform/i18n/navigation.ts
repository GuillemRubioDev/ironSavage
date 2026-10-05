import {type ComponentProps, createElement, useMemo} from 'react';
import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

const navigation = createNavigation(routing);

export const {redirect, usePathname, getPathname} = navigation;

/**
 * Tipo de transición de React que llevan los cambios de página. El fundido entre
 * páginas (ViewTransition del layout, ver site/locale-layout.tsx) solo se anima con
 * este tipo: así no se funde la página entera cuando un Suspense muestra su contenido
 * o cuando router.refresh() actualiza datos (carrito, direcciones, volver a la
 * pestaña), y los fundidos no se encadenan uno detrás de otro.
 */
export const PAGE_TRANSITION = ['navegacion'];

/** Link de next-intl que, por defecto, anima el cambio de página (PAGE_TRANSITION). */
export function Link(props: ComponentProps<typeof navigation.Link>) {
    return createElement(navigation.Link, {transitionTypes: PAGE_TRANSITION, ...props});
}

/**
 * useRouter de next-intl: push() a otra página anima el cambio como un Link. Un push
 * a la misma página (filtros y orden del buscador, que solo cambian la query),
 * replace() y refresh() no: actualizan la página en la que ya se está.
 */
export function useRouter() {
    const router = navigation.useRouter();
    const pathname = navigation.usePathname();
    return useMemo(() => ({
        ...router,
        push: (...[href, options]: Parameters<typeof router.push>) => {
            const target = typeof href === 'string' ? href.split(/[?#]/)[0] : href.pathname;
            const changesPage = Boolean(target) && target !== pathname;
            router.push(href, changesPage ? {transitionTypes: PAGE_TRANSITION, ...options} : options);
        },
    }), [router, pathname]);
}
