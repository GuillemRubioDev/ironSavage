import type { Metadata } from 'next';
import { routing } from '@/platform/i18n/routing';

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Iron Savage';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

/**
 * Prefix a path with its locale, unless it's the default locale under an
 * 'as-needed' localePrefix policy — that locale is served (and canonicalized)
 * unprefixed, and an explicit `/en/...` URL 307s to the unprefixed form.
 */
export function localizedPath(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

/**
 * Truncate text to a maximum length while preserving word boundaries.
 * Strips HTML tags and is ideal for meta descriptions (recommended 150-160 chars).
 */
export function truncateDescription(
  text: string | null | undefined,
  maxLength = 155
): string {
  if (!text) return '';

  // Strip HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, '').trim();

  if (cleanText.length <= maxLength) return cleanText;

  // Find the last space before maxLength to avoid cutting words
  const truncated = cleanText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  return lastSpaceIndex > 0
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
}

/**
 * Build a canonical URL for a given path.
 */
export function buildCanonicalUrl(path: string): string {
  const baseUrl = SITE_URL.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Image shown when a page is shared (WhatsApp, social networks…) and has no
 * picture of its own: public/og-image.png, 1200×630. Replace that file to
 * change it.
 */
export const DEFAULT_OG_IMAGES = [
  {url: '/og-image.png', width: 1200, height: 630, alt: `${SITE_NAME} — suplementación deportiva`},
];

/**
 * Build Open Graph image array from an image URL — the default share image
 * when there is none (a page that sets `openGraph` replaces the layout's).
 */
export function buildOgImages(
  imageUrl: string | null | undefined,
  alt?: string
): NonNullable<Metadata['openGraph']>['images'] {
  if (!imageUrl) return DEFAULT_OG_IMAGES;

  return [
    {
      url: imageUrl,
      alt: alt || 'Product image',
    },
  ];
}

/**
 * Create noindex/nofollow robots config for protected pages.
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
