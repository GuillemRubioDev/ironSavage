import {Fragment, type ReactNode} from 'react';
import {getTranslations} from 'next-intl/server';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';

export interface FoodInformationData {
    isFoodSupplement?: boolean | null;
    foodIngredients?: string | null;
    foodAllergens?: string | null;
    foodNutrition?: string | null;
    foodDirections?: string | null;
    foodWarnings?: string | null;
    foodStorage?: string | null;
    foodOrigin?: string | null;
    foodOperator?: string | null;
}

/** Las palabras en mayúsculas (≥ 2 letras) son alérgenos por convención: se muestran en negrita (Reg. 1169/2011 art. 21). */
function highlightAllergens(text: string): ReactNode[] {
    return text.split(/(\b[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})*\b)/u).map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
}

/**
 * Líneas "Nutriente | por 100 g | por dosis" → filas de tabla. La primera fila es
 * cabecera cuando nombra las columnas ("Nutriente…", "Por 100 g", "Per serving") en
 * vez de llevar un valor.
 */
function parseNutrition(text: string): {header: string[] | null; rows: string[][]} | null {
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split('|').map((c) => c.trim()));
    if (!rows.length || rows.every((r) => r.length < 2)) return null;
    const [first] = rows;
    const looksLikeHeader = /^(nutriente|nutrient|informaci[oó]n|valor(es)? medio|typical values)/i.test(first[0])
        || first.slice(1).some((c) => /^(por|per)( |$)/i.test(c));
    const header = looksLikeHeader ? first : null;
    return {header, rows: header ? rows.slice(1) : rows};
}

const text = 'text-sm leading-relaxed text-muted-foreground whitespace-pre-line';

/**
 * Desplegables de la ficha: descripción (abierta) e información alimentaria
 * obligatoria (Reg. (UE) 1169/2011 art. 14: disponible antes de comprar). El
 * contenido se monta aunque el desplegable esté cerrado (keepMounted), así que está
 * siempre en la página. Solo aparecen los bloques rellenos; en los complementos
 * alimenticios se añaden siempre las advertencias del RD 1487/2009.
 */
export async function ProductDetails({locale, description, data}: {locale: string; description: string; data: FoodInformationData}) {
    const t = await getTranslations({locale, namespace: 'Product.food'});
    const nutrition = data.foodNutrition?.trim() ? parseNutrition(data.foodNutrition) : null;
    const other = [data.foodOrigin?.trim() && `${t('origin')}: ${data.foodOrigin}`, data.foodOperator?.trim() && `${t('operator')}: ${data.foodOperator}`].filter(Boolean).join('\n');

    const items: Array<{value: string; title: string; body: ReactNode}> = [];
    if (description.trim()) {
        items.push({value: 'description', title: t('description'), body: <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{__html: description}} />});
    }
    if (data.foodNutrition?.trim()) {
        items.push({
            value: 'nutrition',
            title: t('nutrition'),
            body: nutrition ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        {nutrition.header && (
                            <thead>
                                <tr>{nutrition.header.map((h, i) => <th key={i} scope="col" className="border-b py-2 pr-4 text-left font-semibold">{h}</th>)}</tr>
                            </thead>
                        )}
                        <tbody>
                            {nutrition.rows.map((row, r) => (
                                <tr key={r}>
                                    {row.map((cell, c) => c === 0
                                        ? <th key={c} scope="row" className="border-b py-1.5 pr-4 text-left font-normal text-foreground">{cell}</th>
                                        : <td key={c} className="border-b py-1.5 pr-4 font-mono text-muted-foreground">{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className={text}>{data.foodNutrition}</p>,
        });
    }
    if (data.foodDirections?.trim()) items.push({value: 'directions', title: t('directions'), body: <p className={text}>{data.foodDirections}</p>});
    if (data.foodIngredients?.trim() || data.foodAllergens?.trim()) {
        items.push({
            value: 'ingredientsAllergens',
            title: t('ingredientsAllergens'),
            body: (
                <div className="space-y-3">
                    {data.foodIngredients?.trim() && <p className={text}><span className="font-semibold text-foreground">{t('ingredients')}: </span>{highlightAllergens(data.foodIngredients)}</p>}
                    {data.foodAllergens?.trim() && <p className={text}><span className="font-semibold text-foreground">{t('allergens')}: </span>{highlightAllergens(data.foodAllergens)}</p>}
                </div>
            ),
        });
    }
    if (data.foodWarnings?.trim() || data.isFoodSupplement) {
        items.push({
            value: 'warnings',
            title: t('warnings'),
            body: (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {data.foodWarnings?.trim() && data.foodWarnings.split(/\r?\n/).filter((l) => l.trim()).map((l, i) => <li key={i}>{l}</li>)}
                    {data.isFoodSupplement && (
                        <>
                            <li>{t('legalWarnings.dose')}</li>
                            <li>{t('legalWarnings.diet')}</li>
                            <li>{t('legalWarnings.children')}</li>
                        </>
                    )}
                </ul>
            ),
        });
    }
    if (data.foodStorage?.trim()) items.push({value: 'storage', title: t('storage'), body: <p className={text}>{data.foodStorage}</p>});
    if (other) items.push({value: 'otherInfo', title: t('otherInfo'), body: <p className={text}>{other}</p>});

    if (!items.length) return null;

    return (
        <Accordion multiple defaultValue={['description']} className="w-full border-t border-border">
            {items.map((item) => (
                <AccordionItem key={item.value} value={item.value}>
                    <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">{item.title}</AccordionTrigger>
                    <AccordionContent keepMounted>{item.body}</AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
