import { CartSkeleton } from '@/features/cart/components/cart-skeleton';

// Mismo contenedor y título (text-5xl / md:text-6xl, interlineado .92) que page.tsx:
// con otro relleno, al llegar el carrito todo subía de golpe.
export default function CartLoading() {
    return (
        <div className="container mx-auto px-4 py-10 md:py-14">
            <div className="mb-8 h-11 w-48 animate-pulse rounded bg-muted md:h-14" />
            <CartSkeleton />
        </div>
    );
}
