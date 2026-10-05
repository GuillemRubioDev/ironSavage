'use client';

import {useCallback, useState} from 'react';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Separator} from '@/components/ui/separator';
import {EditEmailForm} from './edit-email-form';
import {ChangePasswordForm} from './change-password-form';

type Editing = 'email' | 'password' | null;

/**
 * Correo y contraseña como filas de solo lectura con «Cambiar»: los campos de
 * contraseña solo aparecen dentro del diálogo del cambio que se esté haciendo, en vez
 * de cuatro campos de contraseña siempre visibles en la página. El formulario se
 * monta solo con el diálogo abierto, así que cada vez empieza vacío y sin errores.
 */
export function AccountAccessCard({email}: {email: string}) {
    const t = useTranslations('Account');
    const [editing, setEditing] = useState<Editing>(null);

    const close = useCallback(() => setEditing(null), []);
    const onEmailRequested = useCallback(() => {
        setEditing(null);
        toast.success(t('verificationEmailSent'));
    }, [t]);
    const onPasswordUpdated = useCallback(() => {
        setEditing(null);
        toast.success(t('passwordUpdated'));
    }, [t]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('accountAccess')}</CardTitle>
                <CardDescription>{t('accountAccessDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-medium">{t('emailAddress')}</p>
                        <p className="truncate text-sm text-muted-foreground">{email}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing('email')}>
                        {t('change')}
                    </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium">{t('password')}</p>
                        <p className="text-sm text-muted-foreground" aria-hidden="true">••••••••</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing('password')}>
                        {t('change')}
                    </Button>
                </div>
            </CardContent>

            <Dialog open={editing === 'email'} onOpenChange={(open) => !open && close()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('changeEmail')}</DialogTitle>
                        <DialogDescription>{t('updateEmailDescription')}</DialogDescription>
                    </DialogHeader>
                    <EditEmailForm onSuccess={onEmailRequested} />
                </DialogContent>
            </Dialog>

            <Dialog open={editing === 'password'} onOpenChange={(open) => !open && close()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('changePassword')}</DialogTitle>
                        <DialogDescription>{t('changePasswordDescription')}</DialogDescription>
                    </DialogHeader>
                    <ChangePasswordForm onSuccess={onPasswordUpdated} />
                </DialogContent>
            </Dialog>
        </Card>
    );
}
