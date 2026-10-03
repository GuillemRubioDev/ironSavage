import { CustomFieldConfig, LanguageCode } from '@vendure/core';

/**
 * Mandatory food information for distance selling (Regulation (EU) 1169/2011,
 * art. 14: available before the purchase is concluded) plus the mentions of
 * Real Decreto 1487/2009 for food supplements. Filled in per product from the
 * Dashboard ("Información alimentaria" tab) and shown on the product page by
 * the storefront (features/products/components/food-information.tsx).
 *
 * Translatable fields (localeText) take a Spanish and an English version.
 * Everything is optional at the schema level so existing products keep
 * working — completeness is the shop's legal responsibility, not something
 * the database can enforce.
 */
const TAB = 'Información alimentaria';

function field(
    name: string,
    type: 'localeText' | 'text' | 'localeString',
    es: string,
    en: string,
    descriptionEs: string,
): CustomFieldConfig {
    return {
        name,
        type,
        nullable: true,
        public: true,
        // Multi-line fields get a textarea: the Dashboard's default for text/localeText is a
        // single-line input, and nutrition rows / warnings are entered one per line.
        ui: type === 'localeString' ? { tab: TAB } : { tab: TAB, component: 'textarea-form-input' },
        label: [
            { languageCode: LanguageCode.es, value: es },
            { languageCode: LanguageCode.en, value: en },
        ],
        description: [{ languageCode: LanguageCode.es, value: descriptionEs }],
    } as CustomFieldConfig;
}

export const productFoodInformationFields: CustomFieldConfig[] = [
    {
        name: 'isFoodSupplement',
        type: 'boolean',
        defaultValue: true,
        nullable: false,
        public: true,
        ui: { tab: TAB },
        label: [
            { languageCode: LanguageCode.es, value: 'Es un complemento alimenticio' },
            { languageCode: LanguageCode.en, value: 'Is a food supplement' },
        ],
        description: [
            {
                languageCode: LanguageCode.es,
                value: 'Si está marcado, la ficha muestra automáticamente las advertencias obligatorias del RD 1487/2009. Desmárcalo en accesorios (shakers, ropa…).',
            },
        ],
    },
    field('foodIngredients', 'localeText', 'Ingredientes', 'Ingredients', 'Lista completa en orden decreciente de peso. Escribe los alérgenos en MAYÚSCULAS (se resaltan en la ficha).'),
    field('foodAllergens', 'localeText', 'Alérgenos', 'Allergens', 'Resumen de alérgenos y trazas, p. ej. «Contiene LECHE. Puede contener trazas de SOJA».'),
    field('foodNutrition', 'localeText', 'Información nutricional', 'Nutrition facts', 'Una línea por nutriente: «Nutriente | por 100 g | por dosis». Ej.: «Proteínas | 80 g | 24 g».'),
    field('foodDirections', 'localeText', 'Modo de empleo y dosis diaria recomendada', 'Directions and recommended daily dose', 'Cómo y cuándo tomarlo, y la dosis diaria recomendada (obligatoria en complementos).'),
    field('foodWarnings', 'localeText', 'Advertencias específicas', 'Specific warnings', 'Advertencias propias del producto (cafeína, embarazo…). Las advertencias legales generales de los complementos ya se añaden solas.'),
    field('foodStorage', 'localeText', 'Conservación', 'Storage', 'Condiciones de conservación, p. ej. «Conservar en lugar fresco y seco».'),
    field('foodOrigin', 'localeString', 'País de origen', 'Country of origin', 'Solo si es obligatorio o si su omisión puede inducir a error.'),
    field('foodOperator', 'text', 'Operador responsable', 'Responsible food business operator', 'Nombre o razón social y dirección del fabricante o del operador bajo cuyo nombre se comercializa.'),
];

/** Per variant, since each size has its own (e.g. «1 kg», «2 kg», «60 cápsulas»). */
export const variantFoodInformationFields: CustomFieldConfig[] = [
    {
        name: 'netQuantity',
        type: 'localeString',
        nullable: true,
        public: true,
        label: [
            { languageCode: LanguageCode.es, value: 'Cantidad neta' },
            { languageCode: LanguageCode.en, value: 'Net quantity' },
        ],
        description: [{ languageCode: LanguageCode.es, value: 'P. ej. «1 kg», «500 g», «60 cápsulas (54 g)».' }],
    } as CustomFieldConfig,
];
