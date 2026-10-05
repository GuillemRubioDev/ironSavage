import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';

/**
 * Carga de los listados (productos, categoría, búsqueda) con la misma estructura que la
 * página final: franja oscura de ListingHeader/BrandBand (migas, título, nº de
 * productos) y, debajo, filtros + rejilla con el contenedor de CatalogResults. Así, al
 * llegar el contenido, nada cambia de sitio ni de ancho; antes era una rejilla a todo
 * el ancho sin franja ni filtros y la página entera saltaba.
 */
export function ListingSkeleton({count = true}: {count?: boolean}) {
    return (
        <>
            <ListingHeaderSkeleton count={count} />
            <CatalogResultsSkeleton />
        </>
    );
}

/** La franja de ListingHeader (BrandBand) con su misma altura; `count` si la página muestra el nº de productos. */
export function ListingHeaderSkeleton({count = true}: {count?: boolean}) {
    return (
        <section className="bg-brand" aria-hidden="true">
            <div className="container mx-auto animate-pulse px-4 py-8 md:py-10">
                <div className="h-4 w-40 rounded bg-white/10" />
                {/* Alto de una línea del h1 de BrandBand (text-5xl / md:text-6xl, interlineado .92). */}
                <div className="mt-2 h-11 w-72 max-w-full rounded bg-white/10 md:h-14 md:w-96" />
                {count && <div className="mt-2 h-5 w-24 rounded bg-white/10" />}
            </div>
        </section>
    );
}

/** Filtros + rejilla con el mismo contenedor y columnas que CatalogResults. */
export function CatalogResultsSkeleton() {
    return (
        <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-4 lg:gap-8">
            <aside className="lg:col-span-1">
                <div className="h-11 animate-pulse rounded-lg bg-muted lg:h-64" />
            </aside>
            <div className="lg:col-span-3">
                <ProductGridSkeleton />
            </div>
        </div>
    );
}
