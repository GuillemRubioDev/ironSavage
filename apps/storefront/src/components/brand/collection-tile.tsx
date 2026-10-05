import Image from 'next/image';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';

/**
 * Tarjeta de categoría u objetivo. Con imagen de colección, la foto con zoom suave al
 * pasar el ratón; sin imagen, la inicial del nombre en grande sobre fondo de marca
 * (nunca una caja vacía). `goal` es más alta y numera el objetivo.
 */
export function CollectionTile({href, name, imageUrl, variant = 'category', index}: {
    href: string;
    name: string;
    imageUrl: string | null;
    variant?: 'category' | 'goal';
    index?: number;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'img-zoom hover-lift group relative block overflow-hidden rounded-lg bg-brand text-brand-fg ring-1 ring-brand-line',
                variant === 'goal' ? 'aspect-[3/4]' : 'aspect-square',
            )}
        >
            {imageUrl ? (
                <Image src={imageUrl} alt="" fill className="object-cover" sizes={variant === 'goal' ? '(min-width: 768px) 20vw, 45vw' : '(min-width: 768px) 16vw, 40vw'} />
            ) : (
                <span aria-hidden="true" className="absolute -right-2 -top-6 font-display text-[9rem] font-black italic leading-none text-white/20 transition-transform duration-[var(--dur-slow)] group-hover:scale-110">
                    {name.charAt(0)}
                </span>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden="true" />
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
                {variant === 'goal' && index !== undefined && (
                    <span aria-hidden="true" className="font-mono text-xs font-bold text-primary-text">{String(index + 1).padStart(2, '0')}</span>
                )}
                <span className="font-display text-xl font-extrabold uppercase italic leading-none md:text-2xl">{name}</span>
                <span aria-hidden="true" className="h-0.5 w-6 bg-primary-solid transition-[width] duration-[var(--dur-base)] group-hover:w-12" />
            </span>
        </Link>
    );
}
