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
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { adminBannerDetailDocument, createBannerDocument, deleteBannerDocument, updateBannerDocument } from './graphql';

interface AssetRef {
    id: string;
    preview: string;
}

const ALIGN_OPTIONS = [
    { value: 'left', label: msg`Left` },
    { value: 'center', label: msg`Center` },
    { value: 'right', label: msg`Right` },
] as const;

const IMAGE_LAYOUT_OPTIONS = [
    { value: 'background', label: msg`Full background (image behind text)` },
    { value: 'left', label: msg`Image on the left, text on the right` },
    { value: 'right', label: msg`Image on the right, text on the left` },
] as const;

export function BannerFormPage() {
    const { t, i18n } = useLingui();
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
            // Antes no se capturaba: un error de red o de GraphQL reiniciaba el botón
            // sin ningún aviso, como si «Guardar» no hiciera nada.
            setError(err instanceof Error ? err.message : t`Something went wrong while saving.`);
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
                <PageTitle><Trans>Banner</Trans></PageTitle>
                <PageLayout>
                    <FullWidthPageBlock blockId="form">
                        <p className="text-muted-foreground"><Trans>Loading...</Trans></p>
                    </FullWidthPageBlock>
                </PageLayout>
            </Page>
        );
    }

    return (
        <Page pageId="banner-detail">
            <PageTitle>{isNew ? <Trans>New banner</Trans> : titleEs || <Trans>Banner</Trans>}</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    {!isNew && banner && (
                        <Button variant="outline" onClick={() => void remove()}>
                            <Trans>Delete</Trans>
                        </Button>
                    )}
                    <Button onClick={() => void save()} disabled={saving}>
                        {saving ? <Trans>Saving...</Trans> : <Trans>Save</Trans>}
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
                                <p className="text-sm font-medium"><Trans>Enabled</Trans></p>
                                <p className="text-xs text-muted-foreground"><Trans>Disabled banners are kept but never shown in the storefront.</Trans></p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="titleEs"><Trans>Title (Spanish)</Trans></Label>
                                <Input id="titleEs" value={titleEs} onChange={e => setTitleEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="titleEn"><Trans>Title (English)</Trans></Label>
                                <Input id="titleEn" value={titleEn} onChange={e => setTitleEn(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subtitleEs"><Trans>Subtitle (Spanish)</Trans></Label>
                                <Input id="subtitleEs" value={subtitleEs} onChange={e => setSubtitleEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subtitleEn"><Trans>Subtitle (English)</Trans></Label>
                                <Input id="subtitleEn" value={subtitleEn} onChange={e => setSubtitleEn(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ctaLabelEs"><Trans>Button text (Spanish)</Trans></Label>
                                <Input id="ctaLabelEs" value={ctaLabelEs} onChange={e => setCtaLabelEs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ctaLabelEn"><Trans>Button text (English)</Trans></Label>
                                <Input id="ctaLabelEn" value={ctaLabelEn} onChange={e => setCtaLabelEn(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="href"><Trans>Destination URL</Trans></Label>
                            <Input
                                id="href"
                                value={href}
                                onChange={e => setHref(e.target.value)}
                                placeholder="/categorias/creatina-y-aminoacidos"
                            />
                            <p className="text-xs text-muted-foreground"><Trans>A path on the storefront, e.g. /categorias/proteinas or /productos/iron-creatine.</Trans></p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label><Trans>Text alignment</Trans></Label>
                                <Select value={align} onValueChange={value => setAlign(value as typeof align)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALIGN_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {i18n._(opt.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="position"><Trans>Position (lower shows first)</Trans></Label>
                                <Input
                                    id="position"
                                    type="number"
                                    value={position}
                                    onChange={e => setPosition(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label><Trans>Image layout</Trans></Label>
                            <Select value={imageLayout} onValueChange={value => setImageLayout(value as typeof imageLayout)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {IMAGE_LAYOUT_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {i18n._(opt.label)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                <Trans>"Full background" fills the whole slide with the image, text on top. "Left"/"right" splits the slide in half, with the image on that side.</Trans>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label><Trans>Image</Trans></Label>
                            <p className="text-xs text-muted-foreground">
                                <Trans>Optional — without one the slide uses an Iron Savage brand gradient instead.</Trans>
                            </p>
                            <div className="flex items-center gap-4">
                                {image && (
                                    <img src={image.preview + '?preset=thumb'} alt="" className="h-20 w-32 rounded object-cover border" />
                                )}
                                <Button variant="outline" onClick={() => setAssetPickerOpen(true)}>
                                    {image ? <Trans>Change image</Trans> : <Trans>Set image</Trans>}
                                </Button>
                                {image && (
                                    <Button variant="ghost" onClick={() => setImage(null)}>
                                        <Trans>Remove</Trans>
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
