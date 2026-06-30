import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { useBulkCreateDeliveries } from "@workspace/api-client-react";
import type { DeliveryInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TEMPLATE_COLUMNS = [
  "orderNumber",
  "customerId",
  "deliveryAddress",
  "deliveryCity",
  "deliveryArea",
  "deliveryDate",
  "deliveryWindow",
  "priority",
  "invoiceNumber",
  "specialHandling",
  "remarks",
  "productName",
  "productQuantity",
] as const;

const REQUIRED_COLUMNS = [
  "orderNumber",
  "customerId",
  "deliveryAddress",
  "deliveryCity",
  "deliveryDate",
  "deliveryWindow",
  "priority",
] as const;

const VALID_PRIORITIES: DeliveryInput["priority"][] = ["high", "normal", "low"];

function clean(value: string | undefined): string {
  return (value ?? "").toString().trim();
}

function optional(value: string | undefined): string | undefined {
  const v = clean(value);
  return v.length > 0 ? v : undefined;
}

function downloadTemplate() {
  const sample = {
    orderNumber: "DC-2026-0001",
    customerId: "1",
    deliveryAddress: "12 Industrial Area, Phase 2",
    deliveryCity: "Bangalore",
    deliveryArea: "Whitefield",
    deliveryDate: "2026-07-15",
    deliveryWindow: "08:00-12:00",
    priority: "normal",
    invoiceNumber: "INV-1001",
    specialHandling: "Keep frozen",
    remarks: "Call before arrival",
    productName: "Frozen Peas 1kg",
    productQuantity: "10",
  };
  const csv = Papa.unparse({ fields: [...TEMPLATE_COLUMNS], data: [sample] });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "delivery-upload-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkUploadDeliveryDialog({ onImported }: { onImported?: () => void }) {
  const { toast } = useToast();
  const bulkCreate = useBulkCreateDeliveries();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<DeliveryInput[]>([]);
  const [sourceRows, setSourceRows] = useState<number[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: number; failed: number; errors: { row: number; message: string }[] } | null>(null);

  const reset = () => {
    setFileName("");
    setRows([]);
    setSourceRows([]);
    setParseErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseErrors([]);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (parsed) => {
        const valid: DeliveryInput[] = [];
        const validSourceRows: number[] = [];
        const errs: string[] = [];

        parsed.data.forEach((raw, idx) => {
          const rowNum = idx + 2; // +1 for header, +1 for 1-based
          const missing = REQUIRED_COLUMNS.filter((col) => clean(raw[col]).length === 0);
          if (missing.length > 0) {
            errs.push(`Row ${rowNum}: missing ${missing.join(", ")}`);
            return;
          }

          const customerId = Number(clean(raw.customerId));
          if (!Number.isInteger(customerId) || customerId <= 0) {
            errs.push(`Row ${rowNum}: customerId must be a valid number`);
            return;
          }

          const priority = clean(raw.priority).toLowerCase() as DeliveryInput["priority"];
          if (!VALID_PRIORITIES.includes(priority)) {
            errs.push(`Row ${rowNum}: invalid priority "${clean(raw.priority)}" (use high, normal, or low)`);
            return;
          }

          const productName = optional(raw.productName);
          const products = productName
            ? [{ name: productName, quantity: Number(clean(raw.productQuantity)) || 1 }]
            : [];

          valid.push({
            orderNumber: clean(raw.orderNumber),
            customerId,
            deliveryAddress: clean(raw.deliveryAddress),
            deliveryCity: clean(raw.deliveryCity),
            deliveryArea: optional(raw.deliveryArea) ?? null,
            deliveryDate: clean(raw.deliveryDate),
            deliveryWindow: clean(raw.deliveryWindow),
            priority,
            invoiceNumber: optional(raw.invoiceNumber) ?? null,
            specialHandling: optional(raw.specialHandling) ?? null,
            remarks: optional(raw.remarks) ?? null,
            products,
          });
          validSourceRows.push(rowNum);
        });

        setRows(valid);
        setSourceRows(validSourceRows);
        setParseErrors(errs);
      },
      error: () => {
        setParseErrors(["Could not read this file. Make sure it is a valid CSV."]);
      },
    });
  };

  const handleImport = () => {
    if (rows.length === 0) return;
    bulkCreate.mutate(
      { data: { deliveries: rows } },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.created > 0) {
            toast({ title: "Import complete", description: `${data.created} delivery(ies) added.` });
            onImported?.();
          }
          if (data.created === 0 && data.failed > 0) {
            toast({ title: "Nothing imported", description: "All rows failed. See details below.", variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "Import failed", description: "The server rejected the upload.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Bulk Upload
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk upload deliveries</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add many deliveries at once. Use the template so the columns match.
            The customerId must match an existing customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="secondary" size="sm" onClick={downloadTemplate} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download CSV template
          </Button>

          <div className="rounded-md border border-dashed p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            {fileName && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName} — {rows.length} valid row(s)
                {parseErrors.length > 0 && `, ${parseErrors.length} skipped`}
              </p>
            )}
          </div>

          {parseErrors.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <p className="mb-1 flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4 w-4" />
                These rows were skipped
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {result && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {result.created} added
                {result.failed > 0 && <span className="text-destructive">· {result.failed} failed</span>}
              </p>
              {result.errors.length > 0 && (
                <ul className="max-h-32 list-inside list-disc space-y-0.5 overflow-y-auto text-destructive">
                  {result.errors.map((err, i) => (
                    <li key={i}>Row {sourceRows[err.row - 1] ?? err.row}: {err.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || bulkCreate.isPending}>
            {bulkCreate.isPending ? "Importing..." : `Import ${rows.length || ""} delivery(ies)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
