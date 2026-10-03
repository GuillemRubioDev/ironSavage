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
 * Reproducible initialization of the minimum commercial configuration a
 * clean Vendure install needs to process a real checkout: Spain as a
 * country, the "España (península y Baleares)" and "Canarias, Ceuta y
 * Melilla" tax zones, the channel set to EUR + the first one, the IVA
 * categories (General 21 %, Reducido 10 %, Superreducido 4 %; 0 % outside the
 * VAT area), the standard shipping method, and the Redsys payment method (plus a
 * dummy payment method outside production, for local/CI testing without a
 * real gateway).
 *
 * Idempotent throughout: every step checks for an existing row (by the same
 * natural key an admin would recognize — country code, zone name, tax
 * category name, method code) before creating anything, so running this
 * twice updates in place rather than duplicating.
 *
 * Deliberately does NOT create: products, variants, customers, users,
 * orders, invoices, reviews, or content — see FASE 14 scope.
 */

const loggerCtx = 'Seed';

const SPAIN_COUNTRY_CODE = 'ES';
const SPAIN_ZONE_NAME = 'España (península y Baleares)';
/** Names used by earlier versions of this seed — renamed in place. */
const LEGACY_SPAIN_ZONE_NAME = 'Spain';
const LEGACY_STANDARD_TAX_CATEGORY_NAME = 'Standard';
/**
 * Spanish IVA categories and their rate on the mainland/Baleares. Which one a
 * product uses is chosen per variant in the Dashboard (default: General);
 * confirm each product's rate with the tax advisor — food supplements are
 * usually "Reducido" (10 %).
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
 * Tax zone for the Canary Islands, Ceuta and Melilla (outside the Spanish VAT
 * area). No member countries: SpainTerritoriesTaxZoneStrategy assigns it by
 * postal code, matched on OUTSIDE_VAT_ZONE_NAME.
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
 * A Channel's `defaultLanguageCode` must already be present in the
 * server-wide GlobalSettings.availableLanguages list, or updating the
 * channel to Spanish fails with LanguageNotAvailableError — this is a
 * separate, global setting from the channel's own `availableLanguageCodes`.
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

/** The IVA categories (TAX_CATEGORIES), renaming the old "Standard" one to "General". */
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
 * One rate per category and zone. Only creates missing rates — never
 * overwrites one an admin (or the tax advisor) has already adjusted.
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
            // Name given by an earlier version of this seed; only the label changes.
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
 * The standard shipping method. The rate is a placeholder (5 € + IVA) —
 * the real rates are set in the Dashboard (Settings → Shipping methods),
 * where more methods can be added with the "Territorios de España y pedido
 * mínimo" condition (Baleares rate, free shipping from X €, Canarias…).
 * A method still carrying this seed's old English name and default checker
 * is upgraded in place; one an admin has edited is left alone.
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
        // No Redsys credentials here — redsys-payment-handler reads
        // REDSYS_MERCHANT_CODE/REDSYS_SECRET_KEY/REDSYS_ENVIRONMENT etc. from
        // process.env at request time (see redsys-config.ts). This row only
        // references the handler by code.
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
 * A properly channel-scoped, permission-carrying context — RequestContext.empty()
 * would work for globally-scoped entities (Country/Zone/TaxCategory/TaxRate) but
 * attaches a blank, id-less Channel, which breaks channel-scoped entities
 * (ShippingMethod, PaymentMethod). This mirrors Vendure's own documented pattern
 * for standalone scripts (see RequestContextService.create's doc comment).
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
