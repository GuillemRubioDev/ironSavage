/** Porcentaje ahorrado entre el precio original y el precio con descuento (0 si no hay descuento). */
export function discountPercent(before: number, after: number): number {
    if (before <= 0 || after >= before) {
        return 0;
    }
    return Math.round((1 - after / before) * 100);
}
