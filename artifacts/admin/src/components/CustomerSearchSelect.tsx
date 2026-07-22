import React, { useState } from "react";
import type { Customer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue, usePaginatedQuery } from "@/hooks/use-paginated-query";

type CustomerSearchSelectProps = {
  value: string;
  onSelect: (customer: Customer) => void;
  disabled?: boolean;
};

export function CustomerSearchSelect({ value, onSelect, disabled }: CustomerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data, isLoading, isFetching } = usePaginatedQuery<Customer>(
    "customers-search",
    "/api/customers",
    {
      page: 1,
      pageSize: 30,
      q: debouncedSearch || undefined,
    },
    { enabled: open || !!value },
  );

  const customers = data?.items ?? [];
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const display =
    selectedCustomer && String(selectedCustomer.id) === value
      ? selectedCustomer
      : customers.find((c) => String(c.id) === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between font-normal",
            !display && "text-muted-foreground",
          )}
        >
          {display ? (
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-medium text-foreground">{display.companyName}</span>
              <span className="truncate text-xs text-muted-foreground font-mono">
                {display.customerCode}
              </span>
            </span>
          ) : (
            <span>Search customer by name or code…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search customers…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading || isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : customers.length === 0 ? (
              <CommandEmpty>No customers found.</CommandEmpty>
            ) : (
              <>
                <CommandGroup>
                  {customers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.companyName} ${c.customerCode}`}
                      onSelect={() => {
                        setSelectedCustomer(c);
                        onSelect(c);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === String(c.id) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.companyName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{c.customerCode}</span>
                          {c.city ? ` · ${c.city}` : ""}
                          {c.area ? ` · ${c.area}` : ""}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {data && data.total > customers.length && (
                  <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                    Showing {customers.length} of {data.total.toLocaleString()} — refine search for more
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
