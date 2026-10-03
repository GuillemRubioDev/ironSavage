import type { AssetStorageStrategy } from '@vendure/core';
import { AssetServerOptions, defaultAssetStorageStrategyFactory, LocalAssetStorageStrategy } from '@vendure/asset-server-plugin';

/**
 * PosixAssetNamingStrategy (ver posix-asset-naming-strategy.ts) limpia el nombre de
 * archivo que pasa a la estrategia de almacenamiento, pero LocalAssetStorageStrategy
 * ignora igualmente sus separadores: filePathToIdentifier() vuelve a calcular el
 * identificador con path.dirname()/path.join()/path.basename(), que en Windows
 * (path.win32) convierten cualquier '/' otra vez en '\'. Así que con arreglar solo la
 * estrategia de nombres seguirían guardándose barras invertidas en `source`/`preview`.
 * Se parchea solo ese método, sobre la factoría por defecto, para que el resto de su
 * lógica (no exportada) de prefijos y URLs siga exactamente como la implementa Vendure.
 */
export function posixAssetStorageStrategyFactory(options: AssetServerOptions): AssetStorageStrategy {
    const strategy = defaultAssetStorageStrategyFactory(options) as LocalAssetStorageStrategy;
    // filePathToIdentifier está declarado `private` en el .d.ts de
    // LocalAssetStorageStrategy, pero esa restricción solo existe al compilar: en
    // ejecución es un método normal y reasignable, que es justo lo que se parchea aquí.
    const instance = strategy as unknown as { filePathToIdentifier: (filePath: string) => string };
    const filePathToIdentifier = instance.filePathToIdentifier.bind(strategy);
    instance.filePathToIdentifier = (filePath: string) => filePathToIdentifier(filePath).replace(/\\/g, '/');
    return strategy;
}
