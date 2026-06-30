import React, { useRef, useState } from "react";
import { useLocation } from "wouter";
import Papa from "papaparse";
import { useListCustomers, useBulkCreateCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Plus, Search, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { useToast } from "@/hooks/use-toast";

const TEMPLATE_COLUMNS = [
  "customerCode",
  "companyName",
  "address",
  "city",
  "area",
  "contactPerson",
  "phone",
  "email",
  "deliveryWindow",
  "specialInstructions",
] as const;

const REQUIRED_COLUMNS = ["customerCode", "companyName", "address", "city", "contactPerson", "phone"] as const;

interface ParsedCustomer {
  customerCode: string;
  companyName: string;
  address: string;
  city: string;
  area?: string;
  contactPerson: string;
  phone: string;
  email?: string;
  deliveryWindow?: string;
  specialInstructions?: string;
}

function clean(value: string | undefined): string {
  return (value ?? "").toString().trim();
}

function optional(value: string | undefined): string | undefined {
  const v = clean(value);
  return v.length > 0 ? v : undefined;
}

function downloadTemplate() {
  const sample = {
    customerCode: "CUST001",
    companyName: "Acme Cold Storage",
    address: "12 Industrial Area, Phase 2",
    city: "Bangalore",
    area: "Whitefield",
    contactPerson: "Ramesh Kumar",
    phone: "9876543210",
    email: "ramesh@acme.com",
    deliveryWindow: "08:00-12:00",
    specialInstructions: "Call before arrival",
  };
  const csv = Papa.unparse({ fields: [...TEMPLATE_COLUMNS], data: [sample] });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "customer-upload-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function BulkUploadDialog({ onImported }: { onImported: () => void }) {
  const { toast } = useToast();
  const bulkCreate = useBulkCreateCustomers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedCustomer[]>([]);
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
        const valid: ParsedCustomer[] = [];
        const validSourceRows: number[] = [];
        const errs: string[] = [];

        parsed.data.forEach((raw, idx) => {
          const rowNum = idx + 2; // +1 for header, +1 for 1-based
          const missing = REQUIRED_COLUMNS.filter((col) => clean(raw[col]).length === 0);
          if (missing.length > 0) {
            errs.push(`Row ${rowNum}: missing ${missing.join(", ")}`);
            return;
          }
          valid.push({
            customerCode: clean(raw.customerCode),
            companyName: clean(raw.companyName),
            address: clean(raw.address),
            city: clean(raw.city),
            area: optional(raw.area),
            contactPerson: clean(raw.contactPerson),
            phone: clean(raw.phone),
            email: optional(raw.email),
            deliveryWindow: optional(raw.deliveryWindow),
            specialInstructions: optional(raw.specialInstructions),
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
      { data: { customers: rows } },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.created > 0) {
            toast({ title: "Import complete", description: `${data.created} customer(s) added.` });
            onImported();
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
          <DialogTitle>Bulk upload customers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add many customers at once. Use the template so the columns match.
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
            {bulkCreate.isPending ? "Importing..." : `Import ${rows.length || ""} customer(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: customers, isLoading, refetch } = useListCustomers();

  const filteredCustomers = customers?.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(s) ||
      c.customerCode.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <div className="flex items-center gap-2">
          <BulkUploadDialog onImported={() => refetch()} />
          <Button onClick={() => navigate("/admin/customers/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by company or code..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !filteredCustomers || filteredCustomers.length === 0 ? (
            <Empty>
              <div className="flex flex-col items-center gap-2 text-center py-8">
                <Building2 className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-lg font-medium">No customers found</p>
                <p className="text-sm text-muted-foreground">Add a new customer to get started.</p>
              </div>
            </Empty>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Total Deliveries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">{customer.customerCode}</TableCell>
                      <TableCell>{customer.companyName}</TableCell>
                      <TableCell>{customer.contactPerson}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.city}</TableCell>
                      <TableCell className="text-right">{customer.totalDeliveries || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
