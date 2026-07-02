import React, { useState } from "react";
import { useListHubs, useCreateHub, useUpdateHub } from "@workspace/api-client-react";
import type { Hub } from "@workspace/api-client-react";
import { Warehouse, Plus, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface HubFormState {
  name: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
  radiusMeters: string;
}

const EMPTY_FORM: HubFormState = {
  name: "",
  city: "",
  address: "",
  lat: "",
  lng: "",
  radiusMeters: "300",
};

function formToInput(form: HubFormState) {
  return {
    name: form.name.trim(),
    city: form.city.trim(),
    address: form.address.trim() || null,
    lat: parseFloat(form.lat),
    lng: parseFloat(form.lng),
    radiusMeters: parseInt(form.radiusMeters),
  };
}

function isValid(form: HubFormState) {
  return (
    form.name.trim() &&
    form.city.trim() &&
    !isNaN(parseFloat(form.lat)) &&
    !isNaN(parseFloat(form.lng)) &&
    parseFloat(form.lat) >= -90 && parseFloat(form.lat) <= 90 &&
    parseFloat(form.lng) >= -180 && parseFloat(form.lng) <= 180 &&
    !isNaN(parseInt(form.radiusMeters)) &&
    parseInt(form.radiusMeters) > 0
  );
}

function HubFormFields({ form, setForm }: { form: HubFormState; setForm: (f: HubFormState) => void }) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hub Name *</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bangalore Hub" />
        </div>
        <div className="space-y-2">
          <Label>City *</Label>
          <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bangalore" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Warehouse address (optional)" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Latitude *</Label>
          <Input required type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="12.9716" />
        </div>
        <div className="space-y-2">
          <Label>Longitude *</Label>
          <Input required type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="77.5946" />
        </div>
        <div className="space-y-2">
          <Label>Radius (m) *</Label>
          <Input required type="number" min="50" value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: Google Maps par apne warehouse pe right-click karke coordinates copy kar sakte hain (pehla number = Latitude, doosra = Longitude).
        Staff isi location ke radius ke andar se hi geofenced check-in kar payenge.
      </p>
    </div>
  );
}

export default function HubsPage() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Hub | null>(null);
  const [form, setForm] = useState<HubFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<HubFormState>(EMPTY_FORM);

  const { data: hubs = [], isLoading, refetch } = useListHubs();

  const createMutation = useCreateHub({
    mutation: {
      onSuccess: () => {
        refetch();
        setShowAdd(false);
        setForm(EMPTY_FORM);
        toast({ title: "Hub added" });
      },
      onError: () => toast({ title: "Error", description: "Failed to add hub.", variant: "destructive" }),
    },
  });

  const editMutation = useUpdateHub({
    mutation: {
      onSuccess: () => {
        refetch();
        setEditTarget(null);
        toast({ title: "Hub updated" });
      },
      onError: () => toast({ title: "Error", description: "Failed to update hub.", variant: "destructive" }),
    },
  });

  const openEdit = (h: Hub) => {
    setEditTarget(h);
    setEditForm({
      name: h.name,
      city: h.city,
      address: h.address ?? "",
      lat: String(h.lat),
      lng: String(h.lng),
      radiusMeters: String(h.radiusMeters),
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid(form)) {
      toast({ title: "Invalid form", description: "Please check the coordinates and radius.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ data: formToInput(form) });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!isValid(editForm)) {
      toast({ title: "Invalid form", description: "Please check the coordinates and radius.", variant: "destructive" });
      return;
    }
    editMutation.mutate({ id: editTarget.id, data: formToInput(editForm) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Warehouse className="h-6 w-6" /> Hubs
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Warehouse locations & geofence for attendance check-in
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setShowAdd(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Hub
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading hubs…</p>
      ) : hubs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hubs yet. Add your first hub to enable geofenced check-in.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hubs.map((h) => (
            <div key={h.id} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{h.name}</h3>
                  <p className="text-sm text-muted-foreground">{h.city}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              {h.address && <p className="text-sm text-muted-foreground">{h.address}</p>}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Geofence: {h.radiusMeters}m</Badge>
                <a
                  className="text-xs text-primary underline"
                  href={`https://www.google.com/maps?q=${h.lat},${h.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on map
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Hub</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <HubFormFields form={form} setForm={setForm} />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add Hub"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Hub</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <HubFormFields form={editForm} setForm={setEditForm} />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
