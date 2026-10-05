'use client';

import { useActionState, useEffect } from 'react';
import { updatePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {useTranslations} from 'next-intl';

/** Formulario del diálogo «Cambiar contraseña». */
export function ChangePasswordForm({ onSuccess }: { onSuccess: () => void }) {
    const t = useTranslations('Account');
    const [state, formAction, isPending] = useActionState(updatePasswordAction, undefined);

    useEffect(() => {
        if (state?.success) onSuccess();
    }, [state?.success, onSuccess]);

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
                <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                />
            </div>
            {state?.error && (
                <div className="text-sm text-destructive">
                    {state.error}
                </div>
            )}
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? t('updating') : t('updatePassword')}
            </Button>
        </form>
    );
}
