import {getActiveChannel} from '@/platform/vendure/channel';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {CurrencyPicker} from './currency-picker';

// Dinámico a propósito (sin caché): lee la cookie de moneda con
// getActiveCurrencyCode() para que el selector refleje la elección actual del usuario.
export async function CurrencyPickerWrapper() {
    const channel = await getActiveChannel();
    const activeCurrency = await getActiveCurrencyCode();

    return (
        <CurrencyPicker
            availableCurrencyCodes={channel.availableCurrencyCodes}
            activeCurrencyCode={activeCurrency}
        />
    );
}
