import { Asset, AssetType, bootstrapWorker, ConfigService, Logger, RequestContext, TransactionalConnection } from '@vendure/core';
import { config } from './vendure-config';
import { hasWebpPreview } from './webp-asset-preview-strategy';

const loggerCtx = 'RegenerateAssetPreviews';

/**
 * Regenera la preview de los assets subidos antes de WebpAssetPreviewStrategy, que
 * conservaban el formato original (p. ej. las PNG de noticias, de 3 MB). Vendure
 * solo crea la preview al subir, así que sin esto seguirían igual.
 *
 * - Por defecto, solo las imágenes raster cuya preview aún no es WebP. Con `--all`,
 *   también las que ya lo son (para aplicar el nuevo tamaño máximo y la calidad).
 * - `--dry-run` lista lo que haría sin escribir nada.
 * - La preview nueva se escribe con un nombre nuevo y la antigua NO se borra: las
 *   páginas y la caché del storefront que aún apunten a la URL vieja siguen
 *   funcionando hasta que se regeneren.
 *
 * Uso (en el servidor): `node dist/regenerate-asset-previews.js [--dry-run] [--all]`
 * En local: `npm run assets:regenerate-previews -w server -- --dry-run`
 */
async function regenerate(dryRun: boolean, all: boolean): Promise<void> {
    const { app } = await bootstrapWorker(config);
    try {
        const ctx = RequestContext.empty();
        const repository = app.get(TransactionalConnection).rawConnection.getRepository(Asset);
        const { assetStorageStrategy, assetPreviewStrategy, assetNamingStrategy } = app.get(ConfigService).assetOptions;

        const assets = await repository.find({ where: { type: AssetType.IMAGE } });
        const pending = assets.filter(asset => hasWebpPreview(asset.source) && (all || !asset.preview.endsWith('.webp')));
        Logger.info(`${pending.length} de ${assets.length} imágenes necesitan preview nueva${dryRun ? ' (simulación)' : ''}.`, loggerCtx);

        for (const asset of pending) {
            if (dryRun) {
                Logger.info(`Se regeneraría ${asset.preview}`, loggerCtx);
                continue;
            }
            const source = await assetStorageStrategy.readFileToBuffer(asset.source);
            const preview = await assetPreviewStrategy.generatePreviewImage(ctx, asset.mimeType, source);

            // Igual que AssetService.getPreviewFileName: un nombre que no exista ya.
            let fileName: string | undefined;
            do {
                fileName = assetNamingStrategy.generatePreviewFileName(ctx, asset.source, fileName);
            } while (await assetStorageStrategy.fileExists(fileName));

            const identifier = await assetStorageStrategy.writeFileFromBuffer(fileName, preview);
            await repository.update({ id: asset.id }, { preview: identifier });
            Logger.info(`${asset.preview} → ${identifier} (${Math.round(preview.length / 1024)} KB)`, loggerCtx);
        }
    } finally {
        await app.close();
    }
}

regenerate(process.argv.includes('--dry-run'), process.argv.includes('--all'))
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
