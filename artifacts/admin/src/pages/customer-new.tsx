import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useCreateCustomer, useUpdateCustomer, useGetCustomer, getGetCustomerQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";

export default function CustomerNew() {
  const [, navigate] = useLocation();
  const params = useParams();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null;
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { data: customer } = useGetCustomer(editId ?? 0, { query: { enabled: isEdit, queryKey: getGetCustomerQueryKey(editId ?? 0) } });

  const [formData, setFormData] = useState({
    customerCode: "",
    companyName: "",
    address: "",
    area: "",
    city: "",
    contactPerson: "",
    phone: "",
    email: "",
    deliveryWindow: "",
    specialInstructions: "",
  });

  useEffect(() => {
    if (!isEdit || !customer) return;
    setFormData({
      customerCode: customer.customerCode,
      companyName: customer.companyName,
      address: customer.address,
      area: customer.area ?? "",
      city: customer.city ?? "",
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      email: customer.email ?? "",
      deliveryWindow: customer.deliveryWindow ?? "",
      specialInstructions: customer.specialInstructions ?? "",
    });
  }, [isEdit, customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const blank = isEdit ? null : undefined;
    const payload = {
      customerCode: formData.customerCode,
      companyName: formData.companyName,
      address: formData.address,
      city: formData.city,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      area: formData.area || blank,
      email: formData.email || blank,
      deliveryWindow: formData.deliveryWindow || blank,
      specialInstructions: formData.specialInstructions || blank,
    };

    if (isEdit && editId !== null) {
      updateCustomer.mutate({ id: editId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Customer updated successfully" });
          navigate(`/customers/${editId}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
        },
      });
      return;
    }

    createCustomer.mutate({ data: payload }, {
      onSuccess: (data) => {
        toast({ title: "Success", description: "Customer added successfully" });
        navigate(`/customers/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
      }
    });
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(isEdit ? `/customers/${editId}` : "/customers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit Customer" : "Add New Customer"}</h2>
        {!isEdit && (
          <div className="ml-auto">
            <BulkUploadDialog onImported={() => navigate("/customers")} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Customer Code *</Label>
              <Input required value={formData.customerCode} onChange={e => setFormData({...formData, customerCode: e.target.value})} placeholder="e.g. CUST001" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address *</Label>
              <Textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Area</Label>
              <Input value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person *</Label>
              <Input required value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Preferred Delivery Window</Label>
              <Input value={formData.deliveryWindow} onChange={e => setFormData({...formData, deliveryWindow: e.target.value})} placeholder="e.g. 08:00-12:00" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Special Instructions</Label>
              <Textarea value={formData.specialInstructions} onChange={e => setFormData({...formData, specialInstructions: e.target.value})} placeholder="Default handling instructions for this customer..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/customers/${editId}` : "/customers")}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
