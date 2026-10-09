import { ImageTransformParameters, ImageTransformStrategy } from '@vendure/asset-server-plugin';

/** Igual que el lado máximo de la preview: pedir más solo serviría para ampliarla. */
export const MAX_TRANSFORM_SIZE = 2048;

function cap(value: number | undefined): number | undefined {
    return value === undefined ? undefined : Math.min(Math.max(value, 1), MAX_TRANSFORM_SIZE);
}

/**
 * Limita el ancho y el alto que se pueden pedir al servidor de assets (`?w=`/`?h=`).
 * Sin límite, cualquiera podía pedir `?w=10000` y obligar al servidor a generar (y
 * guardar en caché) una imagen enorme. No se usa PresetOnlyStrategy porque el
 * dashboard de Vendure pide miniaturas con `w`, `h` y punto focal, y esa estrategia
 * además aplica su preset por defecto a las URLs sin parámetros (las que lee next/image).
 */
export class CappedImageTransformStrategy implements ImageTransformStrategy {
    getImageTransformParameters({ input }: { input: ImageTransformParameters }): ImageTransformParameters {
        return { ...input, width: cap(input.width), height: cap(input.height) };
    }
}
