import {ListingSkeleton} from '@/features/products/listing-skeleton';

export default function SearchLoading() {
    // La cabecera de la búsqueda no muestra el nº de productos.
    return <ListingSkeleton count={false} />;
}
