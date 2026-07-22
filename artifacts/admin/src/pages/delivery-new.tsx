import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateDelivery } from "@workspace/api-client-react";
import type { Customer } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Package,
  MapPin,
  FileText,
  RefreshCw,
  Phone,
  User,
  Building2,
} from "lucide-react";
import { CustomerSearchSelect } from "@/components/CustomerSearchSelect";
import { DatePicker } from "@/components/ui/date-picker";

type ProductLine = {
  name: string;
  quantity: number;
  weight: string;
  temperature: string;
  amount: string;
};

const EMPTY_PRODUCT: ProductLine = {
  name: "",
  quantity: 1,
  weight: "",
  temperature: "",
  amount: "",
};

export default function DeliveryNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createDelivery = useCreateDelivery();

  const [formData, setFormData] = useState({
    customerId: "",
    orderNumber: "",
    invoiceNumber: "",
    deliveryAddress: "",
    deliveryArea: "",
    deliveryCity: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    deliveryWindow: "08:00-12:00",
    priority: "normal" as "low" | "normal" | "high",
    specialHandling: "",
    remarks: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<ProductLine[]>([{ ...EMPTY_PRODUCT }]);

  useEffect(() => {
    fetch("/api/deliveries/next-dc-number", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { orderNumber: string }) => {
        setFormData((prev) => ({ ...prev, orderNumber: d.orderNumber }));
      })
      .catch(() => {});
  }, []);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({
      ...prev,
      customerId: String(customer.id),
      deliveryAddress: customer.address ?? prev.deliveryAddress,
      deliveryArea: customer.area ?? prev.deliveryArea,
      deliveryCity: customer.city ?? prev.deliveryCity,
      deliveryWindow: customer.deliveryWindow ?? prev.deliveryWindow,
    }));
  };

  const addProduct = () => setProducts((prev) => [...prev, { ...EMPTY_PRODUCT }]);

  const removeProduct = (index: number) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof ProductLine, value: string | number) => {
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const grandTotal = products.reduce((sum, p) => {
    const line = p.amount && p.quantity ? Number(p.amount) * Number(p.quantity) : 0;
    return sum + line;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }

    if (products.some((p) => !p.name.trim())) {
      toast({ title: "Error", description: "Each product needs a name", variant: "destructive" });
      return;
    }

    createDelivery.mutate(
      {
        data: {
          customerId: parseInt(formData.customerId, 10),
          orderNumber: formData.orderNumber,
          invoiceNumber: formData.invoiceNumber || undefined,
          deliveryAddress: formData.deliveryAddress,
          deliveryArea: formData.deliveryArea || undefined,
          deliveryCity: formData.deliveryCity,
          deliveryDate: formData.deliveryDate,
          deliveryWindow: formData.deliveryWindow,
          priority: formData.priority,
          specialHandling: formData.specialHandling || undefined,
          remarks: formData.remarks || undefined,
          products: products.map((p) => ({
            name: p.name,
            quantity: Number(p.quantity),
            weight: p.weight || undefined,
            temperature: p.temperature || undefined,
            amount: p.amount ? Number(p.amount) : undefined,
          })),
        },
      },
      {
        onSuccess: (data) => {
          toast({ title: "Success", description: "Delivery created successfully" });
          navigate(`/deliveries/${data.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create delivery", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/deliveries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">New Delivery</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a cold-chain delivery order and assign products
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Customer */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Customer
            </CardTitle>
            <CardDescription>Search and select from your customer directory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <CustomerSearchSelect
                value={formData.customerId}
                onSelect={handleCustomerSelect}
              />
            </div>

            {selectedCustomer && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-emerald-900">{selectedCustomer.companyName}</p>
                      <Badge variant="outline" className="font-mono text-[10px] border-emerald-300 text-emerald-700">
                        {selectedCustomer.customerCode}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-800/80">
                      {selectedCustomer.contactPerson && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {selectedCustomer.contactPerson}
                        </span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[selectedCustomer.area, selectedCustomer.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700/70 pt-1">
                      Delivery address and window auto-filled — you can edit below if needed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Order details + Schedule */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Order details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>DC Number (Order No.) *</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    onClick={() => {
                      fetch("/api/deliveries/next-dc-number", { credentials: "include" })
                        .then((r) => r.json())
                        .then((d: { orderNumber: string }) =>
                          setFormData((p) => ({ ...p, orderNumber: d.orderNumber })),
                        )
                        .catch(() => {});
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </button>
                </div>
                <Input
                  required
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="font-mono font-medium"
                  placeholder="Auto-generating…"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) =>
                    setFormData({ ...formData, priority: v as "low" | "normal" | "high" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Schedule & location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Delivery Date *</Label>
                  <DatePicker
                    required
                    value={formData.deliveryDate}
                    onChange={(v) => setFormData({ ...formData, deliveryDate: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Window *</Label>
                  <Input
                    required
                    value={formData.deliveryWindow}
                    onChange={(e) => setFormData({ ...formData, deliveryWindow: e.target.value })}
                    placeholder="08:00-12:00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Delivery Address *</Label>
                <Textarea
                  required
                  rows={2}
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  className={
                    selectedCustomer && formData.deliveryAddress
                      ? "border-emerald-200 bg-emerald-50/30"
                      : ""
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    required
                    value={formData.deliveryCity}
                    onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                    className={
                      selectedCustomer && formData.deliveryCity
                        ? "border-emerald-200 bg-emerald-50/30"
                        : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Input
                    value={formData.deliveryArea}
                    onChange={(e) => setFormData({ ...formData, deliveryArea: e.target.value })}
                    className={
                      selectedCustomer && formData.deliveryArea
                        ? "border-emerald-200 bg-emerald-50/30"
                        : ""
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Products */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Products
                </CardTitle>
                <CardDescription className="mt-1">
                  {products.length} line{products.length === 1 ? "" : "s"}
                  {grandTotal > 0 ? ` · ₹${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : ""}
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addProduct} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_88px_110px_100px_100px_90px_40px] gap-2 border-b bg-muted/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Product name</span>
              <span>Qty</span>
              <span>Unit ₹</span>
              <span>Weight</span>
              <span>Temp</span>
              <span className="text-right">Line ₹</span>
              <span />
            </div>

            <div className="divide-y">
              {products.map((product, index) => {
                const lineTotal =
                  product.amount && product.quantity
                    ? Number(product.amount) * Number(product.quantity)
                    : 0;

                return (
                  <div key={index} className="px-4 py-4 sm:px-5">
                    {/* Mobile label */}
                    <div className="mb-3 flex items-center justify-between lg:hidden">
                      <Badge variant="secondary" className="text-[10px]">
                        Line {index + 1}
                      </Badge>
                      {products.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeProduct(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_88px_110px_100px_100px_90px_40px] lg:items-end lg:gap-2">
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <Label className="text-xs lg:sr-only">Product name *</Label>
                        <Input
                          required
                          value={product.name}
                          onChange={(e) => updateProduct(index, "name", e.target.value)}
                          placeholder="e.g. Frozen Peas 1kg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs lg:sr-only">Qty *</Label>
                        <Input
                          type="number"
                          min={1}
                          required
                          value={product.quantity}
                          onChange={(e) =>
                            updateProduct(index, "quantity", parseInt(e.target.value || "1", 10))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs lg:sr-only">Unit amount (₹)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={product.amount}
                          onChange={(e) => updateProduct(index, "amount", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs lg:sr-only">Weight</Label>
                        <Input
                          value={product.weight}
                          onChange={(e) => updateProduct(index, "weight", e.target.value)}
                          placeholder="10kg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs lg:sr-only">Temperature</Label>
                        <Input
                          value={product.temperature}
                          onChange={(e) => updateProduct(index, "temperature", e.target.value)}
                          placeholder="-18°C"
                        />
                      </div>
                      <div className="flex items-center justify-between lg:justify-end lg:pb-2">
                        <span className="text-xs text-muted-foreground lg:hidden">Line total</span>
                        <span className="text-sm font-semibold tabular-nums">
                          {lineTotal > 0
                            ? `₹${lineTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                            : "—"}
                        </span>
                      </div>
                      <div className="hidden lg:flex lg:justify-end lg:pb-1">
                        {products.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => removeProduct(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="w-9" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4">
              <Button type="button" variant="ghost" size="sm" onClick={addProduct} className="gap-1.5 justify-start">
                <Plus className="h-4 w-4" />
                Add another product
              </Button>
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Grand total
                </p>
                <p className="text-2xl font-bold tabular-nums text-primary">
                  ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Additional */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Additional info</CardTitle>
            <CardDescription>Optional handling notes for the driver / warehouse</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Special handling</Label>
              <Input
                value={formData.specialHandling}
                onChange={(e) => setFormData({ ...formData, specialHandling: e.target.value })}
                placeholder="e.g. Maintain -18°C, fragile"
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Internal notes…"
              />
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80">
          <p className="hidden sm:block text-sm text-muted-foreground truncate">
            {selectedCustomer ? selectedCustomer.companyName : "No customer selected"}
            {products.filter((p) => p.name).length > 0
              ? ` · ${products.filter((p) => p.name).length} products`
              : ""}
          </p>
          <div className="flex flex-1 sm:flex-none justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/deliveries")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDelivery.isPending}>
              {createDelivery.isPending ? "Creating…" : "Create Delivery"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
