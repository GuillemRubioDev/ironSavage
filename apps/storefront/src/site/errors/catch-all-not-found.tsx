import {notFound} from 'next/navigation';

/**
 * Ruta "atrapalotodo" ([locale]/[...rest]): cualquier dirección que no existe
 * (p. ej. /jfjifjweifk) llama a notFound() dentro del layout de [locale], así se
 * pinta nuestro 404 (site/not-found.tsx) con cabecera y pie en vez del genérico de Next.
 */
export default function CatchAllNotFound(): never {
    notFound();
}
