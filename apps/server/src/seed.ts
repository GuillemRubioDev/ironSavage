import {
    bootstrapWorker,
    ChannelService,
    Country,
    CountryService,
    CurrencyCode,
    GlobalSettingsService,
    LanguageCode,
    Logger,
    PaymentMethodService,
    RequestContext,
    RequestContextService,
    ShippingMethodService,
    TaxCategoryService,
    TaxRateService,
    TransactionalConnection,
    Translated,
    User,
    Zone,
    ZoneService,
} from '@vendure/core';

import { includeDummyPaymentHandler } from './app-environment';
import { OUTSIDE_VAT_ZONE_NAME, spainTerritoriesShippingChecker } from './plugins/spain-territories/spain-territories';
import { config } from './vendure-config';

/**
 * Inicialización reproducible de la configuración comercial mínima que necesita
 * un Vendure recién instalado para procesar una compra real: España como país,
 * las zonas fiscales «España (península y Baleares)» y «Canarias, Ceuta y
 * Melilla», el canal en EUR con la primera de ellas, las categorías de IVA
 * (General 21 %, Reducido 10 %, Superreducido 4 %; 0 % fuera del IVA), el
 * método de envío estándar y el método de pago Redsys (más un método de pago de
 * pruebas fuera de producción, para probar en local o en la CI sin pasarela).
 *
 * Idempotente en todo: cada paso busca una fila existente (por la clave que
 * reconocería un administrador: código de país, nombre de zona, nombre de
 * categoría, código de método) antes de crear nada, así que ejecutarlo dos
 * veces actualiza en vez de duplicar.
 *
 * A propósito NO crea: productos, variantes, clientes, usuarios, pedidos,
 * facturas, reseñas ni contenido (ver el alcance de la FASE 14).
 */

const loggerCtx = 'Seed';

const SPAIN_COUNTRY_CODE = 'ES';
const SPAIN_ZONE_NAME = 'España (península y Baleares)';
/** Nombres que usaban versiones anteriores de este seed; se renombran sin duplicar. */
const LEGACY_SPAIN_ZONE_NAME = 'Spain';
const LEGACY_STANDARD_TAX_CATEGORY_NAME = 'Standard';
/**
 * Categorías de IVA españolas y su tipo en península y Baleares. Cuál usa cada
 * producto se elige por variante en el dashboard (por defecto, General). El tipo
 * de cada producto lo confirma la gestoría; los complementos alimenticios suelen
 * ir al «Reducido» (10 %).
 */
const TAX_CATEGORIES = [
    { name: 'General', rate: 21, isDefault: true },
    { name: 'Reducido', rate: 10, isDefault: false },
    { name: 'Superreducido', rate: 4, isDefault: false },
];
const STANDARD_TAX_RATE_PERCENT = 21;
const STANDARD_SHIPPING_CODE = 'standard-shipping';
const STANDARD_SHIPPING_RATE_CENTS = 500;
const LEGACY_SHIPPING_NAME = 'Standard Shipping';
const REDSYS_PAYMENT_CODE = 'redsys';
const DUMMY_PAYMENT_CODE = 'standard-payment';

async function ensureCountry(ctx: RequestContext, service: CountryService): Promise<Translated<Country>> {
    const { items } = await service.findAll(ctx, { take: 250 });
    const existing = items.find(c => c.code === SPAIN_COUNTRY_CODE);
    if (existing) {
        Logger.info(`Country ${SPAIN_COUNTRY_CODE} already exists — reusing.`, loggerCtx);
        return existing;
    }
    const country = await service.create(ctx, {
        code: SPAIN_COUNTRY_CODE,
        enabled: true,
        translations: [
            { languageCode: LanguageCode.en, name: 'Spain' },
            { languageCode: LanguageCode.es, name: 'España' },
        ],
    });
    Logger.info(`Created country ${SPAIN_COUNTRY_CODE}.`, loggerCtx);
    return country;
}

async function ensureZone(ctx: RequestContext, service: ZoneService, country: Translated<Country>): Promise<Zone> {
    const { items } = await service.findAll(ctx, { take: 100 });
    const legacy = items.find(z => z.name === LEGACY_SPAIN_ZONE_NAME);
    if (legacy && !items.some(z => z.name === SPAIN_ZONE_NAME)) {
        await service.update(ctx, { id: legacy.id, name: SPAIN_ZONE_NAME });
        legacy.name = SPAIN_ZONE_NAME;
        Logger.info(`Renamed zone "${LEGACY_SPAIN_ZONE_NAME}" to "${SPAIN_ZONE_NAME}".`, loggerCtx);
    }
    const existing = items.find(z => z.name === SPAIN_ZONE_NAME);
    if (existing) {
        const alreadyMember = existing.members.some(m => String(m.id) === String(country.id));
        if (alreadyMember) {
            Logger.info(`Zone "${SPAIN_ZONE_NAME}" already exists with ${SPAIN_COUNTRY_CODE} as a member — reusing.`, loggerCtx);
        } else {
            await service.addMembersToZone(ctx, { zoneId: existing.id, memberIds: [country.id] });
            Logger.info(`Added ${SPAIN_COUNTRY_CODE} to existing zone "${SPAIN_ZONE_NAME}".`, loggerCtx);
        }
        return existing;
    }
    const zone = await service.create(ctx, { name: SPAIN_ZONE_NAME, memberIds: [country.id] });
    Logger.info(`Created zone "${SPAIN_ZONE_NAME}".`, loggerCtx);
    return zone;
}

