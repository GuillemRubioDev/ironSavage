import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@vendure/dashboard';
import { useState } from 'react';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type RewardType = 'PERCENTAGE' | 'FIXED_POINTS';

export interface AthleteCodeFormValue {
    code: string;
    enabled: boolean;
    discountType: DiscountType;
    /** Percentage, or euros (converted to cents on submit) for FIXED_AMOUNT. */
    discountValue: string;
    rewardType: RewardType;
    rewardValue: string;
}

export const EMPTY_CODE_FORM: AthleteCodeFormValue = {
    code: '',
    enabled: true,
    discountType: 'PERCENTAGE',
    discountValue: '10',
    rewardType: 'PERCENTAGE',
    rewardValue: '5',
};

/** API shape → form shape (fixed discounts are edited in euros, stored in cents). */
export function codeToFormValue(code: {
    code: string;
    enabled: boolean;
    discountType: string;
    discountValue: number;
    rewardType: string;
    rewardValue: number;
}): AthleteCodeFormValue {
    return {
        code: code.code,
        enabled: code.enabled,
        discountType: code.discountType as DiscountType,
        discountValue: String(code.discountType === 'FIXED_AMOUNT' ? code.discountValue / 100 : code.discountValue),
        rewardType: code.rewardType as RewardType,
        rewardValue: String(code.rewardValue),
    };
}

/** Form shape → API input. Server-side validation is authoritative; this only converts units. */
export function formValueToInput(value: AthleteCodeFormValue) {
    const discount = Number(value.discountValue.replace(',', '.'));
    const reward = Number(value.rewardValue.replace(',', '.'));
    return {
        code: value.code.trim().toUpperCase(),
        enabled: value.enabled,
        discountType: value.discountType,
        discountValue: value.discountType === 'FIXED_AMOUNT' ? Math.round(discount * 100) : discount,
        rewardType: value.rewardType,
        rewardValue: reward,
    };
}

export function formatDiscount(discountType: string, discountValue: number, currencyCode = 'EUR'): string {
    return discountType === 'FIXED_AMOUNT' ? formatMoney(discountValue, currencyCode) : `${discountValue}%`;
}

export function formatReward(rewardType: string, rewardValue: number): string {
    return rewardType === 'FIXED_POINTS' ? `${rewardValue} pts / order` : `${rewardValue}%`;
}

export function formatMoney(amountInMinorUnits: number, currencyCode = 'EUR'): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amountInMinorUnits / 100);
}

interface AthleteCodeFormProps {
    initialValue: AthleteCodeFormValue;
    submitLabel: string;
    onSubmit: (value: AthleteCodeFormValue) => Promise<void> | void;
    onCancel?: () => void;
    /** When embedded in another form (new athlete page), render fields only. */
    fieldsOnly?: boolean;
    onChange?: (value: AthleteCodeFormValue) => void;
}

export function AthleteCodeForm({ initialValue, submitLabel, onSubmit, onCancel, fieldsOnly, onChange }: AthleteCodeFormProps) {
    const [value, setValue] = useState<AthleteCodeFormValue>(initialValue);
    const [saving, setSaving] = useState(false);

    function update(patch: Partial<AthleteCodeFormValue>) {
        const next = { ...value, ...patch };
        setValue(next);
        onChange?.(next);
    }

    const fields = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
                <Label htmlFor="athlete-code">Code</Label>
                <Input
                    id="athlete-code"
                    value={value.code}
                    onChange={e => update({ code: e.target.value.toUpperCase() })}
                    placeholder="PEDRO10"
                    maxLength={32}
                />
                <p className="text-xs text-muted-foreground">Letters, digits, "-" and "_". Not case-sensitive.</p>
            </div>
            <div className="space-y-1">
                <Label>Customer discount</Label>
                <div className="flex gap-2">
                    <Select value={value.discountType} onValueChange={v => update({ discountType: v as DiscountType })}>
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                            <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-28"
                        value={value.discountValue}
                        onChange={e => update({ discountValue: e.target.value })}
                    />
                    <span className="self-center text-sm text-muted-foreground">{value.discountType === 'PERCENTAGE' ? '%' : '€'}</span>
                </div>
                <p className="text-xs text-muted-foreground">What the customer saves when using the code.</p>
            </div>
            <div className="space-y-1">
                <Label>Athlete reward</Label>
                <div className="flex gap-2">
                    <Select value={value.rewardType} onValueChange={v => update({ rewardType: v as RewardType })}>
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                            <SelectItem value="FIXED_POINTS">Fixed points</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        min={0}
                        step={value.rewardType === 'PERCENTAGE' ? '0.01' : '1'}
                        className="w-28"
                        value={value.rewardValue}
                        onChange={e => update({ rewardValue: e.target.value })}
                    />
                    <span className="self-center text-sm text-muted-foreground">{value.rewardType === 'PERCENTAGE' ? '%' : 'pts'}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Percentage of the order (products after discounts, excl. shipping), paid in points at the loyalty program's point value.
                </p>
            </div>
            <div className="flex items-center gap-3 md:col-span-3">
                <Switch checked={value.enabled} onCheckedChange={enabled => update({ enabled })} />
                <Label>Code active</Label>
            </div>
        </div>
    );

    if (fieldsOnly) {
        return fields;
    }

    return (
        <form
            className="space-y-4 rounded-lg border p-4"
            onSubmit={async e => {
                e.preventDefault();
                setSaving(true);
                try {
                    await onSubmit(value);
                } finally {
                    setSaving(false);
                }
            }}
        >
            {fields}
            <div className="flex gap-2">
                <Button type="submit" disabled={saving || !value.code.trim()}>
                    {saving ? 'Saving…' : submitLabel}
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
            </div>
        </form>
    );
}
