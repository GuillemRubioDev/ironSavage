'use client';

import {use, useEffect, useRef, useState} from 'react';
import {VerifyResult, type VerifyResultValue} from './verify-result';
import {VerifyLoading} from './verify-loading';
import {verifyAccountAction} from './actions';
import {SetPasswordForm} from './set-password-form';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import { Link } from '@/platform/i18n/navigation';
import {XCircle} from 'lucide-react';
import {useTranslations} from 'next-intl';

interface VerifyContentProps {
    searchParams: Promise<{ token?: string }>;
}

export function VerifyContent({searchParams}: VerifyContentProps) {
    const t = useTranslations('Verify');
    const params = use(searchParams);
    const token = params.token;
    // Los tokens de verificación son de un solo uso. Se guarda cada petición para que
    // repetir el efecto o volver a un token ya visto no lo envíe dos veces.
    const requests = useRef(new Map<string, Promise<VerifyResultValue>>());
    const [settled, setSettled] = useState<{token: string; result: VerifyResultValue}>();

    useEffect(() => {
        if (!token) return;

        let request = requests.current.get(token);
        if (!request) {
            // La acción informa de sus propios fallos; esto solo rechaza cuando la
            // petición en sí no llega a completarse.
            request = verifyAccountAction(token).catch(
                (): VerifyResultValue => ({error: ''}),
            );
            requests.current.set(token, request);
        }

        let active = true;
        request.then(result => {
            if (active) setSettled({token, result});
        });
        return () => {
            active = false;
        };
    }, [token]);

    if (!token) {
        return (
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-center">
                        <XCircle className="h-16 w-16 text-destructive"/>
                    </div>
                    <div className="space-y-2 text-center">
                        <h1 className="text-2xl font-bold">{t('invalidLink')}</h1>
                        <p className="text-muted-foreground">
                            {t('invalidLinkMessage')}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Link href="/registro" className="block">
                            <Button variant="outline" className="w-full">
                                {t('createNewAccount')}
                            </Button>
                        </Link>
                        <Link href="/login" className="block">
                            <Button variant="ghost" className="w-full">
                                {t('backToSignIn')}
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (settled?.token !== token) {
        return <VerifyLoading/>;
    }
    if (settled.result.needsPassword) {
        return <SetPasswordForm token={token} onSettled={result => setSettled({token, result})}/>;
    }
    return <VerifyResult result={settled.result}/>;
}
