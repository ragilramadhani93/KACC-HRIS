import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
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
      password: "",
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

  const handleExportEmployees = () => {
    const rows = employees.map((emp, index) => ({
      No: index + 1,
      Name: emp.name,
      Email: emp.email,
      Phone: emp.phoneNumber || "",
      Address: emp.address || "",
      Position: emp.position || "",
      Outlet: emp.outlet ? `${emp.outlet.code} - ${emp.outlet.name}` : "",
      Bank: emp.bank || "",
      AccountNumber: emp.accountNumber || "",
      EmergencyContact: emp.emergencyContact || "",
      Status: emp.isActive ? "Active" : "Inactive",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, `employees-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((emp) => emp.isActive).length;
  const inactiveEmployees = totalEmployees - activeEmployees;
  const assignedOutletEmployees = employees.filter((emp) => emp.outlet).length;
  const selectedOutlet = outlets.find((outlet) => outlet.id === formData.outletId);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const getOutletLabel = (emp: Employee) =>
    emp.outlet ? `${emp.outlet.code} - ${emp.outlet.name}` : "Belum ditentukan";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_right,_rgba(26,86,219,0.18),_transparent_46%),radial-gradient(circle_at_left,_rgba(14,165,233,0.14),_transparent_38%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Employee directory
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Employee Management
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                Rapikan data karyawan, pantau status aktif, dan kelola penempatan outlet dari satu halaman yang lebih enak dibaca.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Total employee</span>
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{totalEmployees}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-700">Active</span>
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-emerald-900">{activeEmployees}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-700">Inactive</span>
                  <UserCircle2 className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-amber-900">{inactiveEmployees}</p>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-sky-700">Assigned outlet</span>
                  <Building2 className="h-4 w-4 text-sky-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-sky-900">{assignedOutletEmployees}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:max-w-md">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Quick search
            </label>
            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input h-12 rounded-2xl border-white/70 bg-white pl-11 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]"
                  placeholder="Cari nama atau email employee"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="flex gap-2 sm:w-auto xl:w-full">
                <button className="btn btn-secondary h-12 flex-1 rounded-2xl" onClick={handleExportEmployees} type="button">
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  className="btn btn-primary h-12 flex-1 rounded-2xl"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Add Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Edit Employee" : "Add New Employee"}
                </h2>
                <p className="text-sm text-slate-600">
                  Isi informasi inti, penempatan outlet, dan dokumen identitas dalam satu form.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                <Pencil className="h-3.5 w-3.5" />
                {editingId ? "Update mode" : "Create mode"}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 p-6 sm:p-7 xl:grid-cols-[1.45fr_0.95fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Basic information</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                  {editingId && (
                    <div>
                      <label className="label">Password Baru</label>
                      <input
                        className="input"
                        name="password"
                        type="password"
                        value={formData.password || ""}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Kosongkan jika tidak diubah"
                      />
                    </div>
                  )}

                  <div>
                    <label className="label">Position</label>
                    <input
                      className="input"
                      name="position"
                      value={formData.position || ""}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value || null })}
                      placeholder="Contoh: Cashier"
                    />
                  </div>

                  <div>
                    <label className="label">No HP</label>
                    <input
                      className="input"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber || ""}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value || null })}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Alamat</label>
                    <input
                      className="input"
                      name="address"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value || null })}
                      placeholder="Alamat domisili employee"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Outlet and payroll</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                  <div>
                    <label className="label">Bank</label>
                    <input
                      className="input"
                      name="bank"
                      value={formData.bank || ""}
                      onChange={(e) => setFormData({ ...formData, bank: e.target.value || null })}
                      placeholder="Contoh: BCA"
                    />
                  </div>

                  <div>
                    <label className="label">No Rekening</label>
                    <input
                      className="input"
                      name="accountNumber"
                      value={formData.accountNumber || ""}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value || null })}
                      placeholder="Nomor rekening"
                    />
                  </div>

                  <div>
                    <label className="label">Kontak Darurat</label>
                    <input
                      className="input"
                      name="emergencyContact"
                      value={formData.emergencyContact || ""}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value || null })}
                      placeholder="Nama / nomor kontak"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(formData.name || "Employee") || "EM"}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Profile preview</h3>
                    <p className="text-sm text-slate-500">Ringkasan data sebelum disimpan</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{formData.name || "Nama employee"}</p>
                    <p className="mt-1 text-sm text-slate-500">{formData.position || "Position belum diisi"}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{formData.email || "email@company.com"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{formData.phoneNumber || "No HP belum diisi"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>
                        {selectedOutlet ? `${selectedOutlet.code} - ${selectedOutlet.name}` : "Outlet belum dipilih"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Document</h3>
                </div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Upload Foto KTP</label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                  <input
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={handlePhotoChange}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Gunakan foto yang jelas agar identitas mudah diverifikasi saat dibutuhkan.
                  </p>
                  {photoPreview ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img src={photoPreview} alt="KTP Preview" className="h-48 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
                      Preview foto KTP akan tampil di sini
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 sm:flex-row">
                <button
                  type="submit"
                  className="btn btn-primary h-12 flex-1 rounded-2xl"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? "Update" : "Add"} Employee
                </button>
                <button
                  type="button"
                  className="btn btn-secondary h-12 flex-1 rounded-2xl"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Employee list</h2>
            <p className="text-sm text-slate-500">
              {totalEmployees} employee terdaftar{q ? ` untuk pencarian "${q}"` : ""}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <Users className="h-3.5 w-3.5" />
            Updated view
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-7">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Belum ada employee</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Tambahkan employee baru atau ubah kata kunci pencarian agar data tampil di sini.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-4 py-4">Contact</th>
                    <th className="px-4 py-4">Outlet</th>
                    <th className="px-4 py-4">Position</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{emp.name}</p>
                            <p className="mt-1 text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{emp.phoneNumber || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{getOutletLabel(emp)}</td>
                      <td className="px-4 py-4 text-slate-600">{emp.position || "-"}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            emp.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button className="btn btn-secondary btn-sm rounded-xl" onClick={() => handleEdit(emp)} type="button">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button className="btn btn-primary btn-sm rounded-xl" onClick={() => toggle.mutate(emp)} type="button">
                            {emp.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden sm:p-6">
              {employees.map((emp) => (
                <article key={emp.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{emp.name}</h3>
                        <p className="text-sm text-slate-500">{emp.position || "Position belum diisi"}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {emp.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{emp.phoneNumber || "No HP belum diisi"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{getOutletLabel(emp)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="btn btn-secondary btn-sm flex-1 rounded-xl" onClick={() => handleEdit(emp)} type="button">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button className="btn btn-primary btn-sm flex-1 rounded-xl" onClick={() => toggle.mutate(emp)} type="button">
                      {emp.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
