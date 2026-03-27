import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";

type Employee = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  isActive: boolean;
  address?: string | null;
  phoneNumber?: string | null;
  bank?: string | null;
  accountNumber?: string | null;
  emergencyContact?: string | null;
  ktpPhotoUrl?: string | null;
  outletId?: string | null;
  outlet?: { id: string; code: string; name: string } | null;
  department?: { name: string };
};

type Outlet = {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
};

type EmployeeForm = Omit<Employee, "id"> & {
  password?: string;
};

export default function EmployeesPage() {
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeForm>({
    name: "",
    email: "",
    password: "",
    position: null,
    isActive: true,
    address: null,
    phoneNumber: null,
    bank: null,
    accountNumber: null,
    emergencyContact: null,
    ktpPhotoUrl: null,
    outletId: null,
    department: undefined,
  });
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees", q],
    queryFn: async () => (await api.get("/employees", { params: { q } })).data,
  });

  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["outlets"],
    queryFn: async () => (await api.get("/outlets")).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeForm) =>
      api.post("/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeForm) =>
      api.put(`/employees/${editingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      resetForm();
    },
  });

  const toggle = useMutation({
    mutationFn: async (emp: Employee) =>
      api.put(`/employees/${emp.id}`, {
        ...emp,
        departmentId: null,
        isActive: !emp.isActive,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      email: emp.email,
      position: emp.position,
      isActive: emp.isActive,
      address: emp.address ?? null,
      phoneNumber: emp.phoneNumber ?? null,
      bank: emp.bank ?? null,
      accountNumber: emp.accountNumber ?? null,
      emergencyContact: emp.emergencyContact ?? null,
      ktpPhotoUrl: emp.ktpPhotoUrl ?? null,
      outletId: emp.outletId ?? null,
      department: emp.department,
    });
    setPhotoPreview(emp.ktpPhotoUrl || "");
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      position: null,
      isActive: true,
      address: null,
      phoneNumber: null,
      bank: null,
      accountNumber: null,
      emergencyContact: null,
      ktpPhotoUrl: null,
      outletId: null,
      department: undefined,
    });
    setPhotoPreview("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData({ ...formData, ktpPhotoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <input
          className="input max-w-sm"
          placeholder="Search employee"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Employee
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">{editingId ? "Edit Employee" : "Add New Employee"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nama Lengkap */}
            <div>
              <label className="label">Nama Lengkap *</label>
              <input
                className="input"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email *</label>
              <input
                className="input"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Password */}
            {!editingId && (
              <div>
                <label className="label">Password *</label>
                <input
                  className="input"
                  name="password"
                  type="password"
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingId}
                />
              </div>
            )}

            {/* Position */}
            <div>
              <label className="label">Position</label>
              <input
                className="input"
                name="position"
                value={formData.position || ""}
                onChange={(e) => setFormData({ ...formData, position: e.target.value || null })}
              />
            </div>

            {/* Penempatan Outlet */}
            <div>
              <label className="label">Penempatan Outlet</label>
              <select
                className="input"
                value={formData.outletId || ""}
                onChange={(e) => setFormData({ ...formData, outletId: e.target.value || null })}
              >
                <option value="">-- Pilih Outlet --</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.code} - {outlet.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Alamat */}
            <div>
              <label className="label">Alamat</label>
              <input
                className="input"
                name="address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value || null })}
              />
            </div>

            {/* No HP */}
            <div>
              <label className="label">No HP</label>
              <input
                className="input"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber || ""}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value || null })}
              />
            </div>

            {/* Bank */}
            <div>
              <label className="label">Bank</label>
              <input
                className="input"
                name="bank"
                value={formData.bank || ""}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value || null })}
              />
            </div>

            {/* No Rekening */}
            <div>
              <label className="label">No Rekening</label>
              <input
                className="input"
                name="accountNumber"
                value={formData.accountNumber || ""}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value || null })}
              />
            </div>

            {/* Kontak Darurat */}
            <div>
              <label className="label">Kontak Darurat</label>
              <input
                className="input"
                name="emergencyContact"
                value={formData.emergencyContact || ""}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value || null })}
              />
            </div>

            {/* Upload Foto KTP */}
            <div className="md:col-span-2">
              <label className="label">Upload Foto KTP</label>
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={handlePhotoChange}
              />
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="KTP Preview" className="h-32 w-auto rounded border" />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Update" : "Add"} Employee
              </button>
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">No HP</th>
              <th className="p-2">Outlet</th>
              <th className="p-2">Position</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b">
                <td className="p-2">{emp.name}</td>
                <td className="p-2">{emp.email}</td>
                <td className="p-2">{emp.phoneNumber || "-"}</td>
                <td className="p-2">{emp.outlet ? `${emp.outlet.code} - ${emp.outlet.name}` : "-"}</td>
                <td className="p-2">{emp.position || "-"}</td>
                <td className="p-2">{emp.isActive ? "Active" : "Inactive"}</td>
                <td className="p-2 space-x-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleEdit(emp)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => toggle.mutate(emp)}
                  >
                    {emp.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
