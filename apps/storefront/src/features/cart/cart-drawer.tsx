'use client';

import {createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode} from 'react';
import Image from 'next/image';
import {CheckCircle2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {Sheet, SheetContent, SheetTitle} from '@/components/ui/sheet';
import {Link} from '@/platform/i18n/navigation';
import {Price} from '@/features/pricing/price';
import {getCartDrawerData} from '@/features/cart/drawer-data';
import {FreeShippingBar} from '@/features/cart/free-shipping-bar';

type DrawerData = Awaited<ReturnType<typeof getCartDrawerData>>;

const CartDrawerContext = createContext<{open: (productSlug: string) => void} | null>(null);

/** Abre el panel del carrito tras añadir. Fuera del proveedor no hace nada. */
export function useCartDrawer() {
    return useContext(CartDrawerContext) ?? {open: () => {}};
}

/**
 * Panel que se abre al añadir un producto: confirmación, línea añadida, subtotal, lo
 * que falta para el envío gratis, "Combínalo con" y botones Finalizar compra / Ver
 * carrito. Lee el pedido activo al abrirse; si eso falla, el producto ya está añadido
 * y quedan los botones.
 *
 * Entra de abajo arriba con un fundido largo (solo transform + opacity). Mientras
 * llegan los datos se ve un esqueleto con las medidas finales, y el contenido no se
 * descubre hasta que sus imágenes están decodificadas (DrawerBody): antes el panel
 * entraba vacío y la línea, el subtotal, las sugerencias y sus fotos iban apareciendo
 * a saltos con el panel ya a la vista.
 */
export function CartDrawerProvider({children}: {children: ReactNode}) {
    const t = useTranslations('Cart');
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<DrawerData | undefined>(undefined);
    const [loading, startLoading] = useTransition();
    // Cada apertura monta un DrawerBody nuevo: vuelve al esqueleto y espera otra vez a las imágenes.
    const [requestId, setRequestId] = useState(0);

    const openDrawer = useCallback((productSlug: string) => {
        setData(undefined);
        setRequestId(id => id + 1);
        setOpen(true);
        startLoading(async () => {
            try {
                setData(await getCartDrawerData(productSlug));
            } catch {
                setData(null);
            }
        });
    }, []);
    const value = useMemo(() => ({open: openDrawer}), [openDrawer]);

    const close = () => setOpen(false);

    return (
        <CartDrawerContext.Provider value={value}>
            {children}
            <Sheet open={open} onOpenChange={setOpen}>
                {/* De abajo arriba en vez de desde el lateral: 420 ms con una curva que frena
                    al final, y la salida más corta. */}
                <SheetContent
                    side="right"
                    className="flex w-full flex-col gap-0 p-0 duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] data-starting-style:translate-y-8 data-ending-style:translate-y-4 data-ending-style:duration-200 data-ending-style:ease-in sm:max-w-md data-[side=right]:data-starting-style:translate-x-0 data-[side=right]:data-ending-style:translate-x-0"
                >
                    <div className="border-b border-border p-5">
                        <SheetTitle className="flex items-center gap-2 text-2xl">
                            <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
                            {t('drawerTitle')}
                        </SheetTitle>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5" aria-busy={loading}>
                        <DrawerBody key={requestId} data={data} onNavigate={close} />
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

/** Tope de espera a las imágenes: el contenido nunca se retiene más que esto. */
const IMAGES_MAX_WAIT_MS = 600;

/**
 * Esqueleto y contenido apilados en la misma celda de rejilla. El esqueleto se ve
 * desde el primer fotograma; el contenido se monta invisible en cuanto llegan los
 * datos y, cuando sus imágenes ya se pueden pintar (img.decode(), con tope), entra
 * escalonado (.entrada-lista) mientras el esqueleto se desvanece.
 * El panel ocupa toda la altura, así que si el contenido mide distinto que el
 * esqueleto no se mueve nada más.
 */
function DrawerBody({data, onNavigate}: {data: DrawerData | undefined; onNavigate: () => void}) {
    const t = useTranslations('Cart');
    const contentRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);

    useLayoutEffect(() => {
        if (data === undefined) return;
        const images = [...(contentRef.current?.querySelectorAll('img') ?? [])];
        let cancelled = false;
        Promise.race([
            Promise.all(images.map(img => img.decode().catch(() => undefined))),
            new Promise(resolve => setTimeout(resolve, IMAGES_MAX_WAIT_MS)),
        ]).then(() => {
            if (!cancelled) setReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, [data]);

    const order = data?.order;
    return (
        <div className="grid *:[grid-area:1/1]">
            <div aria-hidden="true" className={`space-y-6 transition-opacity duration-200 ${ready ? 'pointer-events-none opacity-0' : ''}`}>
                <DrawerSkeleton />
            </div>
            {data !== undefined && (
                <div ref={contentRef} data-pendiente={ready ? undefined : ''} className={`space-y-6 ${ready ? 'entrada-lista' : 'invisible'}`}>
                    {data === null && <p className="text-sm text-muted-foreground">{t('drawerError')}</p>}
                    {order?.line && (
                        <div className="flex gap-4">
                            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                                {order.line.imageUrl && <Image src={order.line.imageUrl} alt="" fill sizes="80px" loading="eager" className="object-cover" />}
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
                    {order?.freeShipping && <FreeShippingBar progress={order.freeShipping} currencyCode={order.currencyCode} />}
                    {data?.related && data.related.length > 0 && (
                        <section aria-labelledby="drawer-combine">
                            <h3 id="drawer-combine" className="mb-3 text-xl">{t('combineWith')}</h3>
                            <ul className="space-y-3">
                                {data.related.map(item => (
                                    <li key={item.slug}>
                                        <Link href={`/productos/${item.slug}`} onClick={onNavigate} className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-muted">
                                            <span className="relative size-14 shrink-0 overflow-hidden rounded bg-muted">
                                                {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="56px" loading="eager" className="object-cover" />}
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
            )}
        </div>
    );
}

/** Mismas medidas que el contenido de DrawerBody, para que nada se mueva al revelarlo. */
function DrawerSkeleton() {
    return (
        <>
            <div className="flex gap-4">
                <Skeleton className="size-20 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </div>
            <div className="flex justify-between border-t border-border pt-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-64 max-w-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div>
                <Skeleton className="mb-3 h-7 w-40" />
                <div className="space-y-3">
                    {Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-1">
                            <Skeleton className="size-14 shrink-0 rounded" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-14" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
