'use client';

import {Printer} from 'lucide-react';
import {Button} from '@/components/ui/button';

/**
 * Opens the browser's print dialog, which also offers "Save as PDF" — the
 * way customers keep a copy of the legal texts they accept (LSSI-CE art. 27.4
 * requires the contract terms to be storable and reproducible). The site's
 * header, footer and cookie banner are hidden in print (`print:hidden`).
 */
export function PrintButton({label}: {label: string}) {
    return (
        <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
            <Printer />
            {label}
        </Button>
    );
}
