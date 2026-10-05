'use client';

import {createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode} from 'react';
import Image from 'next/image';
import {CheckCircle2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetTitle} from '@/components/ui/sheet';
import {Link} from '@/platform/i18n/navigation';
import {Price} from '@/features/pricing/price';
import {getCartDrawerData} from '@/features/cart/drawer-data';

type DrawerData = Awaited<ReturnType<typeof getCartDrawerData>>;

const CartDrawerContext = createContext<{open: (productSlug: string) => void} | null>(null);

/** Abre el panel lateral del carrito tras añadir. Fuera del proveedor no hace nada. */
export function useCartDrawer() {
    return useContext(CartDrawerContext) ?? {open: () => {}};
}

/**
 * Panel lateral que se abre al añadir un producto: confirmación, línea añadida,
 * subtotal, "Combínalo con" y botones Finalizar compra / Ver carrito. Lee el pedido
 * activo al abrirse; si eso falla, el producto ya está añadido y quedan los botones.
 */
export function CartDrawerProvider({children}: {children: ReactNode}) {
    const t = useTranslations('Cart');
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<DrawerData | undefined>(undefined);
    const [loading, startLoading] = useTransition();

    const openDrawer = useCallback((productSlug: string) => {
        setData(undefined);
        setOpen(true);
        startLoading(async () => setData(await getCartDrawerData(productSlug)));
    }, []);
    const value = useMemo(() => ({open: openDrawer}), [openDrawer]);

    const order = data?.order;
    const close = () => setOpen(false);

    return (
        <CartDrawerContext.Provider value={value}>
            {children}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                    <div className="border-b border-border p-5">
                        <SheetTitle className="flex items-center gap-2 text-2xl">
                            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
                            {t('drawerTitle')}
                        </SheetTitle>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto p-5" aria-busy={loading}>
                        {loading && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
                        {!loading && data === null && <p className="text-sm text-muted-foreground">{t('drawerError')}</p>}
                        {order?.line && (
                            <div className="flex gap-4">
                                <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                                    {order.line.imageUrl && <Image src={order.line.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
                                </div>
                                <div className="min-w-0 text-sm">
                                    <p className="font-display text-lg font-extrabold uppercase italic leading-tight">{order.line.name}</p>
                                    {order.line.variantName !== order.line.name && <p className="text-muted-foreground">{order.line.variantName}</p>}
                                    <p className="mt-1 font-mono">{order.line.quantity} × · <Price value={order.line.linePrice} currencyCode={order.currencyCode} /></p>
                                </div>
                            </div>
                        )}
                        {order && (
                            <p className="flex justify-between border-t border-border pt-4 text-sm">
                                <span className="text-muted-foreground">{t('subtotal')} ({order.totalQuantity})</span>
                                <span className="font-mono font-semibold"><Price value={order.subTotalWithTax} currencyCode={order.currencyCode} /></span>
                            </p>
                        )}
                        {data?.related && data.related.length > 0 && (
                            <section aria-labelledby="drawer-combine">
                                <h3 id="drawer-combine" className="mb-3 text-xl">{t('combineWith')}</h3>
                                <ul className="space-y-3">
                                    {data.related.map(item => (
                                        <li key={item.slug}>
                                            <Link href={`/productos/${item.slug}`} onClick={close} className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-muted">
                                                <span className="relative size-14 shrink-0 overflow-hidden rounded bg-muted">
                                                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                                                </span>
                                                <span className="min-w-0 flex-1 text-sm font-semibold">{item.name}</span>
                                                <span className="font-mono text-sm"><Price value={item.price} currencyCode={item.currencyCode} /></span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    <div className="grid gap-2 border-t border-border p-5">
                        <Button render={<Link href="/checkout" onClick={close} />} nativeButton={false} size="lg">{t('proceedToCheckout')}</Button>
                        <Button render={<Link href="/carrito" onClick={close} />} nativeButton={false} size="lg" variant="outline">{t('viewCart')}</Button>
                    </div>
                </SheetContent>
            </Sheet>
        </CartDrawerContext.Provider>
    );
}
