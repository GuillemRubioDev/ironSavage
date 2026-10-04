'use client';

import {ProductCard} from "@/features/products/components/product-card";
import {Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,} from "@/components/ui/carousel";
import {FragmentOf} from "@/platform/vendure/graphql";
import {ProductCardFragment} from '@/features/products/graphql';
import {useId} from "react";
import {SectionHeader} from "@/components/brand/section-header";

interface ProductCarouselClientProps {
    title: string;
    /** Palabra del titular en rojo (SectionHeader). */
    highlight?: string;
    /** Enlace "Ver todos" a la derecha del titular. */
    action?: {href: string; label: string};
    products: Array<FragmentOf<typeof ProductCardFragment>>;
}

export function ProductCarousel({title, highlight, action, products}: ProductCarouselClientProps) {
    const id = useId();

    return (
        <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
                <SectionHeader title={title} highlight={highlight} action={action} />
                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-2 py-2 md:-ml-4">
                        {products.map((product, i) => (
                            <CarouselItem key={id + i}
                                          className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                <ProductCard product={product}/>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {/* left-2/right-2 (no el -left-12/-right-12 por defecto del componente base,
                        que queda fuera de la caja del carrusel): esos solo caben en una
                        sección con mucho margen exterior, y este carrusel ocupa el ancho
                        del contenedor. Justo en el punto md (768px, donde aparecen) se
                        salían de la pantalla y provocaban scroll horizontal. */}
                    <CarouselPrevious className="hidden md:flex left-2"/>
                    <CarouselNext className="hidden md:flex right-2"/>
                </Carousel>
            </div>
        </section>
    );
}