/**
 * Zona fiscal de Canarias, Ceuta y Melilla (fuera del IVA español). Sin países
 * miembros: SpainTerritoriesTaxZoneStrategy la asigna por código postal,
 * buscándola por OUTSIDE_VAT_ZONE_NAME.
 */
async function ensureOutsideVatZone(ctx: RequestContext, service: ZoneService): Promise<Zone> {
    const { items } = await service.findAll(ctx, { take: 100 });
    const existing = items.find(z => z.name === OUTSIDE_VAT_ZONE_NAME);
    if (existing) {
        Logger.info(`Zone "${OUTSIDE_VAT_ZONE_NAME}" already exists — reusing.`, loggerCtx);
        return existing;
    }
    const zone = await service.create(ctx, { name: OUTSIDE_VAT_ZONE_NAME, memberIds: [] });
    Logger.info(`Created zone "${OUTSIDE_VAT_ZONE_NAME}".`, loggerCtx);
    return zone;
}

/**
 * El `defaultLanguageCode` de un canal debe estar ya en la lista global
 * GlobalSettings.availableLanguages, o pasar el canal a español falla con
 * LanguageNotAvailableError. Es un ajuste global distinto de los
 * `availableLanguageCodes` del propio canal.
 */
async function ensureGlobalSettings(ctx: RequestContext, service: GlobalSettingsService): Promise<void> {
    const settings = await service.getSettings(ctx);
    if (settings.availableLanguages.includes(LanguageCode.es)) {
        Logger.info('Global settings already include Spanish — reusing.', loggerCtx);
        return;
    }
    const languages = [...new Set([...settings.availableLanguages, LanguageCode.es])];
    await service.updateSettings(ctx, { availableLanguages: languages });
    Logger.info('Added Spanish to global available languages.', loggerCtx);
}

async function ensureChannel(ctx: RequestContext, service: ChannelService, zone: Zone): Promise<void> {
    const channel = await service.getDefaultChannel(ctx);
    const upToDate =
        channel.defaultCurrencyCode === CurrencyCode.EUR &&
        channel.availableCurrencyCodes.includes(CurrencyCode.EUR) &&
        channel.defaultLanguageCode === LanguageCode.es &&
        channel.availableLanguageCodes.includes(LanguageCode.es) &&
        String(channel.defaultTaxZone?.id) === String(zone.id) &&
        String(channel.defaultShippingZone?.id) === String(zone.id);
    if (upToDate) {
        Logger.info('Default channel already configured for EUR/Spain — reusing.', loggerCtx);
        return;
    }
    const result = await service.update(ctx, {
        id: channel.id,
        defaultCurrencyCode: CurrencyCode.EUR,
        availableCurrencyCodes: [CurrencyCode.EUR],
        defaultLanguageCode: LanguageCode.es,
        availableLanguageCodes: [LanguageCode.es],
        pricesIncludeTax: false,
        defaultTaxZoneId: zone.id,
        defaultShippingZoneId: zone.id,
    });
    if ('errorCode' in result) {
        throw new Error(`Failed to update default channel: ${result.message}`);
    }
    Logger.info('Updated default channel: EUR currency, Spain tax/shipping zone.', loggerCtx);
}

/** Las categorías de IVA (TAX_CATEGORIES); renombra la antigua «Standard» a «General». */
async function ensureTaxCategories(ctx: RequestContext, service: TaxCategoryService) {
    const { items } = await service.findAll(ctx, { take: 100 });
    const legacy = items.find(c => c.name === LEGACY_STANDARD_TAX_CATEGORY_NAME);
    if (legacy && !items.some(c => c.name === 'General')) {
        await service.update(ctx, { id: legacy.id, name: 'General' });
        legacy.name = 'General';
        Logger.info(`Renamed tax category "${LEGACY_STANDARD_TAX_CATEGORY_NAME}" to "General".`, loggerCtx);
    }
    const categories: Array<{ id: string | number; name: string; rate: number }> = [];
    for (const def of TAX_CATEGORIES) {
        let category = items.find(c => c.name === def.name);
        if (category) {
            Logger.info(`Tax category "${def.name}" already exists — reusing.`, loggerCtx);
        } else {
            category = await service.create(ctx, { name: def.name, isDefault: def.isDefault });
            Logger.info(`Created tax category "${def.name}".`, loggerCtx);
        }
        categories.push({ id: category.id, name: def.name, rate: def.rate });
    }
    return categories;
}

