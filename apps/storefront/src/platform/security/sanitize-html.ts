import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes rich-text HTML coming from Vendure core entities this storefront
 * doesn't control the write path for (Product.description,
 * PaymentMethod.description) before it's ever passed to
 * dangerouslySetInnerHTML. Runs server-side, in the same RSC render that
 * produces the page — the browser never receives the unsanitized HTML.
 *
 * Allowlist covers what Vendure Dashboard's own rich-text editor produces
 * (paragraphs, basic formatting, lists, links, simple tables) — no
 * script/style/iframe/on*-handlers/javascript: URLs.
 */
const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span',
    'h2', 'h3', 'h4', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
    // rel/target aren't in the source HTML — they're added by transformTags
    // below, but still have to be allow-listed here or attribute filtering
    // strips them right back out afterwards.
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['class'],
};

export function sanitizeRichText(html: string | null | undefined): string {
    if (!html) return '';
    return sanitizeHtml(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }, true),
        },
    });
}
