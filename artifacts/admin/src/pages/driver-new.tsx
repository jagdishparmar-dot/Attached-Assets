import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useCreateDriver, useUpdateDriver, useGetDriver, getGetDriverQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function DriverNew() {
  const [, navigate] = useLocation();
  const params = useParams();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null;
  const { toast } = useToast();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const { data: driver } = useGetDriver(editId ?? 0, { query: { enabled: isEdit, queryKey: getGetDriverQueryKey(editId ?? 0) } });

  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
    hub: "",
    joiningDate: new Date().toISOString().split("T")[0],
    address: "",
    emergencyContact: "",
    aadhaarNumber: "",
    panNumber: "",
    status: "active" as any,
  });

  useEffect(() => {
    if (!isEdit || !driver) return;
    setFormData({
      name: driver.name,
      employeeId: driver.employeeId,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry ?? "",
      hub: driver.hub,
      joiningDate: driver.joiningDate ?? "",
      address: driver.address ?? "",
      emergencyContact: driver.emergencyContact ?? "",
      aadhaarNumber: driver.aadhaarNumber ?? "",
      panNumber: driver.panNumber ?? "",
      status: driver.status,
    });
  }, [isEdit, driver]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit && editId !== null) {
      updateDriver.mutate({
        id: editId,
        data: {
          name: formData.name,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          licenseExpiry: formData.licenseExpiry || null,
          address: formData.address || null,
          emergencyContact: formData.emergencyContact || null,
          hub: formData.hub,
          status: formData.status,
        },
      }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Driver updated successfully" });
          navigate(`/admin/drivers/${editId}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update driver", variant: "destructive" });
        },
      });
      return;
    }

    createDriver.mutate({
      data: {
        name: formData.name,
        employeeId: formData.employeeId,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        hub: formData.hub,
        joiningDate: formData.joiningDate,
        licenseExpiry: formData.licenseExpiry || undefined,
        address: formData.address || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        aadhaarNumber: formData.aadhaarNumber || undefined,
        panNumber: formData.panNumber || undefined,
      }
    }, {
      onSuccess: (data) => {
        toast({ title: "Success", description: "Driver added successfully" });
        navigate(`/admin/drivers/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add driver", variant: "destructive" });
      }
    });
  };

  const isPending = createDriver.isPending || updateDriver.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(isEdit ? `/admin/drivers/${editId}` : "/admin/drivers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit Driver" : "Add New Driver"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Employee ID *</Label>
              <Input required disabled={isEdit} value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Driving License Number *</Label>
              <Input required value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>License Expiry Date</Label>
              <Input type="date" value={formData.licenseExpiry} onChange={e => setFormData({...formData, licenseExpiry: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Hub/Base Location *</Label>
              <Input required value={formData.hub} onChange={e => setFormData({...formData, hub: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Joining Date *</Label>
              <Input type="date" required disabled={isEdit} value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Aadhaar Number</Label>
              <Input disabled={isEdit} value={formData.aadhaarNumber} onChange={e => setFormData({...formData, aadhaarNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>PAN Number</Label>
              <Input disabled={isEdit} value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/admin/drivers/${editId}` : "/admin/drivers")}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Driver"}
          </Button>
        </div>
      </form>
    </div>
  );
}
