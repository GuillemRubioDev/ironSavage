import {Fragment, type ReactNode} from 'react';
import {getTranslations} from 'next-intl/server';

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

/** Words written in capitals (≥ 2 letters) are allergens by convention: shown in bold (Reg. 1169/2011 art. 21). */
function highlightAllergens(text: string): ReactNode[] {
    return text.split(/(\b[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ]{2,})*\b)/u).map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
}

/**
 * "Nutriente | por 100 g | por dosis" lines → table rows. The first row is a
 * header when it names the columns ("Nutriente…", "Por 100 g", "Per serving")
 * rather than holding a value.
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

/**
 * Mandatory food information on the product page (Reg. (EU) 1169/2011 art.
 * 14 — available before buying), from the product's "Información
 * alimentaria" custom fields. Only filled-in blocks are shown; for food
 * supplements the RD 1487/2009 warnings are always added.
 */
export async function FoodInformation({locale, data}: {locale: string; data: FoodInformationData}) {
    const t = await getTranslations({locale, namespace: 'Product.food'});
    const nutrition = data.foodNutrition ? parseNutrition(data.foodNutrition) : null;
    const hasContent = [data.foodIngredients, data.foodAllergens, data.foodNutrition, data.foodDirections, data.foodWarnings, data.foodStorage, data.foodOrigin, data.foodOperator].some((v) => v?.trim());

    if (!hasContent && !data.isFoodSupplement) {
        return null;
    }

    const Block = ({title, children}: {title: string; children: ReactNode}) => (
        <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
            <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{children}</div>
        </div>
    );

    return (
        <section aria-labelledby="food-information-title" className="container mx-auto px-4 py-10">
            <div className="max-w-3xl">
                <h2 id="food-information-title" className="text-display text-2xl font-bold mb-6">{t('title')}</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    {data.foodIngredients?.trim() && <Block title={t('ingredients')}>{highlightAllergens(data.foodIngredients)}</Block>}
                    {data.foodAllergens?.trim() && <Block title={t('allergens')}>{highlightAllergens(data.foodAllergens)}</Block>}
                    {data.foodDirections?.trim() && <Block title={t('directions')}>{data.foodDirections}</Block>}
                    {data.foodStorage?.trim() && <Block title={t('storage')}>{data.foodStorage}</Block>}
                    {data.foodOrigin?.trim() && <Block title={t('origin')}>{data.foodOrigin}</Block>}
                    {data.foodOperator?.trim() && <Block title={t('operator')}>{data.foodOperator}</Block>}
                </div>

                {data.foodNutrition?.trim() && (
                    <div className="mt-8 space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{t('nutrition')}</h3>
                        {nutrition ? (
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
                                                    : <td key={c} className="border-b py-1.5 pr-4 text-muted-foreground tabular-nums">{cell}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{data.foodNutrition}</p>
                        )}
                    </div>
                )}

                {(data.foodWarnings?.trim() || data.isFoodSupplement) && (
                    <div className="mt-8 rounded-md border border-border bg-muted/40 p-4 space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{t('warnings')}</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {data.foodWarnings?.trim() && data.foodWarnings.split(/\r?\n/).filter((l) => l.trim()).map((l, i) => <li key={i}>{l}</li>)}
                            {data.isFoodSupplement && (
                                <>
                                    <li>{t('legalWarnings.dose')}</li>
                                    <li>{t('legalWarnings.diet')}</li>
                                    <li>{t('legalWarnings.children')}</li>
                                </>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}
