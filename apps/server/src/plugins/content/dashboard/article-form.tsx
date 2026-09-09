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

    const [titleEs, setTitleEs] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [excerptEs, setExcerptEs] = useState('');
    const [excerptEn, setExcerptEn] = useState('');
    const [contentEs, setContentEs] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [coverImage, setCoverImage] = useState<AssetRef | null>(null);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (article) {
            setTitleEs(article.titleEs);
            setTitleEn(article.titleEn);
            setSlug(article.slug);
            setSlugTouched(true);
            setExcerptEs(article.excerptEs);
            setExcerptEn(article.excerptEn);
            setContentEs(article.contentEs);
            setContentEn(article.contentEn);
            setCoverImage(article.coverImage ? { id: article.coverImage.id, preview: article.coverImage.preview } : null);
        }
    }, [article]);

    function onTitleEsChange(value: string) {
        setTitleEs(value);
        if (!slugTouched) {
            setSlug(slugify(value));
        }
    }

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const input = { titleEs, titleEn, slug, excerptEs, excerptEn, contentEs, contentEn, coverImageId: coverImage?.id ?? null };
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong while saving.');
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
            <PageTitle>{isNew ? 'New article' : titleEs || 'Article'}</PageTitle>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="titleEs">Title (Spanish)</Label>
                                <Input id="titleEs" value={titleEs} onChange={e => onTitleEsChange(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="titleEn">Title (English)</Label>
                                <Input id="titleEn" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
                            </div>
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
                            <p className="text-xs text-muted-foreground">Shared across locales — one URL for both languages.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="excerptEs">Excerpt (Spanish)</Label>
                                <Textarea id="excerptEs" rows={2} value={excerptEs} onChange={e => setExcerptEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="excerptEn">Excerpt (English)</Label>
                                <Textarea id="excerptEn" rows={2} value={excerptEn} onChange={e => setExcerptEn(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contentEs">Content (Spanish)</Label>
                                <Textarea id="contentEs" rows={12} value={contentEs} onChange={e => setContentEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contentEn">Content (English)</Label>
                                <Textarea id="contentEn" rows={12} value={contentEn} onChange={e => setContentEn(e.target.value)} />
                            </div>
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
