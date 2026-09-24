import { BulkActionComponent, DataTableBulkActionItem } from '@vendure/dashboard';
import { Printer } from 'lucide-react';

export const PrintShippingLabelsBulkAction: BulkActionComponent<any> = ({ selection, table }) => {
    const ids = selection.map(item => item.id).join(',');

    return (
        <DataTableBulkActionItem
            onClick={() => {
                window.open(`/order-tools/shipping-labels?orders=${ids}`, '_blank');
                table.resetRowSelection();
            }}
            label="Imprimir etiquetas"
            icon={Printer}
        />
    );
};
