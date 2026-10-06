import {LEGAL_VERSION} from '@/config/legal';
import {SITE_NAME} from '@/config/metadata';

/**
 * Descarga un texto legal como PDF sin salir de la página actual (p. ej. el checkout).
 *
 * El PDF se genera en el navegador a partir de la propia página legal publicada: se
 * pide su HTML, se lee el contenido de `#legal-content` (más el título y la fecha de
 * actualización, marcados con data-legal-title / data-legal-updated en legal-page.tsx)
 * y se compone con jsPDF. Así el único texto que se mantiene es el de la página, y el
 * PDF siempre coincide con la versión vigente (LEGAL_VERSION). jsPDF se importa solo
 * al pulsar: no pesa nada en la carga normal.
 */
export async function downloadLegalPdf(path: string): Promise<void> {
    const response = await fetch(path, {credentials: 'same-origin'});
    if (!response.ok) throw new Error(`Legal page ${path} responded ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const content = page.querySelector('#legal-content');
    const title = text(page.querySelector('[data-legal-title]'));
    if (!content || !title) throw new Error(`Legal page ${path} has no legal content`);

    const blocks = collectBlocks(content);
    const pdf = await renderPdf(title, text(page.querySelector('[data-legal-updated]')), blocks);

    const slug = path.split('/').filter(Boolean).pop() ?? 'legal';
    const url = URL.createObjectURL(pdf);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${toFileName(SITE_NAME)}-${slug}-${LEGAL_VERSION}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Safari empieza la descarga de forma asíncrona: revocar en el acto la cancela.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

type Block =
    | {kind: 'h2' | 'h3' | 'p'; text: string}
    | {kind: 'li'; text: string; marker: string};

/** Recorre el contenido legal en orden y lo reduce a títulos, párrafos y elementos de lista. */
function collectBlocks(root: Element): Block[] {
    const blocks: Block[] = [];
    const walk = (element: Element) => {
        for (const child of Array.from(element.children)) {
            const tag = child.tagName.toLowerCase();
            if (tag === 'h2' || tag === 'h3' || tag === 'p') {
                const value = text(child);
                if (value) blocks.push({kind: tag, text: value});
            } else if (tag === 'ul' || tag === 'ol') {
                Array.from(child.children).forEach((item, index) => {
                    const value = text(item);
                    if (value) blocks.push({kind: 'li', text: value, marker: tag === 'ol' ? `${index + 1}.` : '•'});
                });
            } else if (tag === 'table') {
                // Cada fila como una línea de lista: «celda · celda · celda».
                for (const row of Array.from(child.querySelectorAll('tr'))) {
                    const cells = Array.from(row.children).map(text).filter(Boolean);
                    if (cells.length) blocks.push({kind: 'li', text: cells.join(' · '), marker: '•'});
                }
            } else {
                walk(child);
            }
        }
    };
    walk(root);
    return blocks;
}

const PAGE = {margin: 20, width: 210, height: 297};
const STYLE = {
    h2: {size: 13, style: 'bold', before: 6, after: 2},
    h3: {size: 11, style: 'bold', before: 4, after: 1.5},
    p: {size: 10, style: 'normal', before: 0, after: 3},
    li: {size: 10, style: 'normal', before: 0, after: 1.5},
} as const;
const LINE_HEIGHT = 1.35;
const PT_TO_MM = 0.3528;

async function renderPdf(title: string, updated: string, blocks: Block[]): Promise<Blob> {
    const {jsPDF} = await import('jspdf');
    const doc = new jsPDF({unit: 'mm', format: 'a4'});
    const width = PAGE.width - PAGE.margin * 2;
    const bottom = PAGE.height - PAGE.margin;
    let y = PAGE.margin;

    const write = (value: string, size: number, style: string, x = PAGE.margin, maxWidth = width) => {
        doc.setFont('helvetica', style).setFontSize(size);
        const lineHeight = size * PT_TO_MM * LINE_HEIGHT;
        for (const line of doc.splitTextToSize(latin1(value), maxWidth) as string[]) {
            if (y + lineHeight > bottom) {
                doc.addPage();
                y = PAGE.margin;
            }
            doc.text(line, x, y, {baseline: 'top'});
            y += lineHeight;
        }
    };

    write(SITE_NAME.toUpperCase(), 9, 'bold');
    y += 2;
    write(title, 18, 'bold');
    if (updated) write(updated, 9, 'normal');
    y += 4;

    for (const block of blocks) {
        const style = STYLE[block.kind];
        y += style.before;
        if (block.kind === 'li') {
            doc.setFont('helvetica', 'normal').setFontSize(style.size);
            if (y + style.size * PT_TO_MM * LINE_HEIGHT > bottom) {
                doc.addPage();
                y = PAGE.margin;
            }
            doc.text(latin1(block.marker), PAGE.margin + 1, y, {baseline: 'top'});
            write(block.text, style.size, style.style, PAGE.margin + 6, width - 6);
        } else {
            write(block.text, style.size, style.style);
        }
        y += style.after;
    }

    // Pie en todas las páginas: tienda, versión y numeración.
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page).setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
        doc.text(latin1(`${SITE_NAME} · ${title} · ${LEGAL_VERSION}`), PAGE.margin, PAGE.height - 10);
        doc.text(`${page} / ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 10, {align: 'right'});
    }

    return doc.output('blob');
}

function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Las fuentes estándar de PDF (helvetica) solo cubren Latin-1: los acentos, la ñ y
 * «» salen bien, pero las comillas tipográficas, rayas o € no. Se sustituyen por su
 * equivalente más cercano en vez de dejar un carácter roto.
 */
function latin1(value: string): string {
    return value
        .replace(/[‘’‚′]/g, "'")
        .replace(/[“”„″]/g, '"')
        .replace(/[–—−]/g, '-')
        .replace(/…/g, '...')
        .replace(/€/g, 'EUR')
        .replace(/•/g, '-')
        .replace(/[^\x00-\xFF]/g, '');
}

function toFileName(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
