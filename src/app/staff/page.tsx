"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type StaffStatus = "Active" | "Off Duty" | "On Leave";

type StaffMember = {
  id: string;
  name: string;
  phone: string;
  department: string;
  role: string;
  shift: string;
  salary: number;
  status: StaffStatus;
};

type StaffForm = {
  name: string;
  phone: string;
  department: string;
  role: string;
  shift: string;
  salary: string;
  status: StaffStatus;
};

const STORAGE_KEY = "celebrations-hotel-staff";

const departments = [
  "Front Desk",
  "Housekeeping",
  "Restaurant",
  "Kitchen",
  "Security",
  "Maintenance",
  "Management",
  "Accounts",
  "Other",
];

const shifts = ["Morning", "Evening", "Night", "General", "Rotational"];

const statuses: StaffStatus[] = ["Active", "Off Duty", "On Leave"];

const initialStaff: StaffMember[] = [
  {
    id: "ST-001",
    name: "Demo Employee 1",
    phone: "",
    department: "Front Desk",
    role: "Receptionist",
    shift: "Morning",
    salary: 18000,
    status: "Active",
  },
  {
    id: "ST-002",
    name: "Demo Employee 2",
    phone: "",
    department: "Housekeeping",
    role: "Housekeeper",
    shift: "Evening",
    salary: 14000,
    status: "Active",
  },
  {
    id: "ST-003",
    name: "Demo Employee 3",
    phone: "",
    department: "Restaurant",
    role: "Service Staff",
    shift: "Morning",
    salary: 16000,
    status: "Off Duty",
  },
];

