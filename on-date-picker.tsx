import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DatePickerProps {
    date?: Date
    onDateChange?: (date: Date | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    id?: string
    name?: string
    required?: boolean
    autoFocus?: boolean
    tabIndex?: number
    error?: string
    includeTime?: boolean
    yearRange?: { start: number; end: number }
}

export function DatePicker({
                               date,
                               onDateChange,
                               placeholder = "Pick a date",
                               disabled = false,
                               className,
                               id,
                               name,
                               required = false,
                               autoFocus = false,
                               tabIndex,
                               error,
                               includeTime = false,
                               yearRange = { start: 1900, end: 2100 },
                           }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [currentMonth, setCurrentMonth] = React.useState(date || new Date())

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate && includeTime && date) {
            selectedDate.setHours(date.getHours())
            selectedDate.setMinutes(date.getMinutes())
        }
        onDateChange?.(selectedDate)
        if (!includeTime) {
            setOpen(false)
        }
    }

    const handleTimeChange = (type: "hours" | "minutes", value: string) => {
        if (!date) return
        const newDate = new Date(date)
        if (type === "hours") {
            newDate.setHours(Number.parseInt(value) || 0)
        } else {
            newDate.setMinutes(Number.parseInt(value) || 0)
        }
        onDateChange?.(newDate)
    }

    const handleYearChange = (year: string) => {
        const newDate = new Date(currentMonth)
        newDate.setFullYear(Number.parseInt(year))
        setCurrentMonth(newDate)
    }

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth)
        if (direction === "prev") {
            newDate.setMonth(newDate.getMonth() - 1)
        } else {
            newDate.setMonth(newDate.getMonth() + 1)
        }
        setCurrentMonth(newDate)
    }

    const yearOptions = Array.from({ length: yearRange.end - yearRange.start + 1 }, (_, i) => yearRange.start + i)

    return (
        <div className="grid gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                            className,
                        )}
                        disabled={disabled}
                        id={id}
                        autoFocus={autoFocus}
                        tabIndex={tabIndex}
                        aria-required={required}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, includeTime ? "PPP p" : "PPP") : <span>{placeholder}</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                        <div className="flex items-center justify-between mb-2">
                            <Button variant="outline" size="sm" onClick={() => handleMonthChange("prev")} className="h-7 w-7 p-0">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-2">
                                <Select value={currentMonth.getFullYear().toString()} onValueChange={handleYearChange}>
                                    <SelectTrigger className="w-20 h-7">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <span className="text-sm font-medium">{format(currentMonth, "MMMM")}</span>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => handleMonthChange("next")} className="h-7 w-7 p-0">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        initialFocus
                    />

                    {includeTime && (
                        <div className="p-3 border-t">
                            <Label className="text-sm font-medium mb-2 block">Time</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={date?.getHours() || 0}
                                        onChange={(e) => handleTimeChange("hours", e.target.value)}
                                        className="w-16 h-8 text-center"
                                        placeholder="HH"
                                    />
                                    <span className="text-sm">:</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={date?.getMinutes() || 0}
                                        onChange={(e) => handleTimeChange("minutes", e.target.value)}
                                        className="w-16 h-8 text-center"
                                        placeholder="MM"
                                    />
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setOpen(false)} className="ml-auto">
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={date ? format(date, includeTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd") : ""}
                />
            )}

            {error && (
                <div id={`${id}-error`} className="text-sm text-red-500 mt-1">
                    {error}
                </div>
            )}
        </div>
    )
}
