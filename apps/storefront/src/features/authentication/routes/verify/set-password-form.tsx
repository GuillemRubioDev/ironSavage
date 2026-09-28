'use client';

import {useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {PasswordInput} from '@/components/ui/password-input';
import {KeyRound} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {verifyAccountAction} from './actions';
import type {VerifyResultValue} from './verify-result';

interface SetPasswordFormProps {
    token: string;
    onSettled: (result: VerifyResultValue) => void;
}

/**
 * Shown when the verification link belongs to an account created by the
 * store without a password: the same token verifies the email and sets the
 * password in one step (Vendure's verifyCustomerAccount(token, password)).
 */
export function SetPasswordForm({token, onSettled}: SetPasswordFormProps) {
    const t = useTranslations('Verify.setPassword');
    const tAuth = useTranslations('Auth');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (password.length < 8) {
            setError(tAuth('passwordMinLength'));
            return;
        }
        if (password !== confirmPassword) {
            setError(tAuth('passwordsMismatch'));
            return;
        }
        setError(null);
        setPending(true);
        const result = await verifyAccountAction(token, password).catch((): VerifyResultValue => ({error: ''}));
        setPending(false);
        if (result.error !== undefined && result.error !== '') {
            // e.g. a password policy error: keep the form so they can retry.
            setError(result.error);
            return;
        }
        onSettled(result);
    }

    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex justify-center">
                    <KeyRound className="h-16 w-16 text-primary"/>
                </div>
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('message')}</p>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">{tAuth('passwordLabel')}</Label>
                        <PasswordInput
                            id="new-password"
                            autoComplete="new-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={pending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">{tAuth('confirmPasswordLabel')}</Label>
                        <PasswordInput
                            id="confirm-password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            disabled={pending}
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={pending}>
                        {pending ? t('submitting') : t('submit')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
