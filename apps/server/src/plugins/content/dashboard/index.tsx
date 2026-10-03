import { Trans } from '@lingui/react/macro';
import { DashboardNavSectionDefinition, DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';
import { Newspaper } from 'lucide-react';

import { ArticleFormPage } from './article-form';
import { ArticlesListPage } from './articles-list';
import { draftArticlesWidget } from './draft-articles-widget';

// No native nav section fits "content"/news — Catalog, Sales, Customers,
// Marketing, System and Settings are all about commerce entities, not
// editorial content. A dedicated section is the officially-supported way
// to group this (DashboardNavSectionDefinition, since 3.4.0).
const contentSection: DashboardNavSectionDefinition = {
    id: 'content',
    title: /* i18n*/ 'Content',
    icon: Newspaper,
    order: 250,
};

const articlesList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'content',
        id: 'content-articles',
        url: '/content-articles',
        title: /* i18n*/ 'Articles',
    },
    path: '/content-articles',
    loader: () => ({ breadcrumb: <Trans>Articles</Trans> }),
    component: () => <ArticlesListPage />,
};

const articleNew: DashboardRouteDefinition = {
    path: '/content-articles/new',
    loader: () => ({ breadcrumb: <Trans>New article</Trans> }),
    component: () => <ArticleFormPage />,
};

const articleDetail: DashboardRouteDefinition = {
    path: '/content-articles/$id',
    loader: () => ({ breadcrumb: <Trans>Article</Trans> }),
    component: () => <ArticleFormPage />,
};

defineDashboardExtension({
    navSections: [contentSection],
    routes: [articlesList, articleNew, articleDetail],
    widgets: [draftArticlesWidget],
});
