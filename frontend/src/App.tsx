import React, { useState, useEffect } from "react";
import { User, Product, Category, Customer, Floor, Table, Session, Order, Coupon, Promotion } from "./types";
import LoginScreen from "./components/LoginScreen";
import PosTerminal from "./components/PosTerminal";
import KitchenDisplay from "./components/KitchenDisplay";
import AdminPanel from "./components/AdminPanel";
import ReceiptModal from "./components/ReceiptModal";
import { Coffee, Flame, Shield, MonitorPlay, Sparkles } from "lucide-react";
import { clearAuthToken, getAuthToken, setAuthToken } from "./constants";

export default function App() {
  // Authentication & session state
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  // Applet core entities
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Navigation viewport (for admins, allow toggling all interfaces)
  const [navigationView, setNavigationView] = useState<'admin' | 'pos' | 'kitchen'>("pos");

  // Receipt Modal trigger
  const [receiptTargetOrder, setReceiptTargetOrder] = useState<Order | null>(null);

  // KDS Loading & Error states
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Load baseline values from database APIs
  const fetchAllData = async (authToken: string) => {
    setIsDataLoading(true);
    setOrdersError(null);
    try {
      const headers = { "Authorization": `Bearer ${authToken}` };

      // Parallelize REST queries cleanly
      const [
        meRes,
        productsRes,
        categoriesRes,
        customersRes,
        floorsRes,
        tablesRes,
        couponsRes,
        promotionsRes,
        ordersRes,
        sessionRes,
      ] = await Promise.all([
        fetch("/api/me", { headers }),
        fetch("/api/products", { headers }),
        fetch("/api/categories", { headers }),
        fetch("/api/customers", { headers }),
        fetch("/api/floors", { headers }),
        fetch("/api/tables", { headers }),
        fetch("/api/coupons", { headers }),
        fetch("/api/promotions", { headers }),
        fetch("/api/orders", { headers }),
        fetch("/api/sessions/current", { headers }),
      ]);

      const user = await meRes.json();
      if (!meRes.ok || !user || user.error) {
        throw new Error(user.error || "Me query failed");
      }
      setCurrentUser(user);

      if (user.role === "kitchen") {
        setNavigationView("kitchen");
      } else if (user.role === "admin") {
        setNavigationView("admin");
      } else {
        setNavigationView("pos");
      }

      // Safe parse helper to ensure states always receive valid arrays
      const parseArray = async (res: Response, name: string) => {
        if (!res.ok) {
          throw new Error(`Failed to load ${name} (status ${res.status})`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error(`Invalid response for ${name}: expected an array`);
        }
        return data;
      };

      try {
        const prodData = await parseArray(productsRes, "products");
        setProducts(prodData);
      } catch (err: any) {
        console.error(err);
        setProducts([]);
      }

      try {
        const catData = await parseArray(categoriesRes, "categories");
        setCategories(catData);
      } catch (err: any) {
        console.error(err);
        setCategories([]);
      }

      try {
        const custData = await parseArray(customersRes, "customers");
        setCustomers(custData);
      } catch (err: any) {
        console.error(err);
        setCustomers([]);
      }

      try {
        const floorData = await parseArray(floorsRes, "floors");
        setFloors(floorData);
      } catch (err: any) {
        console.error(err);
        setFloors([]);
      }

      try {
        const tableData = await parseArray(tablesRes, "tables");
        setTables(tableData);
      } catch (err: any) {
        console.error(err);
        setTables([]);
      }

      try {
        const couponData = await parseArray(couponsRes, "coupons");
        setCoupons(couponData);
      } catch (err: any) {
        console.error(err);
        setCoupons([]);
      }

      try {
        const promoData = await parseArray(promotionsRes, "promotions");
        setPromotions(promoData);
      } catch (err: any) {
        console.error(err);
        setPromotions([]);
      }

      try {
        const orderData = await parseArray(ordersRes, "orders");
        setOrders(orderData);
      } catch (err: any) {
        console.error(err);
        setOrders([]);
        setOrdersError("No kitchen orders available.");
      }

      try {
        const activeSession = await sessionRes.json();
        setCurrentSession(activeSession?.id ? activeSession : null);
      } catch (err) {
        console.error("Failed to load session", err);
        setCurrentSession(null);
      }

      // Fetch employees list if Admin
      if (user.role === "admin") {
        try {
          const empRes = await fetch("/api/users", { headers });
          const empData = await parseArray(empRes, "users");
          setEmployees(empData);
        } catch (err) {
          console.error(err);
          setEmployees([]);
        }
      }
    } catch (err) {
      console.error("Baseline sync error, logging out ...", err);
      handleLogout();
    } finally {
      setIsDataLoading(false);
    }
  };

  // Synchronize on startup mounting
  useEffect(() => {
    if (token) {
      fetchAllData(token);
    }
  }, [token]);

  // Real-time Event Listener (Server-Sent Events)
  useEffect(() => {
    if (!token) return;

    const sse = new EventSource(`/api/sse?token=${token}`);

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || !payload.data) return;

        if (["order_created", "new_order", "NEW_ORDER"].includes(payload.type)) {
          setOrders((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const exists = safePrev.some((o) => o && o.id === payload.data.id);
            if (exists) return safePrev.map((o) => o && o.id === payload.data.id ? payload.data : o);
            return [payload.data, ...safePrev];
          });
        } else if (["order_updated", "kitchen_update", "KITCHEN_UPDATE", "order_paid", "ORDER_PAID"].includes(payload.type)) {
          setOrders((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map((o) => o && o.id === payload.data.id ? payload.data : o);
          });
        } else if (["table_updated", "TABLE_STATUS_CHANGE"].includes(payload.type)) {
          setTables((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map((t) => t && t.id === payload.data.id ? payload.data : t);
          });
        } else if (["session_updated", "SESSION_UPDATE"].includes(payload.type)) {
          setCurrentSession(payload.data?.id ? payload.data : null);
        } else if (payload.type === "product_updated") {
          setProducts((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map((p) => p && p.id === payload.data.id ? payload.data : p);
          });
        }
      } catch (e) {
        console.error("SSE parsing or state update failure:", e);
      }
    };

    sse.onerror = () => {};

    return () => sse.close();
  }, [token]);

  // REST API trigger helpers
  const handleLogin = async (email: string, pass: string, role: "admin" | "cashier" | "kitchen") => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Auth error");
    }
    setAuthToken(data.token);
    setToken(data.token);
  };

  const handleLogout = () => {
    clearAuthToken();
    setToken(null);
    setCurrentUser(null);
    setCurrentSession(null);
  };

  // Products CRUD
  const handleAddProduct = async (form: Partial<Product>) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const parsed = await res.json();
    setProducts((prev) => [...prev, parsed]);
    return parsed;
  };

  const handleEditProduct = async (id: string, form: Partial<Product>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const parsed = await res.json();
    setProducts((prev) => prev.map((p) => p.id === id ? parsed : p));
    return parsed;
  };

  const handleDeleteProduct = async (id: string) => {
    await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleBulkDeleteProducts = async (ids: string[]) => {
    // Send individual deletions sequentially or write a bulk API. Sequential is safe and reliable with our mock DB!
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        })
      )
    );
    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
  };

  // Categories CRUD
  const handleAddCategory = async (form: Partial<Category>) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCategories((prev) => [...prev, data]);
    return data;
  };

  const handleEditCategory = async (id: string, form: Partial<Category>) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCategories((prev) => prev.map((c) => c.id === id ? data : c));
    return data;
  };

  const handleDeleteCategory = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Floors CRUD
  const handleAddFloor = async (form: Partial<Floor>) => {
    const res = await fetch("/api/floors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setFloors((prev) => [...prev, data]);
    return data;
  };

  const handleEditFloor = async (id: string, form: Partial<Floor>) => {
    const res = await fetch(`/api/floors/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setFloors((prev) => prev.map((f) => f.id === id ? data : f));
    return data;
  };

  const handleDeleteFloor = async (id: string) => {
    await fetch(`/api/floors/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setFloors((prev) => prev.filter((f) => f.id !== id));
  };

  // Tables CRUD
  const handleAddTable = async (form: Partial<Table>) => {
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setTables((prev) => [...prev, data]);
    return data;
  };

  const handleEditTable = async (id: string, form: Partial<Table>) => {
    const res = await fetch(`/api/tables/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setTables((prev) => prev.map((t) => t.id === id ? data : t));
    return data;
  };

  const handleDeleteTable = async (id: string) => {
    await fetch(`/api/tables/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  // Employees Admin list Management
  const handleAddEmployee = async (form: any) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setEmployees((prev) => [...prev, data]);
    return data;
  };

  const handleEditEmployee = async (id: string, form: any) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setEmployees((prev) => prev.map((e) => e.id === id ? data : e));
    return data;
  };

  const handleDeleteEmployee = async (id: string) => {
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  // Coupons CRUD
  const handleAddCoupon = async (form: Partial<Coupon>) => {
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCoupons((prev) => [...prev, data]);
    return data;
  };

  const handleEditCoupon = async (id: string, form: Partial<Coupon>) => {
    const res = await fetch(`/api/coupons/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCoupons((prev) => prev.map((c) => c.id === id ? data : c));
    return data;
  };

  const handleDeleteCoupon = async (id: string) => {
    await fetch(`/api/coupons/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  // Promotions CRUD
  const handleAddPromotion = async (form: Partial<Promotion>) => {
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setPromotions((prev) => [...prev, data]);
    return data;
  };

  const handleEditPromotion = async (id: string, form: Partial<Promotion>) => {
    const res = await fetch(`/api/promotions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setPromotions((prev) => prev.map((p) => p.id === id ? data : p));
    return data;
  };

  const handleDeletePromotion = async (id: string) => {
    await fetch(`/api/promotions/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  };

  // Customer assignor
  const handleAddCustomer = async (form: { name: string; email: string; phone: string }) => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const parsed = await res.json();
    setCustomers((prev) => [parsed, ...prev]);
    return parsed;
  };

  // Payment method trigger updates settings
  const handleUpdatePaymentSettings = async (settings: any) => {
    await fetch("/api/payment-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
  };

  // Pos dynamic sessions manager
  const handleOpenSession = async (balance: number) => {
    const res = await fetch("/api/sessions/open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ openingBalance: balance }),
    });
    const active = await res.json();
    setCurrentSession(active);
  };

  const handleCloseSession = async (balance: number) => {
    const res = await fetch("/api/sessions/close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ closingBalance: balance }),
    });
    const active = await res.json();
    setCurrentSession(null);
  };

  // Order Ticket actions
  const handleSubmitOrder = async (orderForm: Partial<Order>) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(orderForm),
    });
    const parsed = await res.json();
    setOrders((prev) => [parsed, ...prev]);
    return parsed;
  };

  const handlePayOrder = async (
    orderId: string,
    method: 'cash' | 'card' | 'upi',
    paymentDetails?: Order["paymentDetails"]
  ) => {
    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentMethod: method, ...paymentDetails }),
    });
    const parsed = await res.json();
    if (!res.ok) {
      throw new Error(parsed.error || "Payment failed");
    }
    setOrders((prev) => prev.map((o) => o.id === orderId ? parsed : o));
    return parsed;
  };

  const handleCompleteKitchenItem = async (orderId: string, productId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/complete-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });
      const updatedOrder = await res.json();
      setOrders((prev) => prev.map((o) => o.id === orderId ? updatedOrder : o));
    } catch {}
  };

  const handleCompleteWholeTicket = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/complete-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      const updatedOrder = await res.json();
      setOrders((prev) => prev.map((o) => o.id === orderId ? updatedOrder : o));
    } catch {}
  };

  const handleTableStatusChange = async (tableId: string, status: 'available' | 'occupied' | 'reserved') => {
    const res = await fetch(`/api/tables/${tableId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setTables((prev) => prev.map((t) => t.id === tableId ? data : t));
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-1 h-screen items-center justify-center bg-[#FAF7F2] text-[#6F4E37]">
        <div className="text-center font-display space-y-4">
          <div className="h-10 w-10 bg-[#F5EFE6] rounded-full animate-bounce mx-auto flex items-center justify-center shadow-lg shadow-[#6F4E37]/10">
            <Sparkles className="h-5 w-5 text-[#C8A96B]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Preparing your cafe workspace ...</span>
        </div>
      </div>
    );
  }

  return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#FAF7F2] text-[#2B2B2B]">
      
      {/* 1. APPLET TOP GENERAL BRAND & ROLE NAVIGATION TABSWITCH */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E6DDD2] bg-[#FFFFFF] px-6 text-[#6F4E37] text-xs shadow-[0_4px_20px_rgba(111,78,55,0.04)]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6F4E37] to-[#3E2723] shadow-md shadow-[#6F4E37]/15">
            <Coffee className="h-4 w-4 text-[#FAF7F2]" />
          </div>
          <span className="font-display font-black text-sm tracking-wider uppercase text-[#3E2723]">Cafe POS</span>
        </div>

        {/* View switcher for portal role */}
        <div className="flex items-center gap-1 rounded-xl p-1">
          {currentUser.role === "admin" && (
            <span className="flex items-center gap-1.5 rounded-xl bg-[#F5EFE6] border border-[#E6DDD2] px-3.5 py-1.5 font-bold text-[#3E2723]">
              <Shield className="h-3.5 w-3.5 text-[#6F4E37]" />
              Admin Portal
            </span>
          )}

          {currentUser.role === "cashier" && (
            <span className="flex items-center gap-1.5 rounded-xl bg-[#F5EFE6] border border-[#E6DDD2] px-3.5 py-1.5 font-bold text-[#3E2723]">
              <Coffee className="h-3.5 w-3.5 text-[#6F4E37]" />
              Cashier Portal / {currentUser.name}
            </span>
          )}

          {currentUser.role === "kitchen" && (
            <span className="flex items-center gap-1.5 rounded-xl bg-[#F5EFE6] border border-[#E6DDD2] px-3.5 py-1.5 font-bold text-[#3E2723]">
              <MonitorPlay className="h-3.5 w-3.5 text-[#6F4E37]" />
              Kitchen Portal / {currentUser.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#6B5B4D] font-medium">Welcome, <strong className="text-[#3E2723] font-bold">{currentUser.name}</strong></span>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-[#E6DDD2] bg-[#FAF7F2] hover:bg-[#F5EFE6] px-4 py-2 text-[10px] font-black text-[#6F4E37] transition duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* 2. PRIMARY SCREEN ROUTERS LAYOUT */}
      <div className="flex-1 overflow-hidden">
        {navigationView === "admin" && currentUser.role === "admin" && (
          <AdminPanel
            products={products}
            categories={categories}
            floors={floors}
            tables={tables}
            employees={employees}
            coupons={coupons}
            promotions={promotions}
            orders={orders}
            sessions={[]}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onBulkDeleteProducts={handleBulkDeleteProducts}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddFloor={handleAddFloor}
            onEditFloor={handleEditFloor}
            onDeleteFloor={handleDeleteFloor}
            onAddTable={handleAddTable}
            onEditTable={handleEditTable}
            onDeleteTable={handleDeleteTable}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddCoupon={handleAddCoupon}
            onEditCoupon={handleEditCoupon}
            onDeleteCoupon={handleDeleteCoupon}
            onAddPromotion={handleAddPromotion}
            onEditPromotion={handleEditPromotion}
            onDeletePromotion={handleDeletePromotion}
            onUpdatePaymentSettings={handleUpdatePaymentSettings}
            onLogout={handleLogout}
          />
        )}

        {navigationView === "pos" && currentUser.role === "cashier" && (
          <PosTerminal
            products={products}
            categories={categories}
            customers={customers}
            tables={tables}
            coupons={coupons}
            promotions={promotions}
            currentSession={currentSession}
            onOpenSession={handleOpenSession}
            onCloseSession={handleCloseSession}
            onSubmitOrder={handleSubmitOrder}
            onPayOrder={handlePayOrder}
            onTableStatusChange={handleTableStatusChange}
            onAddCustomer={handleAddCustomer}
            onTriggerReceipt={(ord) => setReceiptTargetOrder(ord)}
          />
        )}

        {navigationView === "kitchen" && currentUser.role === "kitchen" && (
          <KitchenDisplay
            orders={orders}
            tables={tables}
            products={products}
            onCompleteItem={handleCompleteKitchenItem}
            onCompleteTicket={handleCompleteWholeTicket}
            isLoading={isDataLoading}
            error={ordersError}
          />
        )}
      </div>

      {/* 3. FLOATING PORTAL CUSTOMER RECEIPT VIEW */}
      {receiptTargetOrder && (
        <ReceiptModal
          order={receiptTargetOrder}
          customer={customers.find((c) => c.id === receiptTargetOrder.customerId) || null}
          table={tables.find((t) => t.id === receiptTargetOrder.tableId) || null}
          onClose={() => setReceiptTargetOrder(null)}
        />
      )}

    </div>
  );
}
