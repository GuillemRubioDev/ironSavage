import { Trans, useLingui } from '@lingui/react/macro';
import {
    api,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    FullWidthPageBlock,
    Input,
    Label,
    Page,
    PageLayout,
    PageTitle,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Textarea,
} from '@vendure/dashboard';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { AthleteCodeForm, AthleteCodeFormValue, EMPTY_CODE_FORM, formValueToInput } from './athlete-code-form';
import { athleteCustomerByIdDocument, athleteCustomerSearchDocument, createAthleteDocument } from './graphql';

type Mode = 'existing' | 'new';

/** Convert an existing customer into an athlete, or create the customer at the same time. */
export function AthleteNewPage() {
    const { t } = useLingui();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<Mode>('existing');
    const [searchTerm, setSearchTerm] = useState('');
    const [submittedTerm, setSubmittedTerm] = useState('');
    // Coming from a customer's page ("Make athlete"): that customer is preselected.
    const preselectedCustomerId = (useSearch({ strict: false }) as { customerId?: string }).customerId;
    const [customerId, setCustomerId] = useState<string | null>(preselectedCustomerId ?? null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [withCode, setWithCode] = useState(true);
    const [code, setCode] = useState<AthleteCodeFormValue>(EMPTY_CODE_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: searchData, isLoading: isSearching } = useQuery({
        queryKey: ['athlete-customer-search', submittedTerm],
        queryFn: () => api.query(athleteCustomerSearchDocument, { term: submittedTerm }),
        enabled: submittedTerm.length > 0,
    });
    const customers = searchData?.customers.items ?? [];
    const { data: selectedData } = useQuery({
        queryKey: ['athlete-customer-by-id', customerId],
        queryFn: () => api.query(athleteCustomerByIdDocument, { id: customerId! }),
        enabled: !!customerId,
    });
    const selectedCustomer = selectedData?.customer;

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const result = await api.mutate(createAthleteDocument, {
                input: {
                    ...(mode === 'existing'
                        ? { customerId }
                        : { customer: { firstName, lastName, emailAddress, phoneNumber: phoneNumber || undefined } }),
                    enabled,
                    notes: notes || null,
                    code: withCode ? formValueToInput(code) : undefined,
                },
            });
            const payload = result.createAthlete;
            if (payload.__typename !== 'Athlete') {
                setError(payload.message);
                return;
            }
            await queryClient.invalidateQueries({ queryKey: ['athlete-list'] });
            void navigate({ to: '/athletes/$id', params: { id: payload.id } });
        } catch (err) {
            setError(err instanceof Error ? err.message : t`Something went wrong while saving.`);
        } finally {
            setSaving(false);
        }
    }

    const canSave = mode === 'existing' ? !!customerId : !!(firstName.trim() && lastName.trim() && emailAddress.trim());

    return (
        <Page pageId="athlete-new">
            <PageTitle>
                <Trans>New athlete</Trans>
            </PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="athlete-customer">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Trans>Customer</Trans>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')}>
                                    <Trans>Convert an existing customer</Trans>
                                </Button>
                                <Button variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')}>
                                    <Trans>Create a new customer</Trans>
                                </Button>
                            </div>

                            {mode === 'existing' ? (
                                <>
                                    <form
                                        className="flex gap-2"
                                        onSubmit={e => {
                                            e.preventDefault();
                                            setCustomerId(null);
                                            setSubmittedTerm(searchTerm.trim());
                                        }}
                                    >
                                        <Input
                                            placeholder={t`Search by name or email...`}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="max-w-sm"
                                        />
                                        <Button type="submit" variant="outline">
                                            <Search className="mr-2 h-4 w-4" />
                                            <Trans>Search</Trans>
                                        </Button>
                                    </form>
                                    {selectedCustomer && (
                                        <p className="text-sm">
                                            <Trans>Selected customer:</Trans>{' '}
                                            <span className="font-medium">
                                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                                            </span>{' '}
                                            <span className="text-muted-foreground">({selectedCustomer.emailAddress})</span>
                                        </p>
                                    )}
                                    {isSearching && (
                                        <p className="text-sm text-muted-foreground">
                                            <Trans>Searching…</Trans>
                                        </p>
                                    )}
                                    {submittedTerm && !isSearching && (
                                        <div className="border rounded-lg">
                                            <Table>
                                                <TableBody>
                                                    {customers.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell className="h-16 text-center text-muted-foreground">
                                                                <Trans>No customers found.</Trans>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        customers.map(customer => (
                                                            <TableRow
                                                                key={customer.id}
                                                                className={customer.id === customerId ? 'bg-accent/50' : undefined}
                                                            >
                                                                <TableCell className="font-medium">
                                                                    {customer.firstName} {customer.lastName}
                                                                </TableCell>
                                                                <TableCell className="text-muted-foreground">{customer.emailAddress}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button size="sm" variant="outline" onClick={() => setCustomerId(customer.id)}>
                                                                        {customer.id === customerId ? <Trans>Selected</Trans> : <Trans>Select</Trans>}
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="firstName">
                                            <Trans>First name</Trans>
                                        </Label>
                                        <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="lastName">
                                            <Trans>Last name</Trans>
                                        </Label>
                                        <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="email">
                                            <Trans>Email</Trans>
                                        </Label>
                                        <Input id="email" type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="phone">
                                            <Trans>Phone (optional)</Trans>
                                        </Label>
                                        <Input id="phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                                    </div>
                                    <p className="text-xs text-muted-foreground md:col-span-2">
                                        <Trans>
                                            An activation email is sent to this address: from that link the athlete verifies the email
                                            and chooses their password. If it doesn't arrive, resend it (or verify the account directly)
                                            from "Account access" on the customer page.
                                        </Trans>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>

                <FullWidthPageBlock blockId="athlete-settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Trans>Athlete settings</Trans>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                                <Label>
                                    <Trans>Athlete active</Trans>
                                </Label>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="notes">
                                    <Trans>Internal notes</Trans>
                                </Label>
                                <Textarea
                                    id="notes"
                                    rows={3}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={t`Sport, agreement details… (never shown to the athlete)`}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch checked={withCode} onCheckedChange={setWithCode} />
                                <Label>
                                    <Trans>Create a promotional code now</Trans>
                                </Label>
                            </div>
                            {withCode && (
                                <AthleteCodeForm initialValue={EMPTY_CODE_FORM} submitLabel="" onSubmit={() => undefined} fieldsOnly onChange={setCode} />
                            )}
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <Button onClick={save} disabled={!canSave || saving}>
                                {saving ? <Trans>Creating…</Trans> : <Trans>Create athlete</Trans>}
                            </Button>
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}
