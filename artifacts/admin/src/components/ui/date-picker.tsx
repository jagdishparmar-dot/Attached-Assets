import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  /** Disable dates before this YYYY-MM-DD */
  min?: string;
  /** Disable dates after this YYYY-MM-DD */
  max?: string;
  align?: "start" | "center" | "end";
};

function parseValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  id,
  className,
  min,
  max,
  align = "start",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseValue(value);
  const minDate = parseValue(min);
  const maxDate = parseValue(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          <span className="truncate">
            {selected ? format(selected, "dd MMM yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align={align}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="label"
          className="p-4 [--cell-size:2.75rem]"
          disabled={(date) => {
            if (
              minDate &&
              date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
            ) {
              return true;
            }
            if (
              maxDate &&
              date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
            ) {
              return true;
            }
            return false;
          }}
          onSelect={(date) => {
            if (!date) {
              onChange?.("");
              return;
            }
            onChange?.(toValue(date));
            setOpen(false);
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              onChange?.(toValue(new Date()));
              setOpen(false);
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
