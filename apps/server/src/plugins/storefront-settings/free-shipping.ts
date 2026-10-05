import { ConfigurableOperation } from '@vendure/common/lib/generated-types';

import { spainTerritoriesShippingChecker } from '../spain-territories/spain-territories';

export interface FreeShippingThreshold {
    /** Importe mínimo del pedido, en céntimos. */
    amount: number;
    /** true si se compara con el subtotal con IVA (canal con precios con IVA); false, sin IVA. */
    includesTax: boolean;
}

interface ShippingMethodLike {
    checker: ConfigurableOperation;
    calculator: ConfigurableOperation;
}

const arg = (op: ConfigurableOperation, name: string) => op.args.find(a => a.name === name)?.value;

/**
 * Pedido mínimo del envío gratis: el menor de los métodos activos que cuestan 0 €
 * (calculadora por defecto con tarifa 0) y piden un mínimo con la condición
 * «Territorios de España y pedido mínimo». Null si no hay ninguno. Solo cuentan los
 * métodos que cubren la península (el caso de casi todos los pedidos).
 */
export function freeShippingThreshold(
    methods: ShippingMethodLike[],
    pricesIncludeTax: boolean,
): FreeShippingThreshold | null {
    const amounts = methods
        .filter(m => m.checker.code === spainTerritoriesShippingChecker.code && arg(m.checker, 'peninsula') !== 'false')
        .filter(m => m.calculator.code === 'default-shipping-calculator' && Number(arg(m.calculator, 'rate') ?? 0) === 0)
        .map(m => Number(arg(m.checker, 'orderMinimum') ?? 0))
        .filter(amount => Number.isFinite(amount) && amount > 0);
    return amounts.length ? { amount: Math.min(...amounts), includesTax: pricesIncludeTax } : null;
}
