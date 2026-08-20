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
import { config } from './vendure-config';

/**
 * Reproducible initialization of the minimum commercial configuration a
 * clean Vendure install needs to process a real checkout: Spain as a
 * country/zone, the channel set to EUR + that zone, one "Standard" 21% tax
 * rate, the standard shipping method, and the Redsys payment method (plus a
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
const SPAIN_ZONE_NAME = 'Spain';
const STANDARD_TAX_CATEGORY_NAME = 'Standard';
const STANDARD_TAX_RATE_PERCENT = 21;
const STANDARD_SHIPPING_CODE = 'standard-shipping';
const STANDARD_SHIPPING_RATE_CENTS = 500;
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

async function ensureTaxCategory(ctx: RequestContext, service: TaxCategoryService) {
    const { items } = await service.findAll(ctx, { take: 100 });
    const existing = items.find(c => c.name === STANDARD_TAX_CATEGORY_NAME);
    if (existing) {
        Logger.info(`Tax category "${STANDARD_TAX_CATEGORY_NAME}" already exists — reusing.`, loggerCtx);
        return existing;
    }
    const category = await service.create(ctx, { name: STANDARD_TAX_CATEGORY_NAME, isDefault: true });
    Logger.info(`Created tax category "${STANDARD_TAX_CATEGORY_NAME}".`, loggerCtx);
    // Documented per FASE 14: Vendure does not require additional tax categories
    // (e.g. reduced/super-reduced IVA) for the system to function — a single
    // Standard category + rate is sufficient, as this project's own working
    // setup already demonstrated before this seed existed. Add "Reducido 10%"
    // / "Superreducido 4%" categories the same way, only if/when the catalog
    // actually needs mixed IVA rates — never auto-applied to any product by
    // this seed.
    return category;
}

async function ensureTaxRate(
    ctx: RequestContext,
    service: TaxRateService,
    taxCategory: { id: string | number },
    zone: Zone,
): Promise<void> {
    const { items } = await service.findAll(ctx, { take: 100 });
    const existing = items.find(
        r => String(r.categoryId) === String(taxCategory.id) && String(r.zoneId) === String(zone.id),
    );
    if (existing) {
        if (existing.value !== STANDARD_TAX_RATE_PERCENT || !existing.enabled) {
            await service.update(ctx, { id: existing.id, value: STANDARD_TAX_RATE_PERCENT, enabled: true });
            Logger.info(`Updated existing Standard/Spain tax rate to ${STANDARD_TAX_RATE_PERCENT}%.`, loggerCtx);
        } else {
            Logger.info(`Tax rate for Standard/Spain already exists at ${STANDARD_TAX_RATE_PERCENT}% — reusing.`, loggerCtx);
        }
        return;
    }
    await service.create(ctx, {
        name: `Spain Standard ${STANDARD_TAX_RATE_PERCENT}%`,
        enabled: true,
        value: STANDARD_TAX_RATE_PERCENT,
        categoryId: taxCategory.id,
        zoneId: zone.id,
    });
    Logger.info(`Created tax rate "Spain Standard ${STANDARD_TAX_RATE_PERCENT}%".`, loggerCtx);
}

async function ensureShippingMethod(ctx: RequestContext, service: ShippingMethodService): Promise<void> {
    const { items } = await service.findAll(ctx, { take: 100 });
    const existing = items.find(m => m.code === STANDARD_SHIPPING_CODE);
    if (existing) {
        Logger.info(`Shipping method "${STANDARD_SHIPPING_CODE}" already exists — reusing.`, loggerCtx);
        return;
    }
    await service.create(ctx, {
        code: STANDARD_SHIPPING_CODE,
        fulfillmentHandler: 'manual-fulfillment',
        checker: {
            code: 'default-shipping-eligibility-checker',
            arguments: [{ name: 'orderMinimum', value: '0' }],
        },
        calculator: {
            code: 'default-shipping-calculator',
            arguments: [
                { name: 'rate', value: String(STANDARD_SHIPPING_RATE_CENTS) },
                { name: 'includesTax', value: 'auto' },
                { name: 'taxRate', value: String(STANDARD_TAX_RATE_PERCENT) },
            ],
        },
        translations: [
            { languageCode: LanguageCode.en, name: 'Standard Shipping', description: 'Delivery in 3-5 business days' },
        ],
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
        const taxCategory = await ensureTaxCategory(ctx, taxCategoryService);
        await ensureTaxRate(ctx, taxRateService, taxCategory, zone);
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
