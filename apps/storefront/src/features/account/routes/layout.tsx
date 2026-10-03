import type {Metadata} from 'next';
import {Suspense} from 'react';
import {noIndexRobots} from '@/config/metadata';
import {AccountNav} from '@/features/account/components/account-nav';

export const metadata: Metadata = {
    robots: noIndexRobots(),
};

export default async function AccountLayout({children}: LayoutProps<'/[locale]/mi-cuenta'>) {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Móvil: barra de pestañas horizontal */}
            <div className="md:hidden mb-6">
                <Suspense>
                    <AccountNav layout="horizontal" />
                </Suspense>
            </div>

            <div className="flex gap-8">
                {/* Escritorio: barra lateral */}
                <aside className="hidden md:block w-64 shrink-0">
                    <Suspense>
                        <AccountNav layout="vertical" />
                    </Suspense>
                </aside>
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
