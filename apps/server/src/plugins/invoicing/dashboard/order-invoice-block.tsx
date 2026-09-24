import {
    api,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    PageContextValue,
} from '@vendure/dashboard';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { adminInvoiceForOrderDocument, resendInvoiceDocument } from './graphql';

export function OrderInvoiceBlock({ context }: { context: PageContextValue }) {
    const orderId = context.entity?.id;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [email, setEmail] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['invoice-for-order', orderId],
        queryFn: () => api.query(adminInvoiceForOrderDocument, { orderId }),
        enabled: !!orderId,
    });

    const resendMutation = useMutation({
        mutationFn: api.mutate(resendInvoiceDocument),
        onSuccess: () => {
            toast(`Factura reenviada a ${email}`);
            setDialogOpen(false);
            setEmail('');
        },
        onError: error => {
            toast('No se pudo reenviar la factura', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    if (isLoading || !orderId) {
        return null;
    }

    const invoice = data?.invoiceForOrder;
    if (!invoice) {
        // Not paid yet — an invoice only exists from PaymentSettled onwards.
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <div>
                    <div className="font-medium">{invoice.formattedNumber}</div>
                    <div className="text-muted-foreground">{new Date(invoice.issueDate).toLocaleDateString()}</div>
                </div>
            </div>
            <div className="flex gap-2">
                {invoice.hasPdf && (
                    <Button
                        variant="outline"
                        size="sm"
                        render={<a href={`/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" />}
                    >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Descargar
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Mail className="mr-2 h-3.5 w-3.5" />
                    Reenviar
                </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Reenviar factura</DialogTitle>
                        <DialogDescription>
                            Se enviará {invoice.formattedNumber} en PDF a la dirección que indiques — no tiene por
                            qué ser la del cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="resend-email">Correo de destino</Label>
                        <Input
                            id="resend-email"
                            type="email"
                            placeholder="cliente@ejemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            disabled={!email || resendMutation.isPending}
                            onClick={() => resendMutation.mutate({ invoiceId: invoice.id, emailAddress: email })}
                        >
                            {resendMutation.isPending ? 'Enviando...' : 'Enviar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
