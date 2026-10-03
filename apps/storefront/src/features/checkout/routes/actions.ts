'use server';

import {mutate} from '@/platform/vendure/api';
import {SetOrderShippingAddressMutation, SetOrderBillingAddressMutation, SetOrderShippingMethodMutation, AddPaymentToOrderMutation, TransitionOrderToStateMutation, SetCustomerForOrderMutation, CreateRedsysPaymentFormMutation, AcceptTermsForActiveOrderMutation} from '@/features/checkout/graphql';
import {LEGAL_VERSION} from '@/config/legal';
import {CreateCustomerAddressMutation} from '@/features/account/graphql';
import {revalidatePath, updateTag} from 'next/cache';
import {redirect} from '@/platform/i18n/navigation';
import {getLocale} from 'next-intl/server';

interface AddressInput {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phoneNumber: string;
    company?: string;
}

export async function setShippingAddress(
    shippingAddress: AddressInput,
    useSameForBilling: boolean
) {
    const shippingResult = await mutate(
        SetOrderShippingAddressMutation,
        {input: shippingAddress},
        {useAuthToken: true}
    );

    if (shippingResult.data.setOrderShippingAddress.__typename !== 'Order') {
        throw new Error('Failed to set shipping address');
    }

    if (useSameForBilling) {
        await mutate(
            SetOrderBillingAddressMutation,
            {input: shippingAddress},
            {useAuthToken: true}
        );
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function setShippingMethod(shippingMethodId: string) {
    const result = await mutate(
        SetOrderShippingMethodMutation,
        {shippingMethodId: [shippingMethodId]},
        {useAuthToken: true}
    );

    if (result.data.setOrderShippingMethod.__typename !== 'Order') {
        throw new Error('Failed to set shipping method');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export async function createCustomerAddress(address: AddressInput) {
    const result = await mutate(
        CreateCustomerAddressMutation,
        {input: address},
        {useAuthToken: true}
    );

    if (!result.data.createCustomerAddress) {
        throw new Error('Failed to create customer address');
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
    return result.data.createCustomerAddress;
}

/**
 * The customer ticked "I accept the terms" and clicked "Pagar pedido": store
 * that acceptance (server time + LEGAL_VERSION) on the order. The server
 * refuses to move a storefront order to payment without it.
 */
async function acceptTerms(termsAccepted: boolean) {
    if (termsAccepted !== true) {
        throw new Error('The terms and conditions must be accepted before paying');
    }
    await mutate(AcceptTermsForActiveOrderMutation, {version: LEGAL_VERSION}, {useAuthToken: true});
}

export async function transitionToArrangingPayment() {
    const result = await mutate(
        TransitionOrderToStateMutation,
        {state: 'ArrangingPayment'},
        {useAuthToken: true}
    );

    if (result.data.transitionOrderToState?.__typename === 'OrderStateTransitionError') {
        const errorResult = result.data.transitionOrderToState;
        // A retry (e.g. the customer went back after a declined/cancelled Redsys
        // attempt, or double-clicked) finds the order already in ArrangingPayment.
        // Vendure's state machine rejects a state->itself "transition", but that's
        // exactly the state this function is trying to ensure — treat it as success
        // rather than surfacing a spurious error.
        const alreadyThere = errorResult.fromState === 'ArrangingPayment' && errorResult.toState === 'ArrangingPayment';
        if (!alreadyThere) {
            throw new Error(
                `Failed to transition order state: ${errorResult.errorCode} - ${errorResult.message}`
            );
        }
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/checkout`);
}

export interface RedsysPaymentForm {
    url: string;
    signatureVersion: string;
    merchantParameters: string;
    signature: string;
}

/**
 * Redsys is a redirect gateway: unlike `placeOrder`, this does not call
 * addPaymentToOrder — it only asks the backend for a signed redirect form.
 * The order is only actually paid once Redsys' server-to-server notification
 * has been verified (see RedsysPlugin), so the order must stay retryable
 * (ArrangingPayment) until then.
 */
export async function getRedsysPaymentForm(termsAccepted: boolean): Promise<
    {success: true; form: RedsysPaymentForm} | {success: false; error: string}
> {
    await acceptTerms(termsAccepted);
    await transitionToArrangingPayment();

    const result = await mutate(CreateRedsysPaymentFormMutation, {}, {useAuthToken: true});
    const data = result.data.createRedsysPaymentForm;

    if (data.__typename !== 'RedsysPaymentForm') {
        return {success: false, error: data.message};
    }

    return {
        success: true,
        form: {
            url: data.url,
            signatureVersion: data.signatureVersion,
            merchantParameters: data.merchantParameters,
            signature: data.signature,
        },
    };
}

export async function placeOrder(paymentMethodCode: string, termsAccepted: boolean) {
    await acceptTerms(termsAccepted);
    // Then, transition the order to ArrangingPayment state
    await transitionToArrangingPayment();

    // Prepare metadata based on payment method
    const metadata: Record<string, unknown> = {};

    // For standard payment, include the required fields
    if (paymentMethodCode === 'standard-payment') {
        metadata.shouldDecline = false;
        metadata.shouldError = false;
        metadata.shouldErrorOnSettle = false;
    }

    // Add payment to the order
    const result = await mutate(
        AddPaymentToOrderMutation,
        {
            input: {
                method: paymentMethodCode,
                metadata,
            },
        },
        {useAuthToken: true}
    );

    if (result.data.addPaymentToOrder.__typename !== 'Order') {
        const errorResult = result.data.addPaymentToOrder;
        throw new Error(
            `Failed to place order: ${errorResult.errorCode} - ${errorResult.message}`
        );
    }

    const orderCode = result.data.addPaymentToOrder.code;

    // Update the cart tag to immediately invalidate cached cart data
    updateTag('cart');
    updateTag('active-order');

    const locale = await getLocale();
    redirect({href: `/order-confirmation/${orderCode}`, locale});
}

interface GuestCustomerInput {
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export type SetCustomerForOrderResult =
    | { success: true }
    | { success: false; errorCode: 'EMAIL_CONFLICT'; message: string }
    | { success: false; errorCode: 'GUEST_CHECKOUT_DISABLED'; message: string }
    | { success: false; errorCode: 'NO_ACTIVE_ORDER'; message: string }
    | { success: false; errorCode: 'UNKNOWN'; message: string };

export async function setCustomerForOrder(
    input: GuestCustomerInput
): Promise<SetCustomerForOrderResult> {
    const result = await mutate(
        SetCustomerForOrderMutation,
        { input },
        { useAuthToken: true }
    );

    const response = result.data.setCustomerForOrder;

    switch (response.__typename) {
        case 'Order': {
            const locale = await getLocale();
            revalidatePath(`/${locale}/checkout`);
            return { success: true };
        }
        case 'AlreadyLoggedInError':
            return { success: true };
        case 'EmailAddressConflictError':
            return { success: false, errorCode: 'EMAIL_CONFLICT', message: response.message };
        case 'GuestCheckoutError':
            return { success: false, errorCode: 'GUEST_CHECKOUT_DISABLED', message: response.message };
        case 'NoActiveOrderError':
            return { success: false, errorCode: 'NO_ACTIVE_ORDER', message: response.message };
        default:
            return { success: false, errorCode: 'UNKNOWN', message: 'Unknown error' };
    }
}
