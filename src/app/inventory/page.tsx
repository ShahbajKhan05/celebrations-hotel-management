
"use client";

import { useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  unit: string;
  updatedAt: string;
  price?: number;
};

const STORAGE_KEY = "celebrations-hotel-inventory";

const initialItems: InventoryItem[] = [
  {
    id: "INV-01",
    name: "Bed Sheets",
    category: "Housekeeping",
    quantity: 80,
    minStock: 20,
    unit: "pcs",
    updatedAt: "",
    price: 250,
  },
  {
    id: "INV-02",
    name: "Bath Towels",
    category: "Housekeeping",
    quantity: 12,
    minStock: 15,
    unit: "pcs",
    updatedAt: "",
    price: 150,
  },
  {
    id: "INV-03",
    name: "Water Bottles",
    category: "F&B",
    quantity: 240,
    minStock: 50,
    unit: "pcs",
    updatedAt: "",
    price: 20,
  },
];

const categories = [
  "Housekeeping",
  "F&B",
  "Kitchen",
  "Maintenance",
  "Bathroom Supplies",
  "Office Supplies",
  "Other",
];

const units = [
  { value: "pcs", label: "Pieces" },
  { value: "kg", label: "Kilograms" },
  { value: "litre", label: "Litres" },
  { value: "pack", label: "Packs" },
  { value: "box", label: "Boxes" },
];

const emptyForm = {
  name: "",
  category: "Housekeeping",
  quantity: "0",
  minStock: "10",
  unit: "pcs",
  price: "0",
};

