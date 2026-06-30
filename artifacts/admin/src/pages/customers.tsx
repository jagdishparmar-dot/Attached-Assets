import { useState } from "react";
import { useLocation } from "wouter";
import { useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Search } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";

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
