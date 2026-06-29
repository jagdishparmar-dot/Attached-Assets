import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateDelivery, useListCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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

  const [products, setProducts] = useState([{ name: "", quantity: 1, weight: "", temperature: "" }]);

  const addProduct = () => {
    setProducts([...products, { name: "", quantity: 1, weight: "", temperature: "" }]);
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
          temperature: p.temperature || undefined
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
                <Select disabled={customersLoading} value={formData.customerId} onValueChange={(v) => setFormData({...formData, customerId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>
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
                <Label>Order Number *</Label>
                <Input required value={formData.orderNumber} onChange={e => setFormData({...formData, orderNumber: e.target.value})} />
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

            <div className="space-y-2 pt-2">
              <Label>Delivery Address *</Label>
              <Textarea required value={formData.deliveryAddress} onChange={e => setFormData({...formData, deliveryAddress: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input required value={formData.deliveryCity} onChange={e => setFormData({...formData, deliveryCity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={formData.deliveryArea} onChange={e => setFormData({...formData, deliveryArea: e.target.value})} />
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
          <CardContent className="space-y-4">
            {products.map((product, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-md relative">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input required value={product.name} onChange={e => updateProduct(index, "name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input type="number" min="1" required value={product.quantity} onChange={e => updateProduct(index, "quantity", parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight</Label>
                    <Input value={product.weight} onChange={e => updateProduct(index, "weight", e.target.value)} placeholder="e.g. 10kg" />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input value={product.temperature} onChange={e => updateProduct(index, "temperature", e.target.value)} placeholder="e.g. -18C" />
                  </div>
                </div>
                {products.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)} className="text-destructive mt-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
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
