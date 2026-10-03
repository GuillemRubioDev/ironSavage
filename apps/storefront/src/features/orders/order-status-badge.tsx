import {Badge} from '@/components/ui/badge';
import {
    ShoppingCart,
    CreditCard,
    Clock,
    CheckCircle,
    Truck,
    PackageCheck,
    PackageOpen,
    Package,
    Boxes,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import {useTranslations} from 'next-intl';

// Se usan los pocos tokens de la paleta de marca en vez de un color por estado (no
// caben 9 colores distintos sin inventar tonos fuera de negro/grafito/gris/rojo): el
// icono y el texto distinguen cada estado y el color indica la categoría general.
const STATUS_CONFIG: Record<string, { color: string; icon: LucideIcon }> = {
    AddingItems: {color: 'bg-muted text-muted-foreground', icon: ShoppingCart},
    ArrangingPayment: {color: 'bg-warning/15 text-warning-foreground dark:text-warning', icon: CreditCard},
    PaymentAuthorized: {color: 'bg-warning/15 text-warning-foreground dark:text-warning', icon: Clock},
    PaymentSettled: {color: 'bg-success/10 text-success', icon: CheckCircle},
    // Pasos de almacén (servidor: order-tools/warehouse-order-process.ts).
    InPreparation: {color: 'bg-secondary text-secondary-foreground', icon: PackageOpen},
    ReadyToShip: {color: 'bg-secondary text-secondary-foreground', icon: Boxes},
    PartiallyShipped: {color: 'bg-secondary text-secondary-foreground', icon: Package},
    Shipped: {color: 'bg-primary/10 text-primary', icon: Truck},
    PartiallyDelivered: {color: 'bg-secondary text-secondary-foreground', icon: PackageCheck},
    Delivered: {color: 'bg-success/10 text-success', icon: PackageCheck},
    Cancelled: {color: 'bg-destructive/10 text-destructive', icon: XCircle},
};

interface OrderStatusBadgeProps {
    state: string;
}

export function OrderStatusBadge({state}: OrderStatusBadgeProps) {
    const t = useTranslations('OrderStatus');
    const config = STATUS_CONFIG[state] || {color: 'bg-muted text-muted-foreground', icon: Clock};
    const Icon = config.icon;
    const label = state in STATUS_CONFIG ? t(state as 'AddingItems' | 'ArrangingPayment' | 'PaymentAuthorized' | 'PaymentSettled' | 'InPreparation' | 'ReadyToShip' | 'PartiallyShipped' | 'Shipped' | 'PartiallyDelivered' | 'Delivered' | 'Cancelled') : state;

    return (
        <Badge className={config.color} variant="secondary">
            <Icon className="h-3 w-3 mr-1"/>
            {label}
        </Badge>
    );
}
