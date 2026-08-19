import {
    api,
    AssetPickerDialog,
    Badge,
    Button,
    FullWidthPageBlock,
    Input,
    Label,
    Page,
    PageActionBar,
    PageActionBarRight,
    PageLayout,
    PageTitle,
    Textarea,
} from '@vendure/dashboard';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
    adminArticleDetailDocument,
    createArticleDocument,
    deleteArticleDocument,
    publishArticleDocument,
    unpublishArticleDocument,
    updateArticleDocument,
} from './graphql';

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

interface AssetRef {
    id: string;
    preview: string;
}

export function ArticleFormPage() {
    const params = useParams({ strict: false }) as { id?: string };
    const id = params.id;
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['content-article-detail', id],
        queryFn: () => api.query(adminArticleDetailDocument, { id: id! }),
        enabled: !isNew,
    });
    const article = data?.adminArticle;

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [coverImage, setCoverImage] = useState<AssetRef | null>(null);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (article) {
            setTitle(article.title);
            setSlug(article.slug);
            setSlugTouched(true);
            setExcerpt(article.excerpt);
            setContent(article.content);
            setCoverImage(article.coverImage ? { id: article.coverImage.id, preview: article.coverImage.preview } : null);
        }
    }, [article]);

    function onTitleChange(value: string) {
        setTitle(value);
        if (!slugTouched) {
            setSlug(slugify(value));
        }
    }

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const input = { title, slug, excerpt, content, coverImageId: coverImage?.id ?? null };
            const result = isNew
                ? await api.mutate(createArticleDocument, { input })
                : await api.mutate(updateArticleDocument, { id: id!, input });
            const payload = isNew ? result.createContentArticle : result.updateContentArticle;
            if (payload.__typename !== 'ContentArticle') {
                setError(payload.message);
                return;
            }
            await queryClient.invalidateQueries({ queryKey: ['content-article-list'] });
            void navigate({ to: '/content-articles/$id', params: { id: payload.id } });
        } finally {
            setSaving(false);
        }
    }

    async function togglePublish() {
        if (!article) return;
        await api.mutate(article.status === 'PUBLISHED' ? unpublishArticleDocument : publishArticleDocument, { id: article.id });
        await queryClient.invalidateQueries({ queryKey: ['content-article-detail', id] });
        await queryClient.invalidateQueries({ queryKey: ['content-article-list'] });
    }

    async function remove() {
        if (!article) return;
        await api.mutate(deleteArticleDocument, { id: article.id });
        await queryClient.invalidateQueries({ queryKey: ['content-article-list'] });
        void navigate({ to: '/content-articles' });
    }

    if (!isNew && isLoading) {
        return (
            <Page pageId="content-article-detail">
                <PageTitle>Article</PageTitle>
                <PageLayout>
                    <FullWidthPageBlock blockId="form">
                        <p className="text-muted-foreground">Loading...</p>
                    </FullWidthPageBlock>
                </PageLayout>
            </Page>
        );
    }

    return (
        <Page pageId="content-article-detail">
            <PageTitle>{isNew ? 'New article' : title || 'Article'}</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    {!isNew && article && (
                        <>
                            <Badge variant={article.status === 'PUBLISHED' ? 'default' : 'secondary'}>{article.status}</Badge>
                            {article.status !== 'ARCHIVED' && (
                                <Button variant="outline" onClick={() => void togglePublish()}>
                                    {article.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => void remove()}>
                                Delete
                            </Button>
                        </>
                    )}
                    <Button onClick={() => void save()} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <FullWidthPageBlock blockId="form">
                    <div className="max-w-2xl space-y-4">
                        {error && <div className="text-sm text-destructive">{error}</div>}

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={e => onTitleChange(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={e => {
                                    setSlugTouched(true);
                                    setSlug(slugify(e.target.value));
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="excerpt">Excerpt</Label>
                            <Textarea id="excerpt" rows={2} value={excerpt} onChange={e => setExcerpt(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" rows={12} value={content} onChange={e => setContent(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Cover image</Label>
                            <div className="flex items-center gap-4">
                                {coverImage && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={coverImage.preview + '?preset=thumb'} alt="" className="h-20 w-20 rounded object-cover border" />
                                )}
                                <Button variant="outline" onClick={() => setAssetPickerOpen(true)}>
                                    {coverImage ? 'Change image' : 'Set image'}
                                </Button>
                                {coverImage && (
                                    <Button variant="ghost" onClick={() => setCoverImage(null)}>
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <AssetPickerDialog
                        open={assetPickerOpen}
                        onClose={() => setAssetPickerOpen(false)}
                        onSelect={assets => {
                            const asset = assets[0];
                            if (asset) {
                                setCoverImage({ id: asset.id, preview: asset.preview });
                            }
                            setAssetPickerOpen(false);
                        }}
                    />
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}
