import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Status options
const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "green" },
  { value: "inactive", label: "Inactive", color: "gray" },
  { value: "suspended", label: "Suspended", color: "red" },
];

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
  });

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetchCustomers();
  }, [filters.status]);

  const fetchCustomers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (filters.status !== "all") params.set("status", filters.status);

      const res = await fetch(`${API_URL}/api/v1/admin/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      // API returns array directly, not { customers: [...] }
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      customer.email?.toLowerCase().includes(search) ||
      customer.customer_number?.toLowerCase().includes(search) ||
      customer.full_name?.toLowerCase().includes(search) ||
      customer.company_name?.toLowerCase().includes(search)
    );
  });

  // Stats calculations
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    withOrders: customers.filter((c) => c.order_count > 0).length,
    totalRevenue: customers.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0),
  };

  const getStatusStyle = (status) => {
    const found = STATUS_OPTIONS.find((s) => s.value === status);
    if (!found) return "bg-gray-500/20 text-gray-400";
    return {
      green: "bg-green-500/20 text-green-400",
      gray: "bg-gray-500/20 text-gray-400",
      red: "bg-red-500/20 text-red-400",
    }[found.color];
  };

  // Save customer
  const handleSaveCustomer = async (customerData) => {
    try {
      const url = editingCustomer
        ? `${API_URL}/api/v1/admin/customers/${editingCustomer.id}`
        : `${API_URL}/api/v1/admin/customers`;
      const method = editingCustomer ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save customer");
      }

      setShowCustomerModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert(err.message);
    }
  };

  // View customer details
  const handleViewCustomer = async (customerId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch customer details");
      const data = await res.json();
      setViewingCustomer(data);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 mt-1">
            Manage customer accounts and view order history
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowCustomerModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500"
        >
          + Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Customers</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">With Orders</p>
          <p className="text-2xl font-bold text-blue-400">{stats.withOrders}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">
            ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email, name, company, or customer #..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Customers Table */}
      {!loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Customer #
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Company
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Orders
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Total Spent
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="py-3 px-4 text-white font-mono text-sm">
                    {customer.customer_number || "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {customer.full_name || "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{customer.email}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {customer.company_name || "-"}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300">
                    {customer.order_count || 0}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400">
                    {customer.total_spent
                      ? `$${parseFloat(customer.total_spent).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "$0.00"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(
                        customer.status
                      )}`}
                    >
                      {STATUS_OPTIONS.find((s) => s.value === customer.status)?.label ||
                        customer.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewCustomer(customer.id)}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowCustomerModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Create/Edit Modal */}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* Customer Details Modal */}
      {viewingCustomer && (
        <CustomerDetailsModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onEdit={() => {
            setEditingCustomer(viewingCustomer);
            setViewingCustomer(null);
            setShowCustomerModal(true);
          }}
        />
      )}
    </div>
  );
}

// Customer Create/Edit Modal
function CustomerModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState({
    email: customer?.email || "",
    first_name: customer?.first_name || "",
    last_name: customer?.last_name || "",
    company_name: customer?.company_name || "",
    phone: customer?.phone || "",
    status: customer?.status || "active",
    // Billing
    billing_address_line1: customer?.billing_address_line1 || "",
    billing_address_line2: customer?.billing_address_line2 || "",
    billing_city: customer?.billing_city || "",
    billing_state: customer?.billing_state || "",
    billing_zip: customer?.billing_zip || "",
    billing_country: customer?.billing_country || "USA",
    // Shipping
    shipping_address_line1: customer?.shipping_address_line1 || "",
    shipping_address_line2: customer?.shipping_address_line2 || "",
    shipping_city: customer?.shipping_city || "",
    shipping_state: customer?.shipping_state || "",
    shipping_zip: customer?.shipping_zip || "",
    shipping_country: customer?.shipping_country || "USA",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    // Only include password for new customers or if changed
    if (!customer && password) {
      data.password = password;
    }
    onSave(data);
  };

  const copyBillingToShipping = () => {
    setForm({
      ...form,
      shipping_address_line1: form.billing_address_line1,
      shipping_address_line2: form.billing_address_line2,
      shipping_city: form.billing_city,
      shipping_state: form.billing_state,
      shipping_zip: form.billing_zip,
      shipping_country: form.billing_country,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {customer ? "Edit Customer" : "Add New Customer"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          {/* Password (only for new customers) */}
          {!customer && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Password (optional - customer can set via reset)
              </label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {/* Billing Address */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
              Billing Address
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={form.billing_address_line1}
                  onChange={(e) =>
                    setForm({ ...form, billing_address_line1: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={form.billing_address_line2}
                  onChange={(e) =>
                    setForm({ ...form, billing_address_line2: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={form.billing_city}
                    onChange={(e) =>
                      setForm({ ...form, billing_city: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={form.billing_state}
                    onChange={(e) =>
                      setForm({ ...form, billing_state: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={form.billing_zip}
                    onChange={(e) =>
                      setForm({ ...form, billing_zip: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.billing_country}
                    onChange={(e) =>
                      setForm({ ...form, billing_country: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-400 uppercase">
                Shipping Address
              </h3>
              <button
                type="button"
                onClick={copyBillingToShipping}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Copy from Billing
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={form.shipping_address_line1}
                  onChange={(e) =>
                    setForm({ ...form, shipping_address_line1: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={form.shipping_address_line2}
                  onChange={(e) =>
                    setForm({ ...form, shipping_address_line2: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={form.shipping_city}
                    onChange={(e) =>
                      setForm({ ...form, shipping_city: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={form.shipping_state}
                    onChange={(e) =>
                      setForm({ ...form, shipping_state: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={form.shipping_zip}
                    onChange={(e) =>
                      setForm({ ...form, shipping_zip: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.shipping_country}
                    onChange={(e) =>
                      setForm({ ...form, shipping_country: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500"
            >
              {customer ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Customer Details Modal
function CustomerDetailsModal({ customer, onClose, onEdit }) {
  const token = localStorage.getItem("adminToken");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [customer.id]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/admin/customers/${customer.id}/orders?limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // API returns array directly
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              {customer.full_name || customer.email}
            </h2>
            {customer.customer_number && (
              <p className="text-gray-400 text-sm font-mono">
                {customer.customer_number}
              </p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white"
          >
            Edit
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">
                {customer.order_count || 0}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Spent</p>
              <p className="text-2xl font-bold text-emerald-400">
                ${parseFloat(customer.total_spent || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Last Order</p>
              <p className="text-lg font-medium text-white">
                {customer.last_order_date
                  ? new Date(customer.last_order_date).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                <span className="text-white">{customer.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>{" "}
                <span className="text-white">{customer.phone || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">Company:</span>{" "}
                <span className="text-white">{customer.company_name || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    customer.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : customer.status === "suspended"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
                Billing Address
              </h3>
              <div className="text-sm text-gray-300">
                {customer.billing_address_line1 ? (
                  <>
                    <p>{customer.billing_address_line1}</p>
                    {customer.billing_address_line2 && (
                      <p>{customer.billing_address_line2}</p>
                    )}
                    <p>
                      {customer.billing_city}, {customer.billing_state}{" "}
                      {customer.billing_zip}
                    </p>
                    <p>{customer.billing_country}</p>
                  </>
                ) : (
                  <p className="text-gray-500">No billing address</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
                Shipping Address
              </h3>
              <div className="text-sm text-gray-300">
                {customer.shipping_address_line1 ? (
                  <>
                    <p>{customer.shipping_address_line1}</p>
                    {customer.shipping_address_line2 && (
                      <p>{customer.shipping_address_line2}</p>
                    )}
                    <p>
                      {customer.shipping_city}, {customer.shipping_state}{" "}
                      {customer.shipping_zip}
                    </p>
                    <p>{customer.shipping_country}</p>
                  </>
                ) : (
                  <p className="text-gray-500">No shipping address</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">
              Recent Orders
            </h3>
            {loadingOrders ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : orders.length > 0 ? (
              <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="text-left py-2 px-3 text-gray-400">
                        Order #
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400">Date</th>
                      <th className="text-left py-2 px-3 text-gray-400">
                        Status
                      </th>
                      <th className="text-right py-2 px-3 text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-700">
                        <td className="py-2 px-3 text-white font-mono">
                          {order.order_number}
                        </td>
                        <td className="py-2 px-3 text-gray-300">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          ${parseFloat(order.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No orders yet</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
