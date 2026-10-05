'use client'

import {ComponentProps, useTransition} from "react";
import {logoutAction} from '@/features/authentication/logout';
import {useRouter} from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';
import {User} from 'lucide-react';

interface LoginButtonProps extends ComponentProps<'button'> {
    isLoggedIn: boolean;
}

export function LoginButton({isLoggedIn, ...props}: LoginButtonProps) {
    const t = useTranslations('Navigation');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    return (
        <button {...props} aria-disabled={isPending}
                onClick={() => {
                    if (isLoggedIn) {
                        startTransition(async () => {
                            await logoutAction()
                        })
                    } else {
                        router.push('/login')
                    }
                }}>
            {isLoggedIn ? t('signOut') : (
                <>
                    {/* En el móvil solo el icono (la cabecera no tiene sitio para el texto). */}
                    <User className="size-5 lg:hidden" aria-hidden="true" />
                    <span className="sr-only lg:not-sr-only">{t('signIn')}</span>
                </>
            )}
        </button>
    )
}