/**
 * Un tipo por categoría y zona. Solo crea los que faltan; nunca pisa uno que
 * ya haya ajustado un administrador (o la gestoría).
 */
async function ensureTaxRates(
    ctx: RequestContext,
    service: TaxRateService,
    categories: Array<{ id: string | number; name: string; rate: number }>,
    zone: Zone,
    rateFor: (category: { rate: number }) => number,
): Promise<void> {
    const { items } = await service.findAll(ctx, { take: 200 });
    for (const category of categories) {
        const existing = items.find(r => String(r.categoryId) === String(category.id) && String(r.zoneId) === String(zone.id));
        if (existing?.name.startsWith('Spain Standard')) {
            // Nombre que puso una versión anterior de este seed; solo cambia la etiqueta.
            await service.update(ctx, { id: existing.id, name: `${category.name} ${existing.value}% — ${zone.name}` });
        }
        if (existing) {
            Logger.info(`Tax rate ${category.name} / ${zone.name} already exists — reusing.`, loggerCtx);
            continue;
        }
        const value = rateFor(category);
        await service.create(ctx, {
            name: `${category.name} ${value}% — ${zone.name}`,
            enabled: true,
            value,
            categoryId: category.id,
            zoneId: zone.id,
        });
        Logger.info(`Created tax rate ${category.name} ${value}% for "${zone.name}".`, loggerCtx);
    }
}

const STANDARD_SHIPPING_CHECKER = {
    code: spainTerritoriesShippingChecker.code,
    arguments: [
        { name: 'orderMinimum', value: '0' },
        { name: 'peninsula', value: 'true' },
        { name: 'baleares', value: 'true' },
        { name: 'canarias', value: 'false' },
        { name: 'ceuta', value: 'false' },
        { name: 'melilla', value: 'false' },
    ],
};
const STANDARD_SHIPPING_TRANSLATIONS = [
    { languageCode: LanguageCode.es, name: 'Envío estándar', description: 'Entrega a domicilio en España peninsular y Baleares' },
    { languageCode: LanguageCode.en, name: 'Standard shipping', description: 'Home delivery in mainland Spain and the Balearic Islands' },
];

/**
 * El método de envío estándar. La tarifa es provisional (5 € + IVA): las reales
 * se ponen en el dashboard (Ajustes → Métodos de envío), donde se pueden añadir
 * más métodos con la condición «Territorios de España y pedido mínimo» (tarifa
 * de Baleares, envío gratis desde X €, Canarias…). Un método que aún tenga el
 * antiguo nombre en inglés y la condición por defecto se actualiza; uno que haya
 * editado un administrador no se toca.
 */
async function ensureShippingMethod(ctx: RequestContext, service: ShippingMethodService): Promise<void> {
    const { items } = await service.findAll(ctx, { take: 100 });
    const existing = items.find(m => m.code === STANDARD_SHIPPING_CODE);
    if (existing) {
        const untouched = existing.name === LEGACY_SHIPPING_NAME && existing.checker.code === 'default-shipping-eligibility-checker';
        if (untouched) {
            await service.update(ctx, { id: existing.id, checker: STANDARD_SHIPPING_CHECKER, translations: STANDARD_SHIPPING_TRANSLATIONS });
            Logger.info(`Updated shipping method "${STANDARD_SHIPPING_CODE}": Spanish name and territory checker.`, loggerCtx);
        } else {
            Logger.info(`Shipping method "${STANDARD_SHIPPING_CODE}" already exists — reusing.`, loggerCtx);
        }
        return;
    }
    await service.create(ctx, {
        code: STANDARD_SHIPPING_CODE,
        fulfillmentHandler: 'manual-fulfillment',
        checker: STANDARD_SHIPPING_CHECKER,
        calculator: {
            code: 'default-shipping-calculator',
            arguments: [
                { name: 'rate', value: String(STANDARD_SHIPPING_RATE_CENTS) },
                { name: 'includesTax', value: 'auto' },
                { name: 'taxRate', value: String(STANDARD_TAX_RATE_PERCENT) },
            ],
        },
        translations: STANDARD_SHIPPING_TRANSLATIONS,
    });
    Logger.info(`Created shipping method "${STANDARD_SHIPPING_CODE}" (${(STANDARD_SHIPPING_RATE_CENTS / 100).toFixed(2)} EUR).`, loggerCtx);
}

