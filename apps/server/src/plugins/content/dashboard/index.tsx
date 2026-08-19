import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { ArticleFormPage } from './article-form';
import { ArticlesListPage } from './articles-list';

const articlesList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'catalog',
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
    routes: [articlesList, articleNew, articleDetail],
});
