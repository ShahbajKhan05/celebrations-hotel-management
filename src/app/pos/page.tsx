"use client";

import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
};

type CartItem = MenuItem & {
  quantity: number;
};

type Order = {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  taxPercent: number;
  payment: string;
  orderType: string;
  table: string;
  status: string;
  createdAt: string;
};

const STORAGE_KEY = "celebrations-hotel-pos-orders";

const menuItems: MenuItem[] = [
  { id: 1, name: "Paneer Butter Masala", category: "Main Course", price: 320 },
  { id: 2, name: "Dal Tadka", category: "Main Course", price: 220 },
  { id: 3, name: "Veg Biryani", category: "Rice", price: 250 },
  { id: 4, name: "Butter Naan", category: "Bread", price: 60 },
  { id: 5, name: "Tandoori Roti", category: "Bread", price: 35 },
  { id: 6, name: "Masala Dosa", category: "Breakfast", price: 180 },
  { id: 7, name: "Veg Sandwich", category: "Snacks", price: 150 },
  { id: 8, name: "French Fries", category: "Snacks", price: 130 },
  { id: 9, name: "Cold Coffee", category: "Beverages", price: 140 },
  { id: 10, name: "Fresh Lime Soda", category: "Beverages", price: 100 },
  { id: 11, name: "Gulab Jamun", category: "Dessert", price: 100 },
  { id: 12, name: "Ice Cream", category: "Dessert", price: 120 },
];

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [orderType, setOrderType] = useState("Dine-in");
  const [table, setTable] = useState("01");
  const [payment, setPayment] = useState("Cash");
  const [discount, setDiscount] = useState("0");
  const [taxPercent, setTaxPercent] = useState("5");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setOrders(parsed as Order[]);
        }
      }
    } catch (error) {
      console.error("Failed to load POS orders:", error);
      setMessage("Saved orders load nahi ho sake.");
    } finally {
      setOrdersLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!ordersLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error("Failed to save POS orders:", error);
      setMessage("Orders save nahi ho sake. Browser storage check karein.");
    }
  }, [orders, ordersLoaded]);

  const categories = [
    "All",
    ...Array.from(new Set(menuItems.map((item) => item.category))),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || item.category === category;

    return matchesSearch && matchesCategory;
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const discountAmount = Math.min(
    subtotal,
    Math.max(0, Number(discount) || 0)
  );

  const safeTaxPercent = Math.min(
    100,
    Math.max(0, Number(taxPercent) || 0)
  );

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (safeTaxPercent / 100);
  const total = taxableAmount + taxAmount;

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        order.payment.toLowerCase().includes(query) ||
        order.orderType.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
    );
  }, [orders, orderSearch]);

  const totalSales = orders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  function addItem(item: MenuItem) {
    setMessage("");

    setCart((current) => {
      const existing = current.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  }

  function changeQuantity(id: number, change: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function placeOrder() {
    if (!ordersLoaded) {
      setMessage("Please wait, order history is loading.");
      return;
    }

    if (cart.length === 0) {
      setMessage("Please select at least one menu item.");
      return;
    }

    const order: Order = {
      id: `ORD-${Date.now().toString().slice(-8)}`,
      items: cart.map((item) => ({ ...item })),
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      taxPercent: safeTaxPercent,
      payment,
      orderType,
      table: orderType === "Dine-in" ? table : "—",
      status: "Placed",
      createdAt: new Date().toLocaleString("en-IN"),
    };

    setOrders((current) => [order, ...current]);
    setMessage(`Order ${order.id} placed successfully.`);
    setCart([]);
    setDiscount("0");
  }

  function updateOrderStatus(id: string, status: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  }

  function printBill(order: Order) {
    const billWindow = window.open("", "_blank", "width=700,height=800");

    if (!billWindow) {
      setMessage("Please allow pop-ups to print the bill.");
      return;
    }

    const escapeHTML = (value: string) =>
      value.replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[char];
      });

    const itemRows = order.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${currency(item.price)}</td>
            <td>${currency(item.price * item.quantity)}</td>
          </tr>
        `
      )
      .join("");

    billWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill ${escapeHTML(order.id)}</title>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 28px;
              color: #222;
              max-width: 760px;
              margin: auto;
            }
            h1, .center { text-align: center; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }
            th, td {
              padding: 10px 6px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            .details p { margin: 7px 0; }
            .summary {
              margin-top: 22px;
              margin-left: auto;
              max-width: 300px;
            }
            .summary div {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 5px 0;
            }
            .total {
              border-top: 1px solid #222;
              margin-top: 8px;
              padding-top: 12px !important;
              font-size: 20px;
              font-weight: bold;
            }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Celebrations Hotel & Resort</h1>
          <p class="center">Rewa, Madhya Pradesh</p>
          <hr />
          <div class="details">
            <p><strong>Order ID:</strong> ${escapeHTML(order.id)}</p>
            <p><strong>Date:</strong> ${escapeHTML(order.createdAt)}</p>
            <p><strong>Order Type:</strong> ${escapeHTML(order.orderType)}</p>
            <p><strong>Table:</strong> ${escapeHTML(order.table)}</p>
            <p><strong>Payment:</strong> ${escapeHTML(order.payment)}</p>
            <p><strong>Status:</strong> ${escapeHTML(order.status)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th><th>Qty</th><th>Price</th><th>Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="summary">
            <div><span>Subtotal</span><span>${currency(order.subtotal)}</span></div>
            <div><span>Discount</span><span>− ${currency(order.discount)}</span></div>
            <div><span>Tax (${order.taxPercent}%)</span><span>${currency(order.tax)}</span></div>
            <div class="total"><span>Total</span><span>${currency(order.total)}</span></div>
          </div>
          <p class="center" style="margin-top:35px">Thank you for visiting!</p>
          <button onclick="window.print()">Print Bill</button>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);

    billWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Restaurant POS & Billing
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select menu items, create orders and generate bills.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 print:hidden"
        >
          Print POS Page
        </button>
      </div>

      {message && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span>{message}</span>
          <button
            onClick={() => setMessage("")}
            className="font-bold"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Orders" value={String(orders.length)} />
        <StatCard title="Total Sales" value={currency(totalSales)} />
        <StatCard
          title="Current Cart"
          value={currency(total)}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section className="space-y-4 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu items..."
              className={`${inputClass} flex-1`}
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
              aria-label="Filter by category"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className="rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-md"
              >
                <span className="text-xs font-medium text-blue-600">
                  {item.category}
                </span>

                <h3 className="mt-2 font-semibold text-gray-900">
                  {item.name}
                </h3>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900">
                    {currency(item.price)}
                  </span>

                  <span className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                    + Add
                  </span>
                </div>
              </button>
            ))}

            {filteredItems.length === 0 && (
              <p className="col-span-full rounded-xl bg-white p-8 text-center text-sm text-gray-500">
                No menu items found.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              Current Order
            </h2>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {cart.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                Click a menu item to add it to your order.
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {currency(item.price)} each
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {currency(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQuantity(item.id, -1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 font-bold"
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>

                    <span className="w-5 text-center text-sm">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => changeQuantity(item.id, 1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 font-bold"
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(event) => setOrderType(event.target.value)}
                className={inputClass}
              >
                <option>Dine-in</option>
                <option>Room Service</option>
                <option>Takeaway</option>
              </select>
            </div>

            {orderType === "Dine-in" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Table Number
                </label>
                <select
                  value={table}
                  onChange={(event) => setTable(event.target.value)}
                  className={inputClass}
                >
                  {Array.from({ length: 12 }, (_, index) =>
                    String(index + 1).padStart(2, "0")
                  ).map((number) => (
                    <option key={number}>{number}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
                className={inputClass}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Room Charge</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tax (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercent}
                  onChange={(event) => setTaxPercent(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-gray-100 pt-4 text-sm">
            <SummaryRow label="Subtotal" value={currency(subtotal)} />
            <SummaryRow
              label="Discount"
              value={`− ${currency(discountAmount)}`}
            />
            <SummaryRow
              label={`Tax (${safeTaxPercent}%)`}
              value={currency(taxAmount)}
            />

            <div className="flex justify-between border-t border-gray-100 pt-3 text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{currency(total)}</span>
            </div>
          </div>

          <button
            onClick={placeOrder}
            disabled={!ordersLoaded}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ordersLoaded ? "Place Order" : "Loading Orders..."}
          </button>

          <button
            onClick={() => {
              setCart([]);
              setDiscount("0");
              setMessage("Current cart cleared.");
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear Cart
          </button>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Sales & Order History
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Saved orders remain available after refreshing this browser.
            </p>
          </div>

          <input
            type="search"
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            placeholder="Search order, payment, status..."
            className={`${inputClass} sm:max-w-xs`}
          />
        </div>

        {filteredOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            {orders.length === 0
              ? "No orders placed yet."
              : "No matching orders found."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Order ID / Date</th>
                  <th className="px-5 py-4">Order Type</th>
                  <th className="px-5 py-4">Table</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {order.id}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {order.createdAt}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {order.orderType}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {order.table}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {currency(order.total)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {order.payment}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <select
                        value={order.status}
                        onChange={(event) =>
                          updateOrderStatus(order.id, event.target.value)
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                        aria-label={`Update status for ${order.id}`}
                      >
                        <option>Placed</option>
                        <option>Preparing</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <button
                        onClick={() => printBill(order)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Print Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </section>

      <style jsx global>{`
        @media print {
          aside,
          nav,
          button,
          input,
          select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 break-words text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-gray-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}