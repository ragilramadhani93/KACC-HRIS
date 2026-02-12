"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Outlet } from "@prisma/client";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MapPin, Trash2, Pencil } from "lucide-react";

interface OutletClientProps {
    initialOutlets: Outlet[];
}

export function OutletClient({ initialOutlets }: OutletClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [radius, setRadius] = useState("100");

    const resetForm = () => {
        setName("");
        setAddress("");
        setLatitude("");
        setLongitude("");
        setRadius("100");
        setEditingOutlet(null);
    };

    const openEditDialog = (outlet: Outlet) => {
        setEditingOutlet(outlet);
        setName(outlet.name);
        setAddress(outlet.address || "");
        setLatitude(outlet.latitude.toString());
        setLongitude(outlet.longitude.toString());
        setRadius(outlet.radius.toString());
        setOpen(true);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingOutlet
                ? `/api/outlets/${editingOutlet.id}`
                : "/api/outlets";

            const res = await fetch(url, {
                method: editingOutlet ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    address: address || null,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    radius: parseInt(radius),
                }),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success(editingOutlet ? "Outlet updated" : "Outlet created");
            setOpen(false);
            resetForm();
            router.refresh();

        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm("Hapus outlet ini?")) return;

        try {
            const res = await fetch(`/api/outlets/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Outlet deleted");
            router.refresh();
        } catch (error) {
            toast.error("Failed to delete outlet");
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude.toString());
                    setLongitude(position.coords.longitude.toString());
                    toast.success("Location captured");
                },
                (error) => {
                    toast.error("Failed to get location");
                }
            );
        } else {
            toast.error("Geolocation not supported");
        }
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Outlets</h2>
                    <p className="text-muted-foreground">Kelola clock point / outlet untuk geofencing</p>
                </div>
                <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Outlet</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingOutlet ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={onSubmit} className="space-y-4 mt-4">
                            <div>
                                <Label>Nama Outlet*</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Kantor Pusat"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Alamat</Label>
                                <Input
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Jl. Sudirman No. 1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Latitude*</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        placeholder="-6.2088"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Longitude*</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        placeholder="106.8456"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="button" variant="outline" onClick={getCurrentLocation} className="w-full">
                                <MapPin className="mr-2 h-4 w-4" /> Ambil Lokasi Saat Ini
                            </Button>
                            <div>
                                <Label>Radius (meter)*</Label>
                                <Input
                                    type="number"
                                    value={radius}
                                    onChange={(e) => setRadius(e.target.value)}
                                    placeholder="100"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Jarak maksimal dari titik koordinat untuk clock in
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Saving..." : (editingOutlet ? "Update" : "Create")}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Alamat</TableHead>
                            <TableHead>Koordinat</TableHead>
                            <TableHead>Radius</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialOutlets.map((outlet) => (
                            <TableRow key={outlet.id}>
                                <TableCell className="font-medium">{outlet.name}</TableCell>
                                <TableCell>{outlet.address || "-"}</TableCell>
                                <TableCell className="font-mono text-sm">
                                    {outlet.latitude.toFixed(6)}, {outlet.longitude.toFixed(6)}
                                </TableCell>
                                <TableCell>{outlet.radius}m</TableCell>
                                <TableCell>
                                    <Badge variant={outlet.isActive ? "success" : "secondary"}>
                                        {outlet.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(outlet)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onDelete(outlet.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialOutlets.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    Belum ada outlet. Tambahkan outlet untuk mengaktifkan geofencing.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
