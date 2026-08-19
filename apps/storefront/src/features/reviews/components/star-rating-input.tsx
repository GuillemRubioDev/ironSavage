'use client';

import {useState} from 'react';
import {Star} from 'lucide-react';
import {cn} from '@/lib/utils';

interface StarRatingInputProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function StarRatingInput({value, onChange, disabled}: StarRatingInputProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const displayValue = hovered ?? value;

    return (
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    className="disabled:cursor-not-allowed disabled:opacity-50"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onChange(star)}
                    aria-checked={value === star}
                    role="radio"
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                    <Star
                        className={cn(
                            'h-6 w-6 transition-colors',
                            star <= displayValue ? 'fill-primary text-primary' : 'fill-none text-muted-foreground'
                        )}
                    />
                </button>
            ))}
        </div>
    );
}
