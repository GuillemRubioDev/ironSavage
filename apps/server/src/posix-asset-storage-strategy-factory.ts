import type { AssetStorageStrategy } from '@vendure/core';
import { AssetServerOptions, defaultAssetStorageStrategyFactory, LocalAssetStorageStrategy } from '@vendure/asset-server-plugin';

/**
 * PosixAssetNamingStrategy (see posix-asset-naming-strategy.ts) sanitizes the
 * *input* filename it hands to the storage strategy, but LocalAssetStorageStrategy
 * ignores that string's separators anyway: filePathToIdentifier() re-derives the
 * identifier from the file path via path.dirname()/path.join()/path.basename(),
 * which on Windows (path.win32) normalize any '/' back to '\' — so the naming-strategy
 * fix alone still ends up with backslashes in the persisted `source`/`preview` values.
 * Patch the one method responsible, on top of the default factory, so the rest of its
 * (unexported) prefix/URL-building logic stays exactly as Vendure implements it.
 */
export function posixAssetStorageStrategyFactory(options: AssetServerOptions): AssetStorageStrategy {
    const strategy = defaultAssetStorageStrategyFactory(options) as LocalAssetStorageStrategy;
    // filePathToIdentifier is declared `private` in LocalAssetStorageStrategy's own
    // .d.ts, but that's a compile-time-only restriction — at runtime it's a plain,
    // reassignable instance method, which is exactly what this patches around.
    const instance = strategy as unknown as { filePathToIdentifier: (filePath: string) => string };
    const filePathToIdentifier = instance.filePathToIdentifier.bind(strategy);
    instance.filePathToIdentifier = (filePath: string) => filePathToIdentifier(filePath).replace(/\\/g, '/');
    return strategy;
}
