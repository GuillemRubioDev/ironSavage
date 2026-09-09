import {graphql} from '@/platform/vendure/graphql';

export const GetActiveBannersQuery = graphql(`
    query GetActiveBanners {
        activeBanners {
            id
            titleEs
            titleEn
            subtitleEs
            subtitleEn
            ctaLabelEs
            ctaLabelEn
            href
            align
            imageLayout
            image {
                preview
            }
        }
    }
`);
