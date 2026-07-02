import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useCreateVehicle, useUpdateVehicle, useListVehicles, getListVehiclesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function VehicleNew() {
  const [, navigate] = useLocation();
  const params = useParams();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null;
  const { toast } = useToast();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const { data: vehicles } = useListVehicles({ query: { enabled: isEdit, queryKey: getListVehiclesQueryKey() } });

  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "refrigerated_truck" as any,
    capacity: "",
    fuelType: "diesel" as any,
    gpsDeviceId: "",
    insuranceExpiry: "",
    fitnessExpiry: "",
    status: "available" as any,
  });

  useEffect(() => {
    if (!isEdit || !vehicles) return;
    const v = vehicles.find((x) => x.id === editId);
    if (!v) return;
    setFormData({
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      capacity: v.capacity,
      fuelType: v.fuelType,
      gpsDeviceId: v.gpsDeviceId ?? "",
      insuranceExpiry: v.insuranceExpiry ?? "",
      fitnessExpiry: v.fitnessExpiry ?? "",
      status: v.status,
    });
  }, [isEdit, vehicles, editId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const blank = isEdit ? null : undefined;
    const payload = {
      vehicleNumber: formData.vehicleNumber,
      vehicleType: formData.vehicleType,
      capacity: formData.capacity,
      fuelType: formData.fuelType,
      gpsDeviceId: formData.gpsDeviceId || blank,
      insuranceExpiry: formData.insuranceExpiry || blank,
      fitnessExpiry: formData.fitnessExpiry || blank,
    };

    if (isEdit && editId !== null) {
      updateVehicle.mutate({ id: editId, data: { ...payload, status: formData.status } }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Vehicle updated successfully" });
          navigate("/vehicles");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update vehicle", variant: "destructive" });
        },
      });
    } else {
      createVehicle.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Vehicle added successfully" });
          navigate("/vehicles");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add vehicle", variant: "destructive" });
        },
      });
    }
  };

  const isPending = createVehicle.isPending || updateVehicle.isPending;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/vehicles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit Vehicle" : "Add New Vehicle"}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle Number (License Plate) *</Label>
              <Input required value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="e.g. MH-04-AB-1234" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Type *</Label>
                <Select value={formData.vehicleType} onValueChange={(v) => setFormData({...formData, vehicleType: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refrigerated_truck">Refrigerated Truck</SelectItem>
                    <SelectItem value="chilled_van">Chilled Van</SelectItem>
                    <SelectItem value="ambient_truck">Ambient Truck</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuel Type *</Label>
                <Select value={formData.fuelType} onValueChange={(v) => setFormData({...formData, fuelType: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input required value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} placeholder="e.g. 1000kg" />
              </div>
              <div className="space-y-2">
                <Label>GPS Device ID</Label>
                <Input value={formData.gpsDeviceId} onChange={e => setFormData({...formData, gpsDeviceId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Insurance Expiry</Label>
                <Input type="date" value={formData.insuranceExpiry} onChange={e => setFormData({...formData, insuranceExpiry: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Fitness Expiry</Label>
                <Input type="date" value={formData.fitnessExpiry} onChange={e => setFormData({...formData, fitnessExpiry: e.target.value})} />
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-4 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate("/vehicles")}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Vehicle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
