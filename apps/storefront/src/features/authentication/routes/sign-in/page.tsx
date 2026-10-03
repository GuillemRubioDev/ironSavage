import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {LoginForm} from "./login-form";
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {Logo} from "@/components/brand/logo";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('pageTitle'),
    };
}

function LoginFormSkeleton() {
    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-12"/>
                    <Skeleton className="h-10 w-full"/>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16"/>
                    <Skeleton className="h-10 w-full"/>
                </div>
                <Skeleton className="h-10 w-full"/>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">

                <div className="flex flex-col items-center space-y-2">
                    <Skeleton className="h-4 w-40"/>
                </div>
            </CardFooter>
        </Card>
    );
}

async function SignInContent({searchParams}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <LoginForm redirectTo={redirectTo}/>;
}

export default async function SignInPage({searchParams}: PageProps<'/[locale]/login'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <div className="flex min-h-[calc(100vh-var(--header-offset))]">
            {/* Panel de marca, solo escritorio. Fondo oscuro fijo (no depende del
                tema): las letras rojas del logo necesitan un fondo oscuro o neutro
                para contrastar, no el degradado rojo que tenía antes. */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[oklch(0.13_0.004_260)] items-center justify-center p-12 rounded-br-3xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.577_0.245_27.325_/_25%),transparent)]" />
                <div className="relative max-w-md space-y-6">
                    <Logo variant="full" className="h-40 w-auto" />
                    <p className="text-xl text-white/80 leading-relaxed">
                        {t('welcomeBack')}
                    </p>
                    <div className="flex gap-8 pt-4">
                        <div>
                            <p className="text-3xl font-bold text-white">{t('featureFast')}</p>
                            <p className="text-sm text-white/70">{t('featureCheckout')}</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{t('featureSecure')}</p>
                            <p className="text-sm text-white/70">{t('featurePayments')}</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{t('featureEasy')}</p>
                            <p className="text-sm text-white/70">{t('featureReturns')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel del formulario */}
            <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-12">
                <div className="w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <Logo variant="wordmark" className="h-6 mx-auto lg:hidden" />
                        <h1 className="text-3xl font-bold">{t('signIn')}</h1>
                        <p className="text-muted-foreground">
                            {t('enterCredentials')}
                        </p>
                    </div>
                    <Suspense fallback={<LoginFormSkeleton/>}>
                        <SignInContent searchParams={searchParams}/>
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
