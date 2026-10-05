'use client';

import {useTransition} from 'react';
import {RotateCcw} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/platform/i18n/navigation';
import {repeatLastOrder} from '@/features/account/repeat-last-order';

/** Acceso rápido "Repetir último pedido": añade sus productos al carrito y lleva al carrito. */
export function RepeatLastOrderButton() {
    const t = useTranslations('Account.repeat');
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const run = () => startTransition(async () => {
        try {
            const result = await repeatLastOrder();
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            if (result.added === 0) {
                toast.error(t('nothingAdded'));
                return;
            }
            toast.success(t('added', {count: result.added}));
            if (result.skipped.length) toast.warning(t('skipped', {names: result.skipped.join(', ')}));
            router.push('/carrito');
        } catch {
            toast.error(t('error'));
        }
    });

    return (
        <button
            type="button"
            onClick={run}
            disabled={pending}
            aria-busy={pending}
            className="hover-lift flex flex-col items-start gap-2 rounded-lg border border-primary-solid bg-primary-solid/5 p-4 text-left text-sm font-semibold transition-colors hover:bg-primary-solid/10 disabled:opacity-60"
        >
            <RotateCcw className="size-5 text-primary-solid" aria-hidden="true" />
            {t('button')}
        </button>
    );
}
