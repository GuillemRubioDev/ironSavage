import { CustomFieldConfig, LanguageCode } from '@vendure/core';

/**
 * Información alimentaria obligatoria en la venta a distancia (Reglamento (UE)
 * 1169/2011, art. 14: disponible antes de cerrar la compra) más las menciones del
 * Real Decreto 1487/2009 para complementos alimenticios. Se rellena por producto
 * en el dashboard (pestaña «Información alimentaria») y el storefront la muestra
 * en la ficha (features/products/components/food-information.tsx).
 *
 * Los campos traducibles (localeText) tienen versión en español y en inglés.
 * Todo es opcional en el esquema para que los productos existentes sigan
 * funcionando: que esté completa es responsabilidad legal de la tienda, no algo
 * que pueda imponer la base de datos.
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
        // Los campos de varias líneas usan un área de texto: el dashboard muestra por defecto
        // un input de una línea para text/localeText, y las filas nutricionales y las
        // advertencias se escriben una por línea.
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

/** Por variante, porque cada formato tiene la suya (p. ej. «1 kg», «2 kg», «60 cápsulas»). */
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
