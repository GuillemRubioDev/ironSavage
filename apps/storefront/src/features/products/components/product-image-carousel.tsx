'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface ProductImageCarouselProps {
    images: Array<{
        id: string;
        preview: string;
        source: string;
    }>;
    /** Used in the images' alt text ("Whey Protein, imagen 1 de 3"). */
    productName: string;
}

export function ProductImageCarousel({ images, productName }: ProductImageCarouselProps) {
    const t = useTranslations('Product');
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div className="aspect-[4/5] bg-muted rounded-md flex items-center justify-center">
                <span className="text-muted-foreground">{t('noImagesAvailable')}</span>
            </div>
        );
    }

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="space-y-3">
            {/* Imagen principal */}
            <div className="relative aspect-[4/5] bg-muted rounded-md overflow-hidden group cursor-crosshair">
                <Image
                    src={images[currentIndex].source}
                    alt={t('imageAlt', { name: productName, index: currentIndex + 1, total: images.length })}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    priority={currentIndex === 0}
                />

                {/* Flechas de navegación */}
                {images.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-12 w-9 rounded-none bg-background/70 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            onClick={goToPrevious}
                            aria-label={t('previousImage')}
                        >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-1/2 -translate-y-1/2 h-12 w-9 rounded-none bg-background/70 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            onClick={goToNext}
                            aria-label={t('nextImage')}
                        >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </Button>
                    </>
                )}

                {/* Contador de imágenes */}
                {images.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-background/85 px-2 py-0.5 text-xs font-mono tabular-nums" aria-hidden="true">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}
            </div>

            {/* Tira de miniaturas */}
            {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setCurrentIndex(index)}
                            aria-label={t('showImage', { index: index + 1, total: images.length })}
                            aria-current={index === currentIndex ? 'true' : undefined}
                            className={`aspect-square relative overflow-hidden border-b-2 transition-colors duration-200 ${
                                index === currentIndex
                                    ? 'border-primary'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            <Image
                                src={image.preview}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="20vw"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
