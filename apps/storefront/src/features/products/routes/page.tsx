import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Link } from '@/platform/i18n/navigation';
import { query } from '@/platform/vendure/api';
import {GetProductDetailQuery} from '@/features/products/graphql';
import { ProductDetailClient } from '@/features/products/components/product-detail-client';
import { FoodInformation } from '@/features/products/components/food-information';
import {getDisplayOptionGroups} from '@/features/products/product-options';
import {sanitizeRichText} from '@/platform/security/sanitize-html';
import { RelatedProducts } from '@/features/products/components/related-products';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import { Truck, RotateCcw, ShieldCheck, Clock } from 'lucide-react';
import { routing } from '@/platform/i18n/routing';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    localizedPath,
    buildOgImages,
} from '@/config/metadata';
import {getTranslations} from 'next-intl/server';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {getRouteLocale} from '@/platform/i18n/server';

async function getProductData(slug: string, currencyCode: string) {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    cacheTag(`product-${slug}-${locale}-${currencyCode}`);
    cacheTag('products');

    return await query(GetProductDetailQuery, {slug}, {languageCode: locale, currencyCode});
}

export async function generateMetadata({
    params,
}: PageProps<'/[locale]/productos/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const result = await getProductData(slug, currencyCode);
    const product = result.data.product;

    const t = await getTranslations({locale, namespace: 'Product'});

    if (!product || !product.enabled || !product.customFields?.visibleInStorefront) {
        return {
            title: t('notFound'),
        };
    }

    const description = truncateDescription(product.description);
    const fallbackDescription = t('shopProductAt', {name: product.name, siteName: SITE_NAME});
    const ogImage = product.assets?.[0]?.preview;
    const ogLocale = toOgLocale(locale);
    const productPath = `/productos/${product.slug}`;

    return {
        title: product.name,
        description: description || fallbackDescription,
        alternates: {
            canonical: buildCanonicalUrl(localizedPath(locale, productPath)),
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, productPath))])
            ),
        },
        openGraph: {
            title: product.name,
            description: description || fallbackDescription,
            type: 'website',
            locale: ogLocale,
            url: buildCanonicalUrl(localizedPath(locale, productPath)),
            images: buildOgImages(ogImage, product.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: description || fallbackDescription,
            images: ogImage ? [ogImage] : undefined,
        },
    };
}

export interface ProductDetailPageProps extends PageProps<'/[locale]/productos/[slug]'> {
    /**
     * Las reseñas son su propia funcionalidad (GraphQL propio, comprobación propia de
     * quién puede reseñar): esta funcionalidad no entra en sus detalles internos,
     * solo deja un hueco en el sitio adecuado del diseño para que lo rellene quien
     * compone la página (ver site/products/product-detail-page.tsx).
     */
    reviewsSlot?: (product: {productId: string; productSlug: string}) => ReactNode;
}

export default async function ProductDetailPage({
    params,
    searchParams,
    reviewsSlot,
}: ProductDetailPageProps) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Product'});

    const result = await getProductData(slug, currencyCode);

    const product = result.data.product;

    if (!product || !product.enabled || !product.customFields?.visibleInStorefront) {
        notFound();
    }

    // Obtiene la colección principal (prefiere la más anidada / más específica)
    const primaryCollection = product.collections?.find(c => c.parent?.id) ?? product.collections?.[0];

    // Oculta las opciones de un grupo compartido que no tienen variante en este
    // producto (grupos de opciones compartidos/globales de Vendure 3.6).
    // product.description es HTML enriquecido escrito por el administrador que se
    // muestra con dangerouslySetInnerHTML en product-info.tsx (componente de cliente):
    // se limpia aquí, en el servidor, antes de que llegue allí.
    const productForDisplay = {
        ...product,
        description: sanitizeRichText(product.description),
        optionGroups: getDisplayOptionGroups(product),
    };

    return (
        // La barra fija de añadir al carrito en móvil (product-info.tsx) es `fixed`
        // para toda la ficha, no solo su columna: se reserva hueco aquí, en la raíz de
        // la página, para que ninguna sección de debajo (sellos de confianza,
        // preguntas frecuentes, productos relacionados) quede tapada por ella.
        <div className="pb-24 lg:pb-0">
            <div className="container mx-auto px-4 py-8">
                {/* Migas de pan */}
                <Breadcrumb className="mb-6">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/" />}>{t('home')}</BreadcrumbLink>
                        </BreadcrumbItem>
                        {primaryCollection && (
                            <>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink render={<Link href={`/categorias/${primaryCollection.slug}`} />}>
                                        {primaryCollection.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </>
                        )}
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{product.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <ProductDetailClient product={productForDisplay} searchParams={searchParamsResolved} currencyCode={currencyCode} />
            </div>

            <FoodInformation locale={locale} data={product.customFields ?? {}} />

            {/* Envío y sellos de confianza */}
            <section className="py-6 mt-8 border-y border-border">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <div className="inline-flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            {t('trustBadges.fastShipping')}
                        </div>
                        <div className="inline-flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-primary" />
                            {t('trustBadges.freeReturns')}
                        </div>
                        <div className="inline-flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            {t('trustBadges.secureCheckout')}
                        </div>
                        <div className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            {t('trustBadges.guarantee')}
                        </div>
                    </div>
                </div>
            </section>

            {reviewsSlot?.({productId: product.id, productSlug: product.slug})}

            {/* Preguntas frecuentes de la tienda */}
            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4 max-w-2xl">
                    <h2 className="text-display text-2xl md:text-3xl font-bold mb-8">{t('faq.title')}</h2>
                    <Accordion className="w-full">
                        <AccordionItem value="shipping">
                            <AccordionTrigger>{t('faq.shipping.question')}</AccordionTrigger>
                            <AccordionContent>
                                {t('faq.shipping.answer')}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="returns">
                            <AccordionTrigger>{t('faq.returns.question')}</AccordionTrigger>
                            <AccordionContent>
                                {t('faq.returns.answer')}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="tracking">
                            <AccordionTrigger>{t('faq.tracking.question')}</AccordionTrigger>
                            <AccordionContent>
                                {t('faq.tracking.answer')}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="international">
                            <AccordionTrigger>{t('faq.international.question')}</AccordionTrigger>
                            <AccordionContent>
                                {t('faq.international.answer')}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {primaryCollection && (
                <RelatedProducts
                    collectionSlug={primaryCollection.slug}
                    currentProductId={product.id}
                />
            )}
        </div>
    );
}
