'use client';

import { useActionState, useEffect } from 'react';
import { requestEmailUpdateAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {useTranslations} from 'next-intl';

/**
 * Formulario del diálogo «Cambiar correo». Vendure exige la contraseña actual para
 * pedir el cambio (requestUpdateCustomerEmailAddress): así nadie con la sesión abierta
 * en otro dispositivo puede quedarse con la cuenta cambiando el correo.
 */
export function EditEmailForm({ onSuccess }: { onSuccess: () => void }) {
    const t = useTranslations('Account');
    const [state, formAction, isPending] = useActionState(requestEmailUpdateAction, undefined);

    useEffect(() => {
        if (state?.success) onSuccess();
    }, [state?.success, onSuccess]);

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="newEmailAddress">{t('newEmailAddress')}</Label>
                <Input
                    id="newEmailAddress"
                    name="newEmailAddress"
                    type="email"
                    autoComplete="email"
                    placeholder="new.email@example.com"
                    required
                    disabled={isPending}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">{t('currentPassword')}</Label>
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                    {t('confirmPasswordChange')}
                </p>
            </div>
            {state?.error && (
                <div className="text-sm text-destructive">
                    {state.error}
                </div>
            )}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? t('updating') : t('updateEmail')}
            </Button>
        </form>
    );
}
