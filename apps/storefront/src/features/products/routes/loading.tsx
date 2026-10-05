import { Skeleton } from '@/components/ui/skeleton';

// Misma estructura que la ficha (page.tsx + ProductDetailClient + ProductGallery):
// migas de pan, columnas 1.15fr/1fr con su hueco y galería cuadrada con miniaturas en
// 5 columnas. Si no coinciden, la imagen cambia de tamaño y el texto de sitio al
// llegar el contenido.
export default function ProductLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Migas de pan */}
            <Skeleton className="mb-6 h-5 w-64" />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
                {/* Columna izquierda: galería */}
                <div className="space-y-3 lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:self-start">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <div className="hidden grid-cols-5 gap-2 lg:grid">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-square w-full rounded-md" />
                        ))}
                    </div>
                </div>

                {/* Columna derecha: esqueleto de la información del producto */}
                <div className="space-y-6">
                    {/* Categoría, nombre y precio */}
                    <div>
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="mt-3 h-10 w-3/4" />
                        <Skeleton className="mt-3 h-8 w-28" />
                    </div>

                    {/* Grupos de opciones */}
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-16" />
                        <div className="flex gap-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-9 w-20 rounded-md" />
                            ))}
                        </div>
                    </div>

                    {/* Estado del stock */}
                    <Skeleton className="h-4 w-20" />

                    {/* Cantidad y añadir al carrito */}
                    <Skeleton className="h-12 w-full" />

                    {/* Descripción */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </div>
        </div>
    );
}
