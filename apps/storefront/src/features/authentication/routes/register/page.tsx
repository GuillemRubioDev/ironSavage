import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import { RegistrationForm } from "./registration-form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {Logo} from "@/site/brand/logo";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('createAccount'),
    };
}

function RegistrationFormSkeleton() {
    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 mt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-44 mx-auto" />
            </CardFooter>
        </Card>
    );
}

async function RegisterContent({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    return <RegistrationForm redirectTo={redirectTo} />;
}

export default async function RegisterPage({searchParams}: PageProps<'/[locale]/registro'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});

    return (
        <div className="flex min-h-[calc(100vh-var(--header-offset))]">
            {/* Branded panel - desktop only. Fixed dark background (not
                theme-reactive): the logo's own red lettering needs a
                dark/neutral backdrop for contrast, not the red primary
                gradient this used to have. */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[oklch(0.13_0.004_260)] items-center justify-center p-12 rounded-br-3xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.577_0.245_27.325_/_25%),transparent)]" />
                <div className="relative max-w-md space-y-6">
                    <Logo variant="full" className="h-40 w-auto" />
                    <p className="text-xl text-white/80 leading-relaxed">
                        {t('joinUs')}
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

            {/* Form panel */}
            <div className="flex w-full lg:w-1/2 items-center justify-center px-4 py-12">
                <div className="w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <Logo variant="wordmark" className="h-6 mx-auto lg:hidden" />
                        <h1 className="text-3xl font-bold">{t('createAccount')}</h1>
                        <p className="text-muted-foreground">
                            {t('signUpMessage')}
                        </p>
                    </div>
                    <Suspense fallback={<RegistrationFormSkeleton />}>
                        <RegisterContent searchParams={searchParams} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
