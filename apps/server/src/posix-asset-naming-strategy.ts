import { RequestContext } from '@vendure/core';
import { HashedAssetNamingStrategy } from '@vendure/asset-server-plugin';

/**
 * HashedAssetNamingStrategy builds its file names with `path.join()`, which emits
 * backslashes on Windows. That string is stored verbatim as the asset's `source`/
 * `preview` value and reused as the URL path, so uploads made on a Windows host
 * produce asset URLs like `/assets/preview\ab\file.jpg` — invalid as a URL, since
 * browsers only treat `/` as a path separator (fetch/proxy requests don't get the
 * same backslash-tolerant normalization full page navigations do). Force forward
 * slashes regardless of host OS.
 */
export class PosixAssetNamingStrategy extends HashedAssetNamingStrategy {
    generateSourceFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string): string {
        return super.generateSourceFileName(ctx, originalFileName, conflictFileName).replace(/\\/g, '/');
    }

    generatePreviewFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string): string {
        return super.generatePreviewFileName(ctx, originalFileName, conflictFileName).replace(/\\/g, '/');
    }
}
