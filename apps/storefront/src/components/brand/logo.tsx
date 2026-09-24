import Image from 'next/image';
import type {CSSProperties} from 'react';
import {cn} from '@/lib/utils';
import logoFull from '@/assets/logo_sin_bg.png';
import logoWordmark from '@/assets/logo_titulo.png';
import logoIronMask from '@/assets/logo_iron_mask.png';
import logoSavageMask from '@/assets/logo_savage_mask.png';

/**
 * Two real, transparent brand assets (apps/storefront/src/assets/) — never
 * regenerate or add a background to either:
 *  - "full": the complete mark (IS emblem + IRON SAVAGE + tagline), tall
 *    aspect ratio — footer, login/register branded panel, anywhere with
 *    enough vertical room to show the whole identity.
 *  - "wordmark": horizontal "IRON SAVAGE" lockup, no tagline — header nav
 *    and any other space-constrained horizontal placement.
 * Statically imported so next/image can infer intrinsic size and serve an
 * optimized, appropriately-sized copy instead of the multi-MB source file.
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
            // Fixed-size UI chrome, never near full viewport width — without
            // this, Next assumes up to 100vw and serves oversized srcset
            // candidates for what's actually always a small logo mark.
            sizes="260px"
            className={cn('h-8 w-auto object-contain', className)}
        />
    );
}

/**
 * logo_iron_mask.png / logo_savage_mask.png (apps/storefront/src/assets/):
 * pre-split, alpha-only, white-on-transparent PNGs derived from the real
 * wordmark, one per word — generated once by classifying every opaque pixel
 * of logo_titulo.png by its own color (red vs. gray/white) rather than by
 * position. A plain left/right position split doesn't work on this logo: the
 * "S" of SAVAGE has a decorative tail that swoops down and to the left,
 * genuinely overlapping the "N" of IRON's horizontal space, so no vertical
 * line can separate the two words without slicing through that tail. Color
 * naturally does — every pixel already "knows" which word it belongs to.
 * (A density filter dropped the handful of stray misclassified texture
 * specks — an isolated fleck has too few same-color neighbors to survive.)
 * Never touches logo_titulo.png itself; these are new, separate assets.
 */
const WORD_MASKS = {
    iron: logoIronMask,
    savage: logoSavageMask,
} as const;

/**
 * One word ("IRON" or "SAVAGE"), re-rendered as a flat-color shape from its
 * pre-split mask asset — no gradients/textures, real letterforms (not
 * hand-traced), and no runtime crop math (so no split-point risk at all).
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
            // The glow's `filter: drop-shadow` promotes this element to its own
            // GPU compositing layer. Forcing that promotion here explicitly
            // (rather than leaving it implicit) keeps this element's layer
            // consistently in sync with its non-promoted text siblings during
            // the carousel's drag transform — without it, a hairline seam can
            // flicker at the boundary between this element and plain text next
            // to it while the parent slide is being dragged.
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
 * The full "IRON SAVAGE" wordmark, materializing in — for a single
 * high-impact placement (the homepage hero) rather than every instance of
 * <Logo>. Decorative only (a real accessible name is provided by the
 * caller's own heading/label), and inert to clicks/drags/selection so it
 * can't leave a stray selection-highlight seam over the carousel.
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
