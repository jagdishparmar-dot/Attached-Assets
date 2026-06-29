import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateDelivery, useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Sparkles } from "lucide-react";

export default function DeliveryNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: customers, isLoading: customersLoading } = useListCustomers();
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
    priority: "normal" as any,
    specialHandling: "",
    remarks: "",
  });

  useEffect(() => {
    fetch("/api/deliveries/next-dc-number")
      .then((r) => r.json())
      .then((d: { orderNumber: string }) => {
        setFormData((prev) => ({ ...prev, orderNumber: d.orderNumber }));
      })
      .catch(() => {});
  }, []);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers?.find((c) => c.id.toString() === customerId);
    setFormData((prev) => ({
      ...prev,
      customerId,
      deliveryAddress: customer?.address ?? prev.deliveryAddress,
      deliveryArea: customer?.area ?? prev.deliveryArea,
      deliveryCity: customer?.city ?? prev.deliveryCity,
      deliveryWindow: customer?.deliveryWindow ?? prev.deliveryWindow,
    }));
  };

  const [products, setProducts] = useState([{ name: "", quantity: 1, weight: "", temperature: "", amount: "" }]);

  const addProduct = () => {
    setProducts([...products, { name: "", quantity: 1, weight: "", temperature: "", amount: "" }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      const newProducts = [...products];
      newProducts.splice(index, 1);
      setProducts(newProducts);
    }
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }

    createDelivery.mutate({
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
        products: products.map(p => ({
          name: p.name,
          quantity: Number(p.quantity),
          weight: p.weight || undefined,
          temperature: p.temperature || undefined,
          amount: p.amount ? Number(p.amount) : undefined,
        }))
      }
    }, {
      onSuccess: (data) => {
        toast({ title: "Success", description: "Delivery created successfully" });
        navigate(`/admin/deliveries/${data.id}`);
      },
      onError: (err) => {
        toast({ title: "Error", description: "Failed to create delivery", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/deliveries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">New Delivery</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select disabled={customersLoading} value={formData.customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={customersLoading ? "Loading customers…" : "Select Customer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span className="font-medium">{c.companyName}</span>
                        <span className="ml-2 text-muted-foreground text-xs">{c.customerCode}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>DC Number (Order No.) *</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    onClick={() => {
                      fetch("/api/deliveries/next-dc-number")
                        .then((r) => r.json())
                        .then((d: { orderNumber: string }) => setFormData((p) => ({ ...p, orderNumber: d.orderNumber })))
                        .catch(() => {});
                    }}
                  >
                    ↻ Regenerate
                  </button>
                </div>
                <Input
                  required
                  value={formData.orderNumber}
                  onChange={e => setFormData({...formData, orderNumber: e.target.value})}
                  className="font-mono font-medium"
                  placeholder="Auto-generating…"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Date *</Label>
                <Input type="date" required value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Window *</Label>
                <Input required value={formData.deliveryWindow} onChange={e => setFormData({...formData, deliveryWindow: e.target.value})} placeholder="e.g. 08:00-12:00" />
              </div>
            </div>

            {formData.customerId && (() => {
              const c = customers?.find(x => x.id.toString() === formData.customerId);
              return c ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                  <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-green-800">
                    Address auto-filled from <strong>{c.companyName}</strong>
                    {c.contactPerson ? ` · ${c.contactPerson}` : ""}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </span>
                </div>
              ) : null;
            })()}

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Label>Delivery Address *</Label>
                {formData.deliveryAddress && formData.customerId && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Auto-filled
                  </span>
                )}
              </div>
              <Textarea required value={formData.deliveryAddress} onChange={e => setFormData({...formData, deliveryAddress: e.target.value})} className={formData.deliveryAddress && formData.customerId ? "border-green-300 bg-green-50/30 focus-visible:ring-green-400" : ""} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>City *</Label>
                  {formData.deliveryCity && formData.customerId && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Auto-filled
                    </span>
                  )}
                </div>
                <Input required value={formData.deliveryCity} onChange={e => setFormData({...formData, deliveryCity: e.target.value})} className={formData.deliveryCity && formData.customerId ? "border-green-300 bg-green-50/30 focus-visible:ring-green-400" : ""} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Area</Label>
                  {formData.deliveryArea && formData.customerId && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Auto-filled
                    </span>
                  )}
                </div>
                <Input value={formData.deliveryArea} onChange={e => setFormData({...formData, deliveryArea: e.target.value})} className={formData.deliveryArea && formData.customerId ? "border-green-300 bg-green-50/30 focus-visible:ring-green-400" : ""} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Products</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addProduct}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.map((product, index) => {
              const lineTotal = product.amount && product.quantity
                ? (Number(product.amount) * Number(product.quantity)).toFixed(2)
                : null;
              return (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Product {index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      {lineTotal && (
                        <span className="text-sm font-semibold text-primary">
                          Line Total: ₹{lineTotal}
                        </span>
                      )}
                      {products.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)} className="text-destructive h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label className="text-xs">Product Name *</Label>
                      <Input required value={product.name} onChange={e => updateProduct(index, "name", e.target.value)} placeholder="e.g. Frozen Peas 1kg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity *</Label>
                      <Input type="number" min="1" required value={product.quantity} onChange={e => updateProduct(index, "quantity", parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit Amount (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.amount}
                        onChange={e => updateProduct(index, "amount", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Weight</Label>
                      <Input value={product.weight} onChange={e => updateProduct(index, "weight", e.target.value)} placeholder="e.g. 10kg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Temperature</Label>
                      <Input value={product.temperature} onChange={e => updateProduct(index, "temperature", e.target.value)} placeholder="e.g. -18°C" />
                    </div>
                  </div>
                </div>
              );
            })}

            {(() => {
              const grandTotal = products.reduce((sum, p) => {
                const line = p.amount && p.quantity ? Number(p.amount) * Number(p.quantity) : 0;
                return sum + line;
              }, 0);
              return grandTotal > 0 ? (
                <div className="flex justify-end border-t pt-3 mt-1">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg px-5 py-2.5 text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Grand Total</p>
                    <p className="text-xl font-bold text-primary">₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Special Handling</Label>
              <Input value={formData.specialHandling} onChange={e => setFormData({...formData, specialHandling: e.target.value})} placeholder="e.g. Handle with care, fragile" />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/deliveries")}>Cancel</Button>
          <Button type="submit" disabled={createDelivery.isPending}>
            {createDelivery.isPending ? "Creating..." : "Create Delivery"}
          </Button>
        </div>
      </form>
    </div>
  );
}
