import {COMPANY, COMPANY_PLACEHOLDERS, type CompanyField} from '@/config/company';
import {Placeholder} from '@/site/legal/legal-page';

/** A company data field (see config/company.ts), or a highlighted placeholder while it is unknown. */
export function Company({field}: {field: CompanyField}) {
    const value = COMPANY[field];
    return value ? <>{value}</> : <Placeholder>{COMPANY_PLACEHOLDERS[field]}</Placeholder>;
}
