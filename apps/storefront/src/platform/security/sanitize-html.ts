import sanitizeHtml from 'sanitize-html';

/**
 * Limpia el HTML enriquecido de entidades de Vendure cuya escritura no controla este
 * storefront (Product.description, PaymentMethod.description) antes de pasarlo a
 * dangerouslySetInnerHTML. Se ejecuta en el servidor, en el mismo render RSC que
 * genera la página: el navegador nunca recibe el HTML sin limpiar.
 *
 * La lista de permitidos cubre lo que genera el editor de texto enriquecido del
 * dashboard de Vendure (párrafos, formato básico, listas, enlaces, tablas simples):
 * nada de script/style/iframe, atributos on* ni URLs javascript:.
 */
const ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span',
    'h2', 'h3', 'h4', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
    // rel/target no están en el HTML original: los añade transformTags más abajo,
    // pero hay que permitirlos aquí o el filtro de atributos los vuelve a quitar.
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
