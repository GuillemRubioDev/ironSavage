import {Price} from '@/features/pricing/price';

interface PriceWithDiscountProps {
    /** Precio original con IVA, en céntimos. */
    before: number;
    /** Precio con IVA tras los descuentos visibles, en céntimos. */
    after: number;
    currencyCode: string;
    /** `lg` para la ficha de producto, donde el precio es el protagonista. */
    size?: 'sm' | 'lg';
}

/**
 * Muestra el precio original tachado en rojo y el precio con descuento en verde.
 * Sin descuento (o si el precio no baja), solo el precio normal. El porcentaje
 * se indica con el triángulo de la foto (ProductBadges), no aquí.
 */
export function PriceWithDiscount({before, after, currencyCode, size = 'sm'}: PriceWithDiscountProps) {
    if (after >= before) {
        return <Price value={before} currencyCode={currencyCode}/>;
    }
    const isLarge = size === 'lg';
    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <s className={isLarge ? 'text-lg md:text-xl font-normal text-destructive tabular-nums' : 'text-sm font-normal text-destructive tabular-nums'}>
                <Price value={before} currencyCode={currencyCode}/>
            </s>
            <span className="text-success">
                <Price value={after} currencyCode={currencyCode}/>
            </span>
        </span>
    );
}
