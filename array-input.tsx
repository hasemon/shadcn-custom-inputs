import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface MultiInputProps {
    values: string[];
    onChange: (values: string[]) => void;
    label?: string;
    placeholder?: string;
    addButtonText?: string;
    inputType?: 'input' | 'textarea';
    minItems?: number;
    maxItems?: number;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    name: string;
    inputClassName?: string;
    showIndex?: boolean;
    allowReorder?: boolean;
}

export default function ArrayInput({
                                       values = [],
                                       onChange,
                                       label = 'Items',
                                       placeholder = 'Enter an item...',
                                       addButtonText = 'Add Item',
                                       inputType = 'input',
                                       minItems = 1,
                                       maxItems = 10,
                                       required = false,
                                       disabled = false,
                                       className,
                                       name,
                                       inputClassName,
                                       showIndex = false,
                                       allowReorder = false,
                                   }: MultiInputProps) {
    useEffect(() => {
        if (values.length < minItems) {
            const filled = [...values];
            while (filled.length < minItems) filled.push('');
            onChange(filled);
        }
    }, []);

    const addItem = () => {
        if (values.length < maxItems) {
            onChange([...values, '']);
        }
    };

    const removeItem = (index: number) => {
        if (values.length > minItems) {
            const newValues = values.filter((_, i) => i !== index);
            onChange(newValues);
        }
    };

    const updateItem = (index: number, value: string) => {
        const newValues = values.map((item, i) => (i === index ? value : item));
        onChange(newValues);
    };

    const displayValues = values.length === 0 ? Array(minItems).fill('') : values;

    const canAddMore = values.length < maxItems;
    const canRemove = values.length > minItems;

    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </Label>
                <Button type="button" variant="default" size="sm" onClick={addItem} disabled={!canAddMore || disabled}>
                    <Plus className="h-4 w-4" />
                    {addButtonText}
                </Button>
            </div>

            <div className="space-y-2">
                {displayValues.map((value, index) => (
                    <div key={index} className="flex items-start gap-2">
                        {allowReorder && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-1 h-8 w-8 cursor-grab p-1 active:cursor-grabbing"
                                disabled={disabled}
                            >
                                <GripVertical className="h-4 w-4" />
                            </Button>
                        )}

                        {showIndex && (
                            <div className="mt-0.5 flex h-9 w-8 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                                {index + 1}
                            </div>
                        )}

                        <div className="flex-1">
                            {inputType === 'textarea' ? (
                                <Textarea
                                    name={`${name}[${index}]`}
                                    value={value}
                                    onChange={(e) => updateItem(index, e.target.value)}
                                    placeholder={placeholder}
                                    disabled={disabled}
                                    className={cn('min-h-[80px]', inputClassName)}
                                    rows={3}
                                />
                            ) : (
                                <Input
                                    type="text"
                                    name={`${name}[${index}]`}
                                    value={value}
                                    onChange={(e) => updateItem(index, e.target.value)}
                                    placeholder={placeholder}
                                    disabled={disabled}
                                    className={inputClassName}
                                />
                            )}
                        </div>

                        {canRemove && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeItem(index)}
                                disabled={disabled}
                                className="mt-0.5 flex-shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {maxItems > 1 && (
                <p className="text-xs text-muted-foreground">
                    {values.length} of {maxItems} items
                    {minItems > 0 && ` (minimum ${minItems})`}
                </p>
            )}
        </div>
    );
}
