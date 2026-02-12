"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Employee } from "@prisma/client";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface EmployeeClientProps {
    initialEmployees: Employee[];
}

export function EmployeeClient({ initialEmployees }: EmployeeClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [userCode, setUserCode] = useState("");
    const [department, setDepartment] = useState("");
    const [photoBase64, setPhotoBase64] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    userCode,
                    department,
                    photoUrl: photoBase64,
                }),
            });

            if (!res.ok) throw new Error("Failed to create");

            toast.success("Employee created");
            setOpen(false);
            router.refresh();

            // Reset form
            setName("");
            setUserCode("");
            setDepartment("");
            setPhotoBase64("");

        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Employee</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={onSubmit} className="space-y-4 mt-4">
                            <div>
                                <Label>Employee ID</Label>
                                <Input
                                    value={userCode}
                                    onChange={(e) => setUserCode(e.target.value)}
                                    placeholder="EMP001"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Full Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Department</Label>
                                <Input
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    placeholder="IT"
                                />
                            </div>
                            <div>
                                <Label>Face Photo</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    required
                                />
                                {photoBase64 && (
                                    <div className="mt-2 text-center">
                                        <img src={photoBase64} alt="Preview" className="h-24 w-24 object-cover rounded-full mx-auto" />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Saving..." : "Create Employee"}
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
                            <TableHead>Photo</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialEmployees.map((emp) => (
                            <TableRow key={emp.id}>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={emp.photoUrl || ""} className="object-cover" />
                                        <AvatarFallback>{emp.name[0]}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">{emp.userCode}</TableCell>
                                <TableCell>{emp.name}</TableCell>
                                <TableCell>{emp.department}</TableCell>
                                <TableCell>Active</TableCell>
                            </TableRow>
                        ))}
                        {initialEmployees.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No employees found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
