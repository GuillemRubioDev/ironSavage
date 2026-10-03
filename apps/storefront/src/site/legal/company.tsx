import {COMPANY, COMPANY_PLACEHOLDERS, type CompanyField} from '@/config/company';
import {Placeholder} from '@/site/legal/legal-page';

/** Un dato de la empresa (ver config/company.ts), o un marcador resaltado mientras se desconoce. */
export function Company({field}: {field: CompanyField}) {
    const value = COMPANY[field];
    return value ? <>{value}</> : <Placeholder>{COMPANY_PLACEHOLDERS[field]}</Placeholder>;
}
