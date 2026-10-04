import Image from 'next/image';
import {cn} from '@/lib/utils';
import logoFull from '@/assets/logo_sin_bg.png';
import logoWordmark from '@/assets/logo_titulo.png';

/**
 * Dos archivos de marca reales y transparentes (apps/storefront/src/assets/); nunca
 * los regeneres ni les añadas fondo:
 *  - "full": el logo completo (emblema IS + IRON SAVAGE + lema), alto; para el pie,
 *    el panel de marca de acceso/registro y cualquier sitio con altura suficiente
 *    para la identidad completa.
 *  - "wordmark": «IRON SAVAGE» en horizontal, sin lema; para la cabecera y
 *    cualquier otro sitio horizontal con poco espacio.
 * Se importan de forma estática para que next/image conozca su tamaño y sirva una
 * copia optimizada del tamaño adecuado en vez del original de varios MB.
 */
const VARIANTS = {
    full: logoFull,
    wordmark: logoWordmark,
} as const;

export function Logo({
    variant = 'wordmark',
    className,
    priority,
}: {
    variant?: keyof typeof VARIANTS;
    className?: string;
    priority?: boolean;
}) {
    return (
        <Image
            src={VARIANTS[variant]}
            alt="Iron Savage"
            priority={priority}
            // Elemento de tamaño fijo, nunca cerca del ancho de pantalla: sin esto, Next
            // supone hasta 100vw y sirve imágenes srcset demasiado grandes para lo que
            // siempre es un logo pequeño.
            sizes="260px"
            className={cn('h-8 w-auto object-contain', className)}
        />
    );
}
