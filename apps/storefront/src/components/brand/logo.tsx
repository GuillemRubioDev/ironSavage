import Image from 'next/image';
import type {CSSProperties} from 'react';
import {cn} from '@/lib/utils';
import logoFull from '@/assets/logo_sin_bg.png';
import logoWordmark from '@/assets/logo_titulo.png';
import logoIronMask from '@/assets/logo_iron_mask.png';
import logoSavageMask from '@/assets/logo_savage_mask.png';

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

/**
 * logo_iron_mask.png / logo_savage_mask.png (apps/storefront/src/assets/): PNG ya
 * separados, solo canal alfa, blanco sobre transparente, sacados del logotipo real,
 * uno por palabra. Se generaron una vez clasificando cada píxel opaco de
 * logo_titulo.png por su color (rojo frente a gris/blanco) y no por su posición. Un
 * corte izquierda/derecha no sirve en este logo: la «S» de SAVAGE tiene una cola
 * decorativa que baja hacia la izquierda y se solapa con el espacio horizontal de
 * la «N» de IRON, así que ninguna línea vertical separa las dos palabras sin cortar
 * esa cola. El color sí lo hace: cada píxel ya «sabe» a qué palabra pertenece. (Un
 * filtro de densidad eliminó las pocas motas de textura mal clasificadas: una mota
 * aislada tiene muy pocos vecinos del mismo color para sobrevivir.) Nunca se toca
 * logo_titulo.png; son archivos nuevos y separados.
 */
const WORD_MASKS = {
    iron: logoIronMask,
    savage: logoSavageMask,
} as const;

/**
 * Una palabra («IRON» o «SAVAGE») dibujada como forma de color plano a partir de su
 * máscara ya separada: sin degradados ni texturas, con las letras reales (no
 * calcadas a mano) y sin cálculos de recorte en ejecución (así no hay riesgo en el
 * punto de corte).
 */
export function LogoWordCrop({
    word,
    revealDelayMs = 0,
    className,
    style,
}: {
    word: 'iron' | 'savage';
    revealDelayMs?: number;
    className?: string;
    style?: CSSProperties;
}) {
    const isIron = word === 'iron';
    const mask = WORD_MASKS[word];

    const maskStyle: CSSProperties = {
        WebkitMaskImage: `url(${mask.src})`,
        maskImage: `url(${mask.src})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
    };

    return (
        <span
            aria-hidden="true"
            // El `filter: drop-shadow` del brillo lleva este elemento a su propia capa de
            // GPU. Forzarlo aquí de forma explícita (en vez de dejarlo implícito) mantiene
            // su capa sincronizada con el texto vecino mientras se arrastra el carrusel;
            // sin ello puede parpadear una fina línea entre este elemento y el texto de
            // al lado al arrastrar la diapositiva.
            className={cn('relative inline-block select-none cursor-default [transform:translateZ(0)]', className)}
            style={{aspectRatio: `${mask.width} / ${mask.height}`, ...style}}
        >
            <span className="animate-logo-wipe absolute inset-0" style={{animationDelay: `${revealDelayMs}ms`}}>
                <span
                    className={cn('absolute inset-0', isIron ? 'logo-glow-white bg-white' : 'logo-glow-red bg-primary')}
                    style={maskStyle}
                />
            </span>
        </span>
    );
}

/**
 * El logotipo «IRON SAVAGE» completo apareciendo con animación, para un único sitio
 * de impacto (la portada) y no para cada <Logo>. Solo decorativo (el nombre
 * accesible real lo da el título o la etiqueta de quien lo usa) e insensible a
 * clics, arrastres y selección, para que no deje marcas de selección sobre el
 * carrusel.
 */
export function AnimatedWordmark({className}: {className?: string}) {
    return (
        <div
            aria-hidden="true"
            className={cn('flex items-center justify-center gap-[2%] select-none cursor-default pointer-events-none', className)}
        >
            <LogoWordCrop word="iron" revealDelayMs={0} className="h-full" />
            <LogoWordCrop word="savage" revealDelayMs={260} className="h-full" />
        </div>
    );
}
