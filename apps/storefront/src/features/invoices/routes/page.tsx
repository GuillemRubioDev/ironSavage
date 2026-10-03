import type {Metadata} from 'next';
import {query} from '@/platform/vendure/api';
import {GetMyInvoicesQuery} from '@/features/invoices/graphql';
import {getActiveCustomer} from '@/features/account/customer';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Button} from '@/components/ui/button';
import {Price} from '@/features/pricing/price';
import {formatDate} from '@/platform/i18n/format';
import {redirect} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {Download, FileText} from 'lucide-react';

const ITEMS_PER_PAGE = 50;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Invoices'});
    return {
        title: t('invoicesPageTitle'),
    };
}

export default async function InvoicesPage() {
    const locale = await getRouteLocale();
    const customer = await getActiveCustomer();

    if (!customer) {
        return redirect({href: '/login', locale});
    }

    const {data} = await query(
        GetMyInvoicesQuery,
        {options: {skip: 0, take: ITEMS_PER_PAGE}},
        {useAuthToken: true},
    );
    const t = await getTranslations({locale, namespace: 'Invoices'});
    // download/totalHeader son vocabulario genérico de tablas de «lo mío», compartido
    // con la tabla de pedidos de la cuenta: se reutiliza de verdad, no es contenido
    // propio de facturas.
    const tAccount = await getTranslations({locale, namespace: 'Account'});

    const invoices = data.myInvoices.items;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">{t('myInvoices')}</h1>

            {invoices.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t('noInvoices')}</p>
                </div>
            ) : (
                <>
                    {/* Móvil: diseño en tarjetas */}
                    <div className="md:hidden space-y-3">
                        {invoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="border rounded-xl p-4 bg-card"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold">{invoice.formattedNumber}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatDate(invoice.issueDate, 'short', locale)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-base">
                                        <Price value={invoice.total} currencyCode={invoice.currencyCode}/>
                                    </span>
                                    {invoice.hasPdf && (
                                        <Button nativeButton={false} render={<a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm">
                                            <Download className="h-4 w-4 mr-1"/>
                                            {tAccount('download')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Escritorio: diseño en tabla */}
                    <div className="hidden md:block border rounded-lg">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead>{t('invoiceNumber')}</TableHead>
                                    <TableHead>{t('issueDate')}</TableHead>
                                    <TableHead className="text-right">{tAccount('totalHeader')}</TableHead>
                                    <TableHead className="text-right">{tAccount('download')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{invoice.formattedNumber}</TableCell>
                                        <TableCell>{formatDate(invoice.issueDate, 'short', locale)}</TableCell>
                                        <TableCell className="text-right">
                                            <Price value={invoice.total} currencyCode={invoice.currencyCode}/>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {invoice.hasPdf && (
                                                <Button nativeButton={false} render={<a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm">
                                                    <Download className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
