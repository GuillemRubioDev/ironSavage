import Image from 'next/image';
import {cn} from '@/lib/utils';
import logoFull from '@/assets/logo_sin_bg.png';
import logoWordmark from '@/assets/logo_titulo.png';

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