async function ensurePaymentMethods(ctx: RequestContext, service: PaymentMethodService): Promise<void> {
    const { items } = await service.findAll(ctx, { take: 100 });

    if (items.some(m => m.code === REDSYS_PAYMENT_CODE)) {
        Logger.info(`Payment method "${REDSYS_PAYMENT_CODE}" already exists — reusing.`, loggerCtx);
    } else {
        // Aquí no van credenciales de Redsys: redsys-payment-handler lee
        // REDSYS_MERCHANT_CODE/REDSYS_SECRET_KEY/REDSYS_ENVIRONMENT, etc. de
        // process.env en cada petición (ver redsys-config.ts). Esta fila solo
        // referencia el handler por su código.
        await service.create(ctx, {
            code: REDSYS_PAYMENT_CODE,
            enabled: true,
            handler: { code: 'redsys-payment-handler', arguments: [] },
            translations: [
                {
                    languageCode: LanguageCode.en,
                    name: 'Tarjeta bancaria (Redsys)',
                    description: 'Pago seguro con tarjeta a través de Redsys',
                },
            ],
        });
        Logger.info(`Created payment method "${REDSYS_PAYMENT_CODE}".`, loggerCtx);
    }

    if (!includeDummyPaymentHandler()) {
        Logger.info('Skipping dummy payment method — running in production (see app-environment.ts).', loggerCtx);
        return;
    }
    if (items.some(m => m.code === DUMMY_PAYMENT_CODE)) {
        Logger.info(`Payment method "${DUMMY_PAYMENT_CODE}" already exists — reusing.`, loggerCtx);
        return;
    }
    await service.create(ctx, {
        code: DUMMY_PAYMENT_CODE,
        enabled: true,
        handler: { code: 'dummy-payment-handler', arguments: [{ name: 'automaticSettle', value: 'true' }] },
        translations: [
            {
                languageCode: LanguageCode.en,
                name: 'Card payment (test)',
                description: 'Test payment handler — no real charge is made',
            },
        ],
    });
    Logger.info(`Created payment method "${DUMMY_PAYMENT_CODE}" (dev/test only).`, loggerCtx);
}

/**
 * Un contexto con canal y permisos de verdad. RequestContext.empty() serviría
 * para entidades globales (Country/Zone/TaxCategory/TaxRate), pero lleva un canal
 * vacío sin id, que rompe las entidades ligadas a canal (ShippingMethod,
 * PaymentMethod). Sigue el patrón que documenta Vendure para scripts
 * independientes (ver el comentario de RequestContextService.create).
 */
async function createSeedContext(app: import('@nestjs/common').INestApplicationContext): Promise<RequestContext> {
    const connection = app.get(TransactionalConnection);
    const requestContextService = app.get(RequestContextService);
    const { superadminCredentials } = config.authOptions;

    const superAdminUser = await connection.rawConnection.getRepository(User).findOneOrFail({
        where: { identifier: superadminCredentials?.identifier },
        relations: { roles: { channels: true } },
    });

    return requestContextService.create({
        apiType: 'admin',
        user: superAdminUser,
    });
}

async function seed(): Promise<void> {
    Logger.info('Starting seed...', loggerCtx);
    const worker = await bootstrapWorker(config);
    const app = worker.app;

    try {
        const ctx = await createSeedContext(app);

        const countryService = app.get(CountryService);
        const zoneService = app.get(ZoneService);
        const channelService = app.get(ChannelService);
        const globalSettingsService = app.get(GlobalSettingsService);
        const taxCategoryService = app.get(TaxCategoryService);
        const taxRateService = app.get(TaxRateService);
        const shippingMethodService = app.get(ShippingMethodService);
        const paymentMethodService = app.get(PaymentMethodService);

        const country = await ensureCountry(ctx, countryService);
        const zone = await ensureZone(ctx, zoneService, country);
        await ensureGlobalSettings(ctx, globalSettingsService);
        await ensureChannel(ctx, channelService, zone);
        const outsideVatZone = await ensureOutsideVatZone(ctx, zoneService);
        const taxCategories = await ensureTaxCategories(ctx, taxCategoryService);
        await ensureTaxRates(ctx, taxRateService, taxCategories, zone, category => category.rate);
        await ensureTaxRates(ctx, taxRateService, taxCategories, outsideVatZone, () => 0);
        await ensureShippingMethod(ctx, shippingMethodService);
        await ensurePaymentMethods(ctx, paymentMethodService);

        Logger.info('Seed completed successfully.', loggerCtx);
    } finally {
        await app.close();
    }
}

seed()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
