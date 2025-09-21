import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {Image} from "@/components/utils/image"
import { MediaType } from '@/types/media-type';

export interface ComboboxOption<T = unknown> {
    value: string | number
    label: string
    data?: T & { media?: MediaType[] }
    disabled?: boolean
}

interface ComboboxProps<T = unknown> {
    options: ComboboxOption<T>[]
    value?: string | number | (string | number)[]
    onValueChange: (value: string | number | (string | number)[] | undefined) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    multiple?: boolean
    disabled?: boolean
    className?: string
    maxSelectedDisplay?: number
    renderOption?: (option: ComboboxOption<T>) => React.ReactNode
    renderSelected?: (option: ComboboxOption<T>) => React.ReactNode
    allowClear?: boolean
    label?: string
    error?: string
    name?: string
}

export function Combobox<T = unknown>({
                                          options,
                                          value,
                                          onValueChange,
                                          placeholder = "Select option...",
                                          searchPlaceholder = "Search...",
                                          emptyMessage = "No options found.",
                                          multiple = false,
                                          disabled = false,
                                          className,
                                          maxSelectedDisplay = 3,
                                          renderOption,
                                          renderSelected,
                                          allowClear = true,
                                          label,
                                          error,
                                          name,
                                      }: ComboboxProps<T>) {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    const selectedValues = React.useMemo(() => {
        if (value === undefined || value === null) return []
        return Array.isArray(value) ? value : [value]
    }, [value])

    const selectedOptions = React.useMemo(() => {
        return options.filter((option) => selectedValues.includes(option.value))
    }, [options, selectedValues])

    const filteredOptions = React.useMemo(() => {
        if (!searchValue) return options
        return options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
    }, [options, searchValue])

    const handleSelect = (optionValue: string | number) => {
        if (multiple) {
            const newValues = selectedValues.includes(optionValue)
                ? selectedValues.filter((v) => v !== optionValue)
                : [...selectedValues, optionValue]
            onValueChange(newValues)
        } else {
            onValueChange(optionValue)
            setOpen(false)
        }
        setSearchValue("")
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onValueChange(multiple ? [] : undefined)
    }

    const handleRemoveSelected = (optionValue: string | number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (multiple) {
            const newValues = selectedValues.filter((v) => v !== optionValue)
            onValueChange(newValues)
        }
    }

    const getDisplayText = () => {
        if (selectedOptions.length === 0) return placeholder

        if (!multiple) {
            const option = selectedOptions[0]
            return renderSelected ? renderSelected(option) : option.label
        }

        if (selectedOptions.length <= maxSelectedDisplay) {
            return null
        }

        return `${selectedOptions.length} selected`
    }

    const displayText = getDisplayText()

    return (
        <div className={cn("space-y-2", className)}>
            {label && <p className="text-sm leading-none font-medium">{label}</p>}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "h-auto min-h-8 w-full justify-between bg-transparent",
                            error && "border-red-500",
                            disabled && "cursor-not-allowed opacity-50",
                        )}
                        disabled={disabled}
                    >
                        <div className="flex flex-1 flex-wrap items-center gap-1">
                            {multiple && selectedOptions.length > 0 && selectedOptions.length <= maxSelectedDisplay ? (
                                selectedOptions.map((option) => (
                                    <Badge key={option.value} variant="secondary" className="text-xs">
                                        {renderSelected ? renderSelected(option) : option.label}
                                        <div
                                            className="ml-1 rounded-full ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault()
                                                    handleRemoveSelected(option.value, e as never)
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }}
                                            onClick={(e) => handleRemoveSelected(option.value, e)}
                                        >
                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </div>
                                    </Badge>
                                ))
                            ) : (
                                <span className={cn("truncate", selectedOptions.length === 0 && "text-muted-foreground")}>
                  {displayText}
                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {allowClear && selectedOptions.length > 0 && (
                                <div
                                    onClick={handleClear}
                                    className="rounded-full ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            handleClear(e as never)
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                >
                                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </div>
                            )}
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} value={searchValue} onValueChange={setSearchValue} />
                        <CommandList>
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            <CommandGroup>
                                {filteredOptions.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={String(option.value)}
                                        onSelect={() => handleSelect(option.value)}
                                        disabled={option.disabled}
                                        className={cn("cursor-pointer", option.disabled && "cursor-not-allowed opacity-50")}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedValues.includes(option.value) ? "opacity-100" : "opacity-0",
                                            )}
                                        />
                                        {renderOption ? (
                                            renderOption(option)
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {option.data?.media?.[0] && (
                                                    <Image
                                                        src={option.data.media[0].url}
                                                        alt={option.label}
                                                        className="w-5 h-5 object-cover rounded-sm"
                                                    />
                                                )}
                                                <span>{option.label}</span>
                                            </div>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500">{error}</p>}

            {name && (
                !multiple ? (
                    <input type="hidden" name={name} value={selectedValues[0] ?? ""} />
                ) : (
                    selectedValues.map((val, idx) => (
                        <input key={idx} type="hidden" name={`${name}[]`} value={val} />
                    ))
                )
            )}

        </div>
    )
}