const emptyForm: StaffForm = {
  name: "",
  phone: "",
  department: "Front Desk",
  role: "",
  shift: "Morning",
  salary: "15000",
  status: "Active",
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const statusStyles: Record<StaffStatus, string> = {
  Active: "bg-green-100 text-green-700",
  "Off Duty": "bg-gray-100 text-gray-700",
  "On Leave": "bg-amber-100 text-amber-700",
};

function getNextId(staff: StaffMember[]) {
  const highest = staff.reduce((max, member) => {
    const match = member.id.match(/^ST-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `ST-${String(highest + 1).padStart(3, "0")}`;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const [form, setForm] = useState<StaffForm>({ ...emptyForm });

  // Load staff records.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        setStaff(Array.isArray(parsed) ? (parsed as StaffMember[]) : initialStaff);
      } else {
        setStaff(initialStaff);
      }
    } catch {
      setStaff(initialStaff);
    }

    setIsLoaded(true);
  }, []);

  // Save staff records automatically.
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    } catch {
      setMessageType("error");
      setMessage("Could not save staff records in this browser.");
    }
  }, [staff, isLoaded]);

  function notify(
    text: string,
    type: "success" | "error" = "success"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMessage("");
  }

  function openEditForm(member: StaffMember) {
    setEditingId(member.id);

    setForm({
      name: member.name,
      phone: member.phone,
      department: member.department,
      role: member.role,
      shift: member.shift,
      salary: String(member.salary),
      status: member.status,
    });

    setShowForm(true);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const phone = form.phone.trim();
    const role = form.role.trim();
    const salary = Number(form.salary);

    if (!name || !role) {
      notify("Please enter the employee name and job role.", "error");
      return;
    }

    if (!Number.isFinite(salary) || salary < 0) {
      notify("Please enter a valid monthly salary.", "error");
      return;
    }

    if (phone && !/^[0-9+\-()\s]{7,20}$/.test(phone)) {
      notify("Please enter a valid phone number.", "error");
      return;
    }

    const duplicatePhone = staff.some(
      (member) =>
        member.id !== editingId &&
        phone !== "" &&
        member.phone.trim() === phone
    );

    if (duplicatePhone) {
      notify("An employee with this phone number already exists.", "error");
      return;
    }

    if (editingId) {
      setStaff((current) =>
        current.map((member) =>
          member.id === editingId
            ? {
                ...member,
                name,
                phone,
                department: form.department,
                role,
                shift: form.shift,
                salary,
                status: form.status,
              }
            : member
        )
      );

      notify("Staff member updated successfully!");
    } else {
      const newMember: StaffMember = {
        id: getNextId(staff),
        name,
        phone,
        department: form.department,
        role,
        shift: form.shift,
        salary,
        status: form.status,
      };

      setStaff((current) => [...current, newMember]);
      notify("Staff member added successfully!");
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function updateStatus(id: string, status: StaffStatus) {
    setStaff((current) =>
      current.map((member) =>
        member.id === id ? { ...member, status } : member
      )
    );

    notify("Staff status updated successfully.");
  }

  function deleteStaff(member: StaffMember) {
    const confirmed = window.confirm(
      `Delete ${member.name} (${member.id})? This cannot be undone.`
    );

    if (!confirmed) return;

    setStaff((current) =>
      current.filter((entry) => entry.id !== member.id)
    );

    if (editingId === member.id) {
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    }

    notify("Staff member deleted successfully.");
  }

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff
      .filter((member) => {
        const matchesSearch =
          member.name.toLowerCase().includes(query) ||
          member.id.toLowerCase().includes(query) ||
          member.phone.toLowerCase().includes(query) ||
          member.role.toLowerCase().includes(query) ||
          member.department.toLowerCase().includes(query);

        const matchesDepartment =
          departmentFilter === "All" ||
          member.department === departmentFilter;

        const matchesStatus =
          statusFilter === "All" || member.status === statusFilter;

        const matchesShift =
          shiftFilter === "All" || member.shift === shiftFilter;

        return (
          matchesSearch &&
          matchesDepartment &&
          matchesStatus &&
          matchesShift
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, search, departmentFilter, statusFilter, shiftFilter]);

  const activeCount = staff.filter(
    (member) => member.status === "Active"
  ).length;

  const offDutyCount = staff.filter(
    (member) => member.status === "Off Duty"
  ).length;

  const leaveCount = staff.filter(
    (member) => member.status === "On Leave"
  ).length;

  const totalPayroll = staff.reduce(
    (sum, member) => sum + member.salary,
    0
  );

  const activePayroll = staff
    .filter((member) => member.status === "Active")
    .reduce((sum, member) => sum + member.salary, 0);

  function exportCSV() {
    const headers = [
      "Staff ID",
      "Name",
      "Phone",
      "Department",
      "Job Role",
      "Shift",
      "Monthly Salary",
      "Status",
    ];

    const rows = filteredStaff.map((member) => [
      member.id,
      member.name,
      member.phone,
      member.department,
      member.role,
      member.shift,
      member.salary,
      member.status,
    ]);

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "celebrations-staff.csv";
    link.click();

    URL.revokeObjectURL(url);

    notify("Staff records exported successfully.");
  }

  function clearFilters() {
    setSearch("");
    setDepartmentFilter("All");
    setStatusFilter("All");
    setShiftFilter("All");
  }

  if (!isLoaded) {
    return <div className="p-6 text-gray-500">Loading staff records...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Staff Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage employees, departments, shifts and salary records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Staff
          </button>
        </div>
      </div>

      {/* Notification */}
      {message && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <form
          onSubmit={saveStaff}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Employee" : "Add New Employee"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Enter the employee details below.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Full Name *
              </label>

              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Employee name"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone Number
              </label>

              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="Employee contact"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Department *
              </label>

              <select
                required
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Job Role *
              </label>

              <input
                required
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value })
                }
                placeholder="e.g. Receptionist"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Shift *
              </label>

              <select
                required
                value={form.shift}
                onChange={(e) =>
                  setForm({ ...form, shift: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {shifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Monthly Salary (₹) *
              </label>

              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.salary}
                onChange={(e) =>
                  setForm({ ...form, salary: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Work Status
              </label>

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as StaffStatus,
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {editingId ? "Save Changes" : "Save Employee"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {staff.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">All employee records</p>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">Active Staff</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-green-700">Currently active</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Off Duty / On Leave</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {offDutyCount + leaveCount}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {offDutyCount} off duty · {leaveCount} on leave
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Monthly Payroll</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {currency(totalPayroll)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            All staff, including leave
          </p>
        </div>
      </div>

      {/* Payroll Summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">Active Staff Payroll</p>
        <p className="mt-2 text-2xl font-bold text-green-700">
          {currency(activePayroll)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Combined monthly salary of active employees only.
        </p>
      </div>

      {/* Search and Filters */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 xl:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, phone, department or role..."
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Shifts</option>
            {shifts.map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {(search ||
            departmentFilter !== "All" ||
            statusFilter !== "All" ||
            shiftFilter !== "All") && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredStaff.length}
            </span>{" "}
            of {staff.length} employees
          </p>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-4">Staff ID</th>
                <th className="whitespace-nowrap px-5 py-4">Employee</th>
                <th className="whitespace-nowrap px-5 py-4">
                  Department / Role
                </th>
                <th className="whitespace-nowrap px-5 py-4">Shift</th>
                <th className="whitespace-nowrap px-5 py-4">
                  Monthly Salary
                </th>
                <th className="whitespace-nowrap px-5 py-4">Status</th>
                <th className="whitespace-nowrap px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-700">
                    {member.id}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="font-semibold text-gray-900">
                      {member.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {member.phone || "Phone not provided"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-gray-900">{member.department}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {member.role}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    {member.shift}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                    {currency(member.salary)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[member.status]}`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex min-w-36 flex-col gap-2">
                      <select
                        aria-label={`Update status for ${member.name}`}
                        value={member.status}
                        onChange={(e) =>
                          updateStatus(
                            member.id,
                            e.target.value as StaffStatus
                          )
                        }
                        className="rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => openEditForm(member)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit Staff
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteStaff(member)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStaff.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    <p className="font-medium text-gray-700">
                      No staff records found.
                    </p>
                    <p className="mt-1 text-sm">
                      Try different filters or add a new employee.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}