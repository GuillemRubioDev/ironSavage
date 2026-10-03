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
import { Trans, useLingui } from '@lingui/react/macro';

import { adminInvoiceForOrderDocument, resendInvoiceDocument } from './graphql';

export function OrderInvoiceBlock({ context }: { context: PageContextValue }) {
    const { t } = useLingui();
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
            toast(t`Invoice resent to ${email}`);
            setDialogOpen(false);
            setEmail('');
        },
        onError: error => {
            toast(t`Could not resend the invoice`, {
                description: error instanceof Error ? error.message : t`Unknown error`,
            });
        },
    });

    if (isLoading || !orderId) {
        return null;
    }

    const invoice = data?.invoiceForOrder;
    if (!invoice) {
        // Aún sin pagar: la factura solo existe a partir de PaymentSettled.
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
                        <Trans>Download</Trans>
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    <Mail className="mr-2 h-3.5 w-3.5" />
                    <Trans>Resend</Trans>
                </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle><Trans>Resend invoice</Trans></DialogTitle>
                        <DialogDescription>
                            <Trans>{invoice.formattedNumber} will be sent as a PDF to the address you enter — it doesn't have to be the customer's.</Trans>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="resend-email"><Trans>Recipient email</Trans></Label>
                        <Input
                            id="resend-email"
                            type="email"
                            placeholder={t`customer@example.com`}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            <Trans>Cancel</Trans>
                        </Button>
                        <Button
                            disabled={!email || resendMutation.isPending}
                            onClick={() => resendMutation.mutate({ invoiceId: invoice.id, emailAddress: email })}
                        >
                            {resendMutation.isPending ? <Trans>Sending...</Trans> : <Trans>Send</Trans>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
