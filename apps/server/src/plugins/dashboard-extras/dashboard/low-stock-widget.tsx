import { api, Badge, DashboardBaseWidget, DashboardWidgetDefinition } from '@vendure/dashboard';
import { graphql } from '@/gql';
import { useQuery } from '@tanstack/react-query';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { PackageX, TriangleAlert } from 'lucide-react';

/**
 * Umbral del grupo «stock bajo»: una constante sencilla, no una regla nueva de
 * inventario. Lo agotado (0) se muestra siempre, sea cual sea este valor.
 */
const LOW_STOCK_THRESHOLD = 5;

/**
 * La Admin API de Vendure no permite filtrar ni ordenar por `stockOnHand` en el
 * servidor (comprobado introspeccionando ProductVariantFilterParameter/SortParameter
 * contra el servidor: los dos lo listan, pero el validador de opciones de lista lo
 * rechaza como "invalid-filter-field", porque es un campo calculado/obsoleto, no una
 * columna real). El catálogo de esta tienda es pequeño, así que pedir todas las
 * variantes activas en una sola consulta acotada y filtrar en el cliente es la
 * opción correcta: no es un sistema de stock paralelo, solo una lectura de los datos
 * de la propia API.
 */
const lowStockWidgetQuery = graphql(`
    query LowStockWidgetVariants {
        productVariants(options: { filter: { enabled: { eq: true } }, take: 200 }) {
            totalItems
            items {
                id
                name
                sku
                stockOnHand
                product {
                    id
                }
            }
        }
    }
`);

export const WIDGET_ID = 'low-stock-widget';

export function LowStockWidget() {
    const { t } = useLingui();
    const { data, isLoading } = useQuery({
        queryKey: ['low-stock-widget'],
        queryFn: () => api.query(lowStockWidgetQuery),
        // Es un widget de vistazo en la página de inicio, no un monitor en directo:
        // se recarga con la política de caché normal, sin sondeo.
        staleTime: 60_000,
    });

    const items = data?.productVariants.items ?? [];
    const outOfStock = items.filter(v => v.stockOnHand <= 0).sort((a, b) => a.name.localeCompare(b.name));
    const lowStock = items
        .filter(v => v.stockOnHand > 0 && v.stockOnHand <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stockOnHand - b.stockOnHand);
    const flagged = [...outOfStock, ...lowStock];

    return (
        <DashboardBaseWidget
            id={WIDGET_ID}
            title={t`Stock alerts`}
            description={t`Out of stock, and at or below ${LOW_STOCK_THRESHOLD} units`}
        >
            {isLoading ? (
                <div className="text-sm text-muted-foreground"><Trans>Loading…</Trans></div>
            ) : flagged.length === 0 ? (
                <div className="text-sm text-muted-foreground"><Trans>All enabled variants are above the low-stock threshold.</Trans></div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="inline-flex items-center gap-1.5">
                            <PackageX className="size-4 text-destructive" />
                            <Trans><span className="font-medium">{outOfStock.length}</span> out of stock</Trans>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <TriangleAlert className="size-4 text-warning" />
                            <Trans><span className="font-medium">{lowStock.length}</span> low stock</Trans>
                        </span>
                    </div>
                    <ul className="divide-y divide-border">
                        {flagged.slice(0, 8).map(variant => (
                            <li key={variant.id} className="flex items-center justify-between py-1.5 text-sm">
                                <Link
                                    to={`/products/${variant.product.id}`}
                                    className="hover:underline truncate max-w-[65%]"
                                >
                                    {variant.name}
                                </Link>
                                <Badge variant={variant.stockOnHand <= 0 ? 'destructive' : 'secondary'}>
                                    {variant.stockOnHand <= 0 ? t`Out of stock` : t`${variant.stockOnHand} left`}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                    {flagged.length > 8 && (
                        <p className="text-xs text-muted-foreground">{t`+${flagged.length - 8} more`}</p>
                    )}
                </div>
            )}
        </DashboardBaseWidget>
    );
}

export const lowStockWidget: DashboardWidgetDefinition = {
    id: WIDGET_ID,
    name: /* i18n*/ 'Stock alerts',
    component: LowStockWidget,
    defaultSize: { w: 6, h: 6, x: 6, y: 3 },
    minSize: { w: 4, h: 4 },
    requiresPermissions: ['ReadProduct'],
};
