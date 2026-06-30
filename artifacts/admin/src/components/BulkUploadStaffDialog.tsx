import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { useBulkCreateStaff } from "@workspace/api-client-react";
import type { StaffInput } from "@workspace/api-client-react";
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
  "name",
  "employeeId",
  "role",
  "phone",
  "hub",
  "joiningDate",
  "password",
  "address",
  "emergencyContact",
  "aadhaarNumber",
  "panNumber",
  "licenseNumber",
  "licenseExpiry",
  "shiftStart",
  "shiftEnd",
] as const;

const REQUIRED_COLUMNS = ["name", "employeeId", "role", "phone", "hub", "joiningDate", "password"] as const;

const VALID_ROLES: StaffInput["role"][] = ["driver", "picker", "sorter", "loader", "supervisor", "security", "house_keeper"];

interface ParsedStaff {
  name: string;
  employeeId: string;
  role: StaffInput["role"];
  phone: string;
  hub: string;
  joiningDate: string;
  password: string;
  address?: string;
  emergencyContact?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  shiftStart?: string;
  shiftEnd?: string;
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
    name: "Ramesh Kumar",
    employeeId: "EMP101",
    role: "driver",
    phone: "9876543210",
    hub: "Mumbai Central Hub",
    joiningDate: "2025-01-15",
    password: "changeme123",
    address: "12 Industrial Area, Phase 2",
    emergencyContact: "9876500000",
    aadhaarNumber: "123412341234",
    panNumber: "ABCDE1234F",
    licenseNumber: "MH0120250001",
    licenseExpiry: "2030-01-15",
    shiftStart: "08:00",
    shiftEnd: "17:00",
  };
  const csv = Papa.unparse({ fields: [...TEMPLATE_COLUMNS], data: [sample] });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "staff-upload-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkUploadStaffDialog({ onImported }: { onImported?: () => void }) {
  const { toast } = useToast();
  const bulkCreate = useBulkCreateStaff();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedStaff[]>([]);
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
        const valid: ParsedStaff[] = [];
        const validSourceRows: number[] = [];
        const errs: string[] = [];

        parsed.data.forEach((raw, idx) => {
          const rowNum = idx + 2; // +1 for header, +1 for 1-based
          const missing = REQUIRED_COLUMNS.filter((col) => clean(raw[col]).length === 0);
          if (missing.length > 0) {
            errs.push(`Row ${rowNum}: missing ${missing.join(", ")}`);
            return;
          }
          const role = clean(raw.role).toLowerCase() as StaffInput["role"];
          if (!VALID_ROLES.includes(role)) {
            errs.push(`Row ${rowNum}: invalid role "${clean(raw.role)}"`);
            return;
          }
          valid.push({
            name: clean(raw.name),
            employeeId: clean(raw.employeeId),
            role,
            phone: clean(raw.phone),
            hub: clean(raw.hub),
            joiningDate: clean(raw.joiningDate),
            password: clean(raw.password),
            address: optional(raw.address),
            emergencyContact: optional(raw.emergencyContact),
            aadhaarNumber: optional(raw.aadhaarNumber),
            panNumber: optional(raw.panNumber),
            licenseNumber: optional(raw.licenseNumber),
            licenseExpiry: optional(raw.licenseExpiry),
            shiftStart: optional(raw.shiftStart),
            shiftEnd: optional(raw.shiftEnd),
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
      { data: { staff: rows } },
      {
        onSuccess: (data) => {
          setResult(data);
          if (data.created > 0) {
            toast({ title: "Import complete", description: `${data.created} staff member(s) added.` });
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
          <DialogTitle>Bulk upload staff</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add many staff members at once. Use the template so the columns match.
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
            {bulkCreate.isPending ? "Importing..." : `Import ${rows.length || ""} staff`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
