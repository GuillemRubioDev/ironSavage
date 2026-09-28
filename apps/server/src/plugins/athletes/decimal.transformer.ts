import { ValueTransformer } from 'typeorm';

/** Postgres returns `numeric` columns as strings; this keeps them as JS numbers on the entity. */
export const decimalTransformer: ValueTransformer = {
    to: (value: number | null | undefined) => value,
    from: (value: string | null) => (value === null || value === undefined ? value : Number(value)),
};
