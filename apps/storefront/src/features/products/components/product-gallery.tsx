'use client';

import {useRef, useState, type MouseEvent} from 'react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';

type GalleryImage = {id: string; preview: string};

/**
 * Ancho real de la foto: todo el ancho en móvil y tablet; en escritorio, la columna
 * izquierda de la ficha (1.15fr de un container de 1280/1536 px), unos 640/780 px.
 * Ajustado al hueco para que la imagen LCP no pese de más.
 */
const SIZES = '(max-width: 1023px) 100vw, (max-width: 1535px) 640px, 780px';
/** Con el zoom (scale 2) la foto ocupa el doble: se pide una versión del doble de ancho. */
const ZOOM_SIZES = '(max-width: 1023px) 100vw, (max-width: 1535px) 1280px, 1560px';

/**
 * Galería de la ficha con un único juego de imágenes (no se descargan dos):
 * - móvil: carrusel deslizable con puntos;
 * - escritorio: la misma tira sin barra de desplazamiento, con miniaturas y zoom que
 *   sigue al ratón (solo con puntero que permite pasar por encima).
 * Sin fotos, el nombre del producto en grande.
 */
export function ProductGallery({images, productName}: {images: GalleryImage[]; productName: string}) {
    const t = useTranslations('Product');
    const [current, setCurrent] = useState(0);
    const [zoom, setZoom] = useState<{x: number; y: number} | null>(null);
    // Fotos en las que ya se ha hecho zoom: desde entonces se piden en alta resolución.
    const [zoomed, setZoomed] = useState<ReadonlySet<number>>(() => new Set());
    const trackRef = useRef<HTMLDivElement>(null);
    // Mientras dura un desplazamiento lanzado por goTo, onScroll no toca el índice: si no,
    // al saltar de la foto 1 a la 5 el resaltado pasaría por las intermedias.
    const programmaticScroll = useRef(false);

    if (!images.length) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-lg bg-muted p-8 text-center">
                <span className="font-display text-5xl font-black uppercase italic leading-none text-foreground/15">{productName}</span>
            </div>
        );
    }

    const goTo = (index: number) => {
        // Ir a la foto actual no desplaza nada (no llegaría scrollend y quedaría bloqueado).
        if (index === current) return;
        setCurrent(index);
        const track = trackRef.current;
        if (!track) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        programmaticScroll.current = true;
        const release = () => { programmaticScroll.current = false; };
        if ('onscrollend' in track) track.addEventListener('scrollend', release, {once: true});
        else window.setTimeout(release, 600);
        track.scrollTo({left: index * track.clientWidth, behavior: reduced ? 'auto' : 'smooth'});
    };

    const onScroll = () => {
        if (programmaticScroll.current) return;
        const track = trackRef.current;
        if (track) setCurrent(Math.round(track.scrollLeft / track.clientWidth));
    };

    const onMove = (event: MouseEvent<HTMLDivElement>) => {
        if (!window.matchMedia('(hover: hover)').matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setZoom({x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100});
        if (!zoomed.has(current)) setZoomed(new Set(zoomed).add(current));
    };

    return (
        <div className="space-y-3">
            <div
                ref={trackRef}
                role="region"
                aria-roledescription={t('galleryRole')}
                tabIndex={0}
                aria-label={t('gallery')}
                onScroll={onScroll}
                onMouseMove={onMove}
                onMouseLeave={() => setZoom(null)}
                className="flex snap-x snap-mandatory overflow-x-auto rounded-lg bg-muted scrollbar-none lg:cursor-zoom-in lg:overflow-hidden"
            >
                {images.map((image, index) => (
                    <div key={image.id} className="relative aspect-square w-full shrink-0 snap-center overflow-hidden">
                        <Image
                            src={image.preview}
                            alt={t('imageAlt', {name: productName, index: index + 1, total: images.length})}
                            fill
                            priority={index === 0}
                            // Al cambiar sizes, el navegador elige del srcset una versión más
                            // grande y la cambia en cuanto llega; mientras, se ve la actual.
                            // Una vez hecho zoom, esa foto se queda con la versión grande
                            // (ya descargada), así no vuelve a pedirse al salir y entrar.
                            sizes={zoomed.has(index) ? ZOOM_SIZES : SIZES}
                            className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
                            style={zoom && index === current ? {transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%`} : undefined}
                        />
                    </div>
                ))}
            </div>

            {images.length > 1 && (
                <>
                    {/* Móvil: puntos. */}
                    <div className="flex justify-center gap-1.5 lg:hidden">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => goTo(index)}
                                aria-label={t('showImage', {index: index + 1, total: images.length})}
                                aria-current={index === current ? 'true' : undefined}
                                // Zona táctil de 24 px (WCAG 2.5.8) con el punto visual dentro.
                                className="grid size-6 place-items-center"
                            >
                                <span className={cn('h-1.5 rounded-full transition-all', index === current ? 'w-6 bg-primary-solid' : 'w-1.5 bg-foreground/25')} />
                            </button>
                        ))}
                    </div>
                    {/* Escritorio: miniaturas. */}
                    <div className="hidden grid-cols-5 gap-2 lg:grid">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => goTo(index)}
                                aria-label={t('showImage', {index: index + 1, total: images.length})}
                                aria-current={index === current ? 'true' : undefined}
                                className={cn(
                                    'relative aspect-square overflow-hidden rounded-md border-2 transition-colors',
                                    index === current ? 'border-primary-solid' : 'border-transparent opacity-70 hover:opacity-100',
                                )}
                            >
                                <Image src={image.preview} alt="" fill sizes="10vw" className="object-cover" />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
