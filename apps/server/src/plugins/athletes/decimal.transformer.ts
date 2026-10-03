import { ValueTransformer } from 'typeorm';

/** Postgres devuelve las columnas `numeric` como texto; esto las deja como números de JS en la entidad. */
export const decimalTransformer: ValueTransformer = {
    to: (value: number | null | undefined) => value,
    from: (value: string | null) => (value === null || value === undefined ? value : Number(value)),
};
