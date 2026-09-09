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
    title: 'Content',
    icon: Newspaper,
    order: 250,
};

const articlesList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'content',
        id: 'content-articles',
        url: '/content-articles',
        title: 'Articles',
    },
    path: '/content-articles',
    loader: () => ({ breadcrumb: 'Articles' }),
    component: () => <ArticlesListPage />,
};

const articleNew: DashboardRouteDefinition = {
    path: '/content-articles/new',
    loader: () => ({ breadcrumb: 'New article' }),
    component: () => <ArticleFormPage />,
};

const articleDetail: DashboardRouteDefinition = {
    path: '/content-articles/$id',
    loader: () => ({ breadcrumb: 'Article' }),
    component: () => <ArticleFormPage />,
};

defineDashboardExtension({
    navSections: [contentSection],
    routes: [articlesList, articleNew, articleDetail],
    widgets: [draftArticlesWidget],
});
