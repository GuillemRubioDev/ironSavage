'use server';

import {mutate} from '@/platform/vendure/api';
import {RegisterCustomerAccountMutation} from '@/features/authentication/graphql';
import {redirect} from '@/platform/i18n/navigation';
import {getLocale, getTranslations} from 'next-intl/server';

export async function registerAction(prevState: { error?: string } | undefined, formData: FormData) {
    const t = await getTranslations('Errors');
    const emailAddress = formData.get('emailAddress') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const password = formData.get('password') as string;
    const termsAccepted = formData.get('termsAccepted') as string | null;
    const redirectTo = formData.get('redirectTo') as string | null;

    if (!emailAddress || !password) {
        return {error: t('emailPasswordRequired')};
    }
    if (!firstName) {
        return {error: t('firstNameRequired')};
    }
    // The client already blocks submission without this checked — this is
    // only a backstop against a request built by hand, bypassing the form.
    if (termsAccepted !== 'true') {
        return {error: t('termsRequired')};
    }


    const result = await mutate(RegisterCustomerAccountMutation, {
        input: {
            emailAddress,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phoneNumber: phoneNumber || undefined,
            password,
        }
    });

    const registerResult = result.data.registerCustomerAccount;

    if (registerResult.__typename !== 'Success') {
        return {error: registerResult.message};
    }

    // Redirect to verification pending page, preserving redirectTo if present
    const verifyUrl = redirectTo
        ? `/verify-pending?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/verify-pending';

    const locale = await getLocale();
    redirect({href: verifyUrl, locale});

}
