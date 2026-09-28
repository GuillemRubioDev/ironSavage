import { api, Badge, Button, Input, Label } from '@vendure/dashboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    customerAccountStatusDocument,
    sendCustomerPasswordResetEmailDocument,
    sendCustomerVerificationEmailDocument,
    setCustomerPasswordDocument,
    verifyCustomerAccountManuallyDocument,
} from './graphql';

type Panel = 'none' | 'verify' | 'password';
type VerifyMode = 'temporary' | 'email' | 'keep';
type Action =
    | { kind: 'verificationEmail' }
    | { kind: 'verify'; password?: string }
    | { kind: 'setPassword'; password: string }
    | { kind: 'passwordEmail' };

// No 0/O/1/l/I: temporary passwords are often read out or copied by hand.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generateTemporaryPassword(length = 12): string {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

/**
 * Login status of a customer plus the fixes an admin can apply. Lives on
 * the Customer detail page: it applies to every customer, athletes included
 * (an athlete is a customer).
 *
 * Note: this renders inside the Customer page's own <form> (its "Update"
 * button), so it must never use a <form> or a submit button itself — a
 * nested form is ignored by the browser and the click would submit the
 * customer form instead. Everything here is `type="button"` + onClick.
 */
export function CustomerAccountAccess({ customerId }: { customerId: string }) {
    const queryClient = useQueryClient();
    const queryKey = ['customer-account-status', customerId];
    const [panel, setPanel] = useState<Panel>('none');
    const [verifyMode, setVerifyMode] = useState<VerifyMode>('temporary');
    const [password, setPassword] = useState('');

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.query(customerAccountStatusDocument, { customerId }),
        enabled: !!customerId,
    });
    const status = data?.customerAccountStatus;

    const mutation = useMutation({
        mutationFn: async (action: Action): Promise<string> => {
            const email = status?.emailAddress;
            if (action.kind === 'verificationEmail') {
                const r = (await api.mutate(sendCustomerVerificationEmailDocument, { customerId })).sendCustomerVerificationEmail;
                if (r.__typename === 'CustomerAccountError') throw new Error(r.message);
                return `Activation email sent to ${email}`;
            }
            if (action.kind === 'verify') {
                const r = (await api.mutate(verifyCustomerAccountManuallyDocument, { customerId, password: action.password ?? null }))
                    .verifyCustomerAccountManually;
                if (r.__typename === 'CustomerAccountError') throw new Error(r.message);
                if (action.password) return 'Account verified with the temporary password. Share it with the customer.';
                return r.passwordSetupEmailSent
                    ? `Account verified. ${email} was emailed a link to choose a password.`
                    : 'Account verified — the customer can sign in with their password.';
            }
            if (action.kind === 'setPassword') {
                const r = (await api.mutate(setCustomerPasswordDocument, { customerId, password: action.password })).setCustomerPassword;
                if (r.__typename === 'CustomerAccountError') throw new Error(r.message);
                return 'Password changed. The customer was signed out of all devices.';
            }
            const r = (await api.mutate(sendCustomerPasswordResetEmailDocument, { customerId })).sendCustomerPasswordResetEmail;
            if (r.__typename === 'CustomerAccountError') throw new Error(r.message);
            return `Password email sent to ${email}`;
        },
        onSuccess: async message => {
            toast(message);
            setPanel('none');
            setPassword('');
            await queryClient.invalidateQueries({ queryKey });
        },
        onError: error => toast('Action failed', { description: error instanceof Error ? error.message : 'Unknown error' }),
    });

    if (isLoading || !status) {
        return null;
    }

    const busy = mutation.isPending;
    const badge = !status.hasUser
        ? { label: 'No login (guest)', variant: 'outline' as const }
        : status.verified
          ? { label: 'Verified', variant: 'default' as const }
          : { label: 'Not verified', variant: 'secondary' as const };

    function openPanel(next: Panel) {
        setPanel(next);
        setPassword('');
        setVerifyMode('temporary');
    }

    const passwordField = (
        <div className="space-y-1">
            <Label htmlFor={`account-password-${customerId}`} className="text-xs">
                Temporary password
            </Label>
            <div className="flex gap-1">
                <Input
                    id={`account-password-${customerId}`}
                    type="text"
                    autoComplete="off"
                    className="font-mono"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    // Enter would submit the surrounding Customer form ("Update").
                    onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                    placeholder="8+ chars"
                />
                <Button type="button" size="icon" variant="outline" title="Generate" onClick={() => setPassword(generateTemporaryPassword())}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="Copy"
                    disabled={!password}
                    onClick={() => {
                        void navigator.clipboard?.writeText(password);
                        toast('Password copied');
                    }}
                >
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Give it to the customer; they can change it anytime from their account (My account → Profile).
            </p>
        </div>
    );

    return (
        <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {status.hasUser && (
                    <span className="text-xs text-muted-foreground">{status.hasPassword ? 'Password set' : 'No password yet'}</span>
                )}
            </div>
            {status.lastLogin && (
                <p className="text-xs text-muted-foreground">Last sign-in: {new Date(status.lastLogin).toLocaleString()}</p>
            )}
            {!status.hasUser && <p className="text-xs text-muted-foreground">This customer only bought as a guest and has no login yet.</p>}

            {panel === 'verify' && (
                <div className="rounded-md border p-3 space-y-3">
                    <p className="text-xs font-medium">Verify this account now</p>
                    <div className="space-y-2 text-xs">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="radio" checked={verifyMode === 'temporary'} onChange={() => setVerifyMode('temporary')} />
                            <span>Set a temporary password (the customer can sign in right away)</span>
                        </label>
                        {status.hasPassword ? (
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input type="radio" checked={verifyMode === 'keep'} onChange={() => setVerifyMode('keep')} />
                                <span>Keep the password the customer already chose</span>
                            </label>
                        ) : (
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input type="radio" checked={verifyMode === 'email'} onChange={() => setVerifyMode('email')} />
                                <span>Email the customer a link to choose their own password</span>
                            </label>
                        )}
                    </div>
                    {verifyMode === 'temporary' && passwordField}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy || (verifyMode === 'temporary' && password.length < 8)}
                            onClick={() => mutation.mutate({ kind: 'verify', password: verifyMode === 'temporary' ? password : undefined })}
                        >
                            {busy ? 'Verifying…' : 'Verify'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setPanel('none')}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {panel === 'password' && (
                <div className="rounded-md border p-3 space-y-3">
                    <p className="text-xs font-medium">Change password</p>
                    {passwordField}
                    <p className="text-xs text-muted-foreground">The customer will be signed out of all their devices.</p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy || password.length < 8}
                            onClick={() => mutation.mutate({ kind: 'setPassword', password })}
                        >
                            {busy ? 'Saving…' : 'Save password'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setPanel('none')}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {panel === 'none' && (
                <div className="flex flex-col gap-2">
                    {!status.verified && (
                        <Button type="button" size="sm" disabled={busy} onClick={() => openPanel('verify')}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Verify now
                        </Button>
                    )}
                    {!status.verified && (
                        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => mutation.mutate({ kind: 'verificationEmail' })}>
                            <MailCheck className="mr-2 h-4 w-4" />
                            {status.hasUser ? 'Resend activation email' : 'Create login & send activation email'}
                        </Button>
                    )}
                    {status.hasUser && (
                        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => openPanel('password')}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Change password
                        </Button>
                    )}
                    {status.hasUser && (
                        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => mutation.mutate({ kind: 'passwordEmail' })}>
                            <MailCheck className="mr-2 h-4 w-4" />
                            {status.hasPassword ? 'Send password reset email' : 'Send "create your password" email'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
