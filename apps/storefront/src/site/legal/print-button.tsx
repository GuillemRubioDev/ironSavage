'use client';

import {Printer} from 'lucide-react';
import {Button} from '@/components/ui/button';

/**
 * Abre el diálogo de impresión del navegador, que también ofrece «Guardar como PDF»:
 * así los clientes guardan una copia de los textos legales que aceptan (el art. 27.4
 * de la LSSI-CE exige que las condiciones se puedan almacenar y reproducir). La
 * cabecera, el pie y el banner de cookies se ocultan al imprimir (`print:hidden`).
 */
export function PrintButton({label}: {label: string}) {
    return (
        <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
            <Printer />
            {label}
        </Button>
    );
}
