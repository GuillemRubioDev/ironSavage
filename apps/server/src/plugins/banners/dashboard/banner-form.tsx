import {
    api,
    AssetPickerDialog,
    Button,
    FullWidthPageBlock,
    Input,
    Label,
    Page,
    PageActionBar,
    PageActionBarRight,
    PageLayout,
    PageTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
} from '@vendure/dashboard';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { adminBannerDetailDocument, createBannerDocument, deleteBannerDocument, updateBannerDocument } from './graphql';

interface AssetRef {
    id: string;
    preview: string;
}

const ALIGN_OPTIONS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
] as const;

const IMAGE_LAYOUT_OPTIONS = [
    { value: 'background', label: 'Full background (image behind text)' },
    { value: 'left', label: 'Image on the left, text on the right' },
    { value: 'right', label: 'Image on the right, text on the left' },
] as const;

export function BannerFormPage() {
    const params = useParams({ strict: false }) as { id?: string };
    const id = params.id;
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['banner-detail', id],
        queryFn: () => api.query(adminBannerDetailDocument, { id: id! }),
        enabled: !isNew,
    });
    const banner = data?.adminBanner;

    const [titleEs, setTitleEs] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [subtitleEs, setSubtitleEs] = useState('');
    const [subtitleEn, setSubtitleEn] = useState('');
    const [ctaLabelEs, setCtaLabelEs] = useState('');
    const [ctaLabelEn, setCtaLabelEn] = useState('');
    const [href, setHref] = useState('');
    const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
    const [imageLayout, setImageLayout] = useState<'background' | 'left' | 'right'>('background');
    const [position, setPosition] = useState(0);
    const [enabled, setEnabled] = useState(true);
    const [image, setImage] = useState<AssetRef | null>(null);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (banner) {
            setTitleEs(banner.titleEs);
            setTitleEn(banner.titleEn);
            setSubtitleEs(banner.subtitleEs ?? '');
            setSubtitleEn(banner.subtitleEn ?? '');
            setCtaLabelEs(banner.ctaLabelEs);
            setCtaLabelEn(banner.ctaLabelEn);
            setHref(banner.href);
            setAlign((banner.align as 'left' | 'center' | 'right') ?? 'left');
            setImageLayout((banner.imageLayout as 'background' | 'left' | 'right') ?? 'background');
            setPosition(banner.position);
            setEnabled(banner.enabled);
            setImage(banner.image ? { id: banner.image.id, preview: banner.image.preview } : null);
        }
    }, [banner]);

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const input = {
                titleEs,
                titleEn,
                subtitleEs: subtitleEs || null,
                subtitleEn: subtitleEn || null,
                ctaLabelEs,
                ctaLabelEn,
                href,
                imageId: image?.id ?? null,
                align,
                imageLayout,
                position,
                enabled,
            };
            const result = isNew
                ? await api.mutate(createBannerDocument, { input })
                : await api.mutate(updateBannerDocument, { id: id!, input });
            const payload = isNew ? result.createBanner : result.updateBanner;
            if (payload.__typename !== 'Banner') {
                setError(payload.message);
                return;
            }
            await queryClient.invalidateQueries({ queryKey: ['banner-list'] });
            void navigate({ to: '/banners/$id', params: { id: payload.id } });
        } catch (err) {
            // Previously uncaught — a network/GraphQL error would silently
            // reset the button with zero feedback, indistinguishable from
            // "Save does nothing".
            setError(err instanceof Error ? err.message : 'Something went wrong while saving.');
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        if (!banner) return;
        await api.mutate(deleteBannerDocument, { id: banner.id });
        await queryClient.invalidateQueries({ queryKey: ['banner-list'] });
        void navigate({ to: '/banners' });
    }

    if (!isNew && isLoading) {
        return (
            <Page pageId="banner-detail">
                <PageTitle>Banner</PageTitle>
                <PageLayout>
                    <FullWidthPageBlock blockId="form">
                        <p className="text-muted-foreground">Loading...</p>
                    </FullWidthPageBlock>
                </PageLayout>
            </Page>
        );
    }

    return (
        <Page pageId="banner-detail">
            <PageTitle>{isNew ? 'New banner' : titleEs || 'Banner'}</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    {!isNew && banner && (
                        <Button variant="outline" onClick={() => void remove()}>
                            Delete
                        </Button>
                    )}
                    <Button onClick={() => void save()} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <FullWidthPageBlock blockId="form">
                    <div className="max-w-2xl space-y-6">
                        {error && <div className="text-sm text-destructive">{error}</div>}

                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            <Switch checked={enabled} onCheckedChange={setEnabled} />
                            <div>
                                <p className="text-sm font-medium">Enabled</p>
                                <p className="text-xs text-muted-foreground">Disabled banners are kept but never shown in the storefront.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="titleEs">Title (Spanish)</Label>
                                <Input id="titleEs" value={titleEs} onChange={e => setTitleEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="titleEn">Title (English)</Label>
                                <Input id="titleEn" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subtitleEs">Subtitle (Spanish)</Label>
                                <Input id="subtitleEs" value={subtitleEs} onChange={e => setSubtitleEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subtitleEn">Subtitle (English)</Label>
                                <Input id="subtitleEn" value={subtitleEn} onChange={e => setSubtitleEn(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ctaLabelEs">Button text (Spanish)</Label>
                                <Input id="ctaLabelEs" value={ctaLabelEs} onChange={e => setCtaLabelEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ctaLabelEn">Button text (English)</Label>
                                <Input id="ctaLabelEn" value={ctaLabelEn} onChange={e => setCtaLabelEn(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="href">Destination URL</Label>
                            <Input
                                id="href"
                                value={href}
                                onChange={e => setHref(e.target.value)}
                                placeholder="/categorias/creatina-y-aminoacidos"
                            />
                            <p className="text-xs text-muted-foreground">A path on the storefront, e.g. /categorias/proteinas or /productos/iron-creatine.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Text alignment</Label>
                                <Select value={align} onValueChange={value => setAlign(value as typeof align)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALIGN_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="position">Position (lower shows first)</Label>
                                <Input
                                    id="position"
                                    type="number"
                                    value={position}
                                    onChange={e => setPosition(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Image layout</Label>
                            <Select value={imageLayout} onValueChange={value => setImageLayout(value as typeof imageLayout)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {IMAGE_LAYOUT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                "Full background" fills the whole slide with the image, text on top. "Left"/"right"
                                splits the slide in half, with the image on that side.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Image</Label>
                            <p className="text-xs text-muted-foreground">
                                Optional — without one the slide uses an Iron Savage brand gradient instead.
                            </p>
                            <div className="flex items-center gap-4">
                                {image && (
                                    <img src={image.preview + '?preset=thumb'} alt="" className="h-20 w-32 rounded object-cover border" />
                                )}
                                <Button variant="outline" onClick={() => setAssetPickerOpen(true)}>
                                    {image ? 'Change image' : 'Set image'}
                                </Button>
                                {image && (
                                    <Button variant="ghost" onClick={() => setImage(null)}>
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
                                setImage({ id: asset.id, preview: asset.preview });
                            }
                            setAssetPickerOpen(false);
                        }}
                    />
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}