function getStockStatus(item: InventoryItem) {
  if (item.quantity === 0) return "Out of Stock";
  if (item.quantity <= item.minStock) return "Low Stock";
  return "In Stock";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getNextId(items: InventoryItem[]): string {
  const highest = items.reduce((max, item) => {
    const match = item.id.match(/^INV-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `INV-${String(highest + 1).padStart(2, "0")}`;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  // Load saved inventory
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item: InventoryItem) => ({
            ...item,
            price:
              Number.isFinite(Number(item.price)) && item.price !== undefined
                ? Number(item.price)
                : 0,
          }));

          setItems(normalized);
        } else {
          setItems(initialItems);
        }
      } else {
        setItems(initialItems);
      }
    } catch (error) {
      console.error("Failed to load inventory:", error);
      setItems(initialItems);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save inventory
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save inventory:", error);
      setMessage("Could not save inventory in this browser.");
      setMessageType("error");
    }
  }, [items, isLoaded]);

  const categoryOptions = useMemo(
    () => ["All", ...new Set(items.map((item) => item.category))],
    [items]
  );

  const lowStockCount = items.filter(
    (item) => item.quantity > 0 && item.quantity <= item.minStock
  ).length;

  const outOfStockCount = items.filter(
    (item) => item.quantity === 0
  ).length;

  const totalUnits = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * (item.price ?? 0),
    0
  );

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;

    const matchesStock =
      stockFilter === "All" || getStockStatus(item) === stockFilter;

    return matchesSearch && matchesCategory && matchesStock;
  });

  function showNotice(
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

  function openEditForm(item: InventoryItem) {
    setEditingId(item.id);

    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      minStock: String(item.minStock),
      unit: item.unit,
      price: String(item.price ?? 0),
    });

    setShowForm(true);
    setMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  // Add or edit item
  function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const minStock = Number(form.minStock);
    const price = Number(form.price);

    if (!name) {
      showNotice("Please enter an item name.", "error");
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Number.isFinite(minStock) ||
      !Number.isInteger(minStock) ||
      minStock < 0
    ) {
      showNotice(
        "Quantity and minimum stock must be whole numbers of 0 or more.",
        "error"
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showNotice("Please enter a valid unit price.", "error");
      return;
    }

    const duplicate = items.some(
      (item) =>
        item.id !== editingId &&
        item.name.trim().toLowerCase() === name.toLowerCase() &&
        item.category === form.category
    );

    if (duplicate) {
      showNotice(
        "This item already exists in the selected category.",
        "error"
      );
      return;
    }

    const updatedAt = new Date().toLocaleString("en-IN");

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name,
                category: form.category,
                quantity,
                minStock,
                unit: form.unit,
                price,
                updatedAt,
              }
            : item
        )
      );

      showNotice("Inventory item updated successfully.");
    } else {
      const newItem: InventoryItem = {
        id: getNextId(items),
        name,
        category: form.category,
        quantity,
        minStock,
        unit: form.unit,
        price,
        updatedAt,
      };

      setItems((current) => [...current, newItem]);
      showNotice("Inventory item added successfully.");
    }

    closeForm();
  }

  // Increase or decrease stock
  function updateQuantity(id: string, change: number) {
    const item = items.find((entry) => entry.id === id);

    if (!item) return;

    const newQuantity = item.quantity + change;

    if (newQuantity < 0) {
      showNotice("Stock quantity cannot be negative.", "error");
      return;
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              quantity: newQuantity,
              updatedAt: new Date().toLocaleString("en-IN"),
            }
          : entry
      )
    );

    showNotice(`${item.name}: stock updated successfully.`);
  }

  // Set exact quantity
  function setExactQuantity(item: InventoryItem) {
    const input = window.prompt(
      `Enter new quantity for ${item.name}:`,
      String(item.quantity)
    );

    if (input === null) return;

    if (input.trim() === "") {
      showNotice("Please enter a quantity.", "error");
      return;
    }

    const quantity = Number(input);

    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      showNotice(
        "Enter a valid whole number of 0 or more.",
        "error"
      );
      return;
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              quantity,
              updatedAt: new Date().toLocaleString("en-IN"),
            }
          : entry
      )
    );

    showNotice("Stock quantity updated successfully.");
  }

  // Delete item
  function deleteItem(item: InventoryItem) {
    const confirmed = window.confirm(
      `Delete "${item.name}" (${item.id}) from inventory?`
    );

    if (!confirmed) return;

    setItems((current) =>
      current.filter((entry) => entry.id !== item.id)
    );

    showNotice(`${item.name} deleted successfully.`);
  }

  // Export filtered inventory to CSV
  function exportCSV() {
    const headers = [
      "Item ID",
      "Item Name",
      "Category",
      "Quantity",
      "Unit",
      "Minimum Stock",
      "Unit Price (INR)",
      "Total Value (INR)",
      "Status",
      "Last Updated",
    ];

    const rows = filteredItems.map((item) => [
      item.id,
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.minStock,
      item.price ?? 0,
      item.quantity * (item.price ?? 0),
      getStockStatus(item),
      item.updatedAt || "Not updated",
    ]);

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "celebrations-inventory.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showNotice("Inventory CSV exported successfully.");
  }

  if (!isLoaded) {
    return <div className="p-6 text-gray-500">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage supplies, monitor stock and track inventory value.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>

          <button
            onClick={openAddForm}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Status Message */}
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
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
            className="font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={saveItem}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? "Edit Inventory Item" : "Add Inventory Item"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Item Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Floor Cleaner"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Quantity *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(event) =>
                  setForm({ ...form, quantity: event.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Minimum Stock Alert *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.minStock}
                onChange={(event) =>
                  setForm({ ...form, minStock: event.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unit *
              </label>
              <select
                value={form.unit}
                onChange={(event) =>
                  setForm({ ...form, unit: event.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              >
                {units.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unit Price (₹) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {editingId ? "Save Changes" : "Save Item"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {items.length}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Unique inventory records
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Units</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {totalUnits.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Combined quantities
          </p>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">In Stock</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {
              items.filter(
                (item) => getStockStatus(item) === "In Stock"
              ).length
            }
          </p>
          <p className="mt-1 text-xs text-green-700">
            Above minimum stock
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Low Stock</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {lowStockCount}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Replenishment needed
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">Out of Stock</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {outOfStockCount}
          </p>
          <p className="mt-1 text-xs text-red-700">
            Quantity is zero
          </p>
        </div>
      </div>

      {/* Inventory Value */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">
            Total Inventory Value
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {formatCurrency(totalValue)}
          </p>
          <p className="mt-1 text-xs text-blue-700">
            Quantity multiplied by unit price
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 sm:mt-0">
          <p className="text-xs text-gray-500">Filtered records</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {filteredItems.length} / {items.length}
          </p>
        </div>
      </div>

      {/* Stock Alerts */}
      {lowStockCount + outOfStockCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-900">
            ⚠️ Stock Alerts
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            {lowStockCount + outOfStockCount} item(s) need attention.
            Check stock levels and replenish as required.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, ID or category..."
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
          >
            <option value="All">All Stock Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">Item ID</th>
                <th className="px-5 py-4">Item</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Min. Stock</th>
                <th className="px-5 py-4">Unit Price</th>
                <th className="px-5 py-4">Stock Value</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Update Stock</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const status = getStockStatus(item);

                const badgeClass =
                  status === "In Stock"
                    ? "bg-green-50 text-green-700"
                    : status === "Low Stock"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700";

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-700">
                      {item.id}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {item.updatedAt
                          ? `Updated: ${item.updatedAt}`
                          : "Not updated yet"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {item.category}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                      {item.quantity} {item.unit}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {item.minStock} {item.unit}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {formatCurrency(item.price ?? 0)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                      {formatCurrency(
                        item.quantity * (item.price ?? 0)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={item.quantity === 0}
                          aria-label={`Remove one ${item.name}`}
                          className="h-8 w-8 rounded-lg border border-gray-200 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>

                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label={`Add one ${item.name}`}
                          className="h-8 w-8 rounded-lg border border-gray-200 font-bold hover:bg-blue-50"
                        >
                          +
                        </button>

                        <button
                          onClick={() => setExactQuantity(item)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                        >
                          Set
                        </button>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(item)}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteItem(item)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    No inventory items match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500">
          Showing {filteredItems.length} of {items.length} inventory items
        </div>
      </div>
    </div>
  );
}
