import type { Metadata } from 'next';
import { routing } from '@/platform/i18n/routing';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogImagePath } from '@/platform/vendure/og-image-path';

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Iron Savage';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

/**
 * Antepone el idioma a una ruta, salvo que sea el idioma por defecto con la política
 * localePrefix 'as-needed': ese idioma se sirve (y se canonicaliza) sin prefijo, y
 * una URL explícita con su prefijo redirige con 307 a la forma sin prefijo.
 */
export function localizedPath(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

/**
 * Recorta un texto a una longitud máxima sin partir palabras.
 * Quita las etiquetas HTML; ideal para meta descripciones (se recomiendan 150-160 caracteres).
 */
export function truncateDescription(
  text: string | null | undefined,
  maxLength = 155
): string {
  if (!text) return '';

  // Quita las etiquetas HTML si las hay
  const cleanText = text.replace(/<[^>]*>/g, '').trim();

  if (cleanText.length <= maxLength) return cleanText;

  // Busca el último espacio antes de maxLength para no cortar palabras
  const truncated = cleanText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return lastSpaceIndex > 0
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
}

/**
 * Construye la URL canónica de una ruta.
 */
export function buildCanonicalUrl(path: string): string {
  const baseUrl = SITE_URL.replace(/\/$/, ''); // Quita la barra final
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Imagen que se muestra al compartir una página (WhatsApp, redes sociales…) que no
 * tiene imagen propia: public/og-image.jpg, 1200×630. Para cambiarla, sustituye ese
 * archivo por otro JPG de 1200×630 de menos de ~300 KB (WhatsApp ignora los más
 * pesados).
 */
export const DEFAULT_OG_IMAGES = [
  {url: '/og-image.jpg', width: 1200, height: 630, alt: `${SITE_NAME} — suplementación deportiva`},
];

/**
 * Construye el array de imágenes Open Graph a partir de la preview de un asset de
 * Vendure; si no hay, usa la imagen por defecto (una página que define `openGraph`
 * sustituye la del layout). La preview no se enlaza tal cual: va por /api/og-image,
 * que la entrega en JPG de 1200×630 (ver platform/vendure/og-image.ts).
 */
export function buildOgImages(
  previewUrl: string | null | undefined,
  alt?: string
): NonNullable<Metadata['openGraph']>['images'] {
  const url = ogImagePath(previewUrl);
  if (!url) return DEFAULT_OG_IMAGES;

  return [
    {
      url,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: alt || 'Product image',
    },
  ];
}

/** Imagen de la tarjeta de Twitter/X: la misma que la de Open Graph. */
export function buildTwitterImages(previewUrl: string | null | undefined): string[] | undefined {
  const url = ogImagePath(previewUrl);
  return url ? [url] : undefined;
}

/**
 * Configuración robots noindex/nofollow para páginas protegidas.
 */
export function noIndexRobots(): Metadata['robots'] {
  return {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  };
}
