import React, { useState, useEffect } from "react";
import { User, Product, Category, Customer, Floor, Table, Session, Order, Coupon, Promotion } from "./types";
import LoginScreen from "./components/LoginScreen";
import PosTerminal from "./components/PosTerminal";
import KitchenDisplay from "./components/KitchenDisplay";
import AdminPanel from "./components/AdminPanel";
import ReceiptModal from "./components/ReceiptModal";
import { Coffee, Flame, Shield, MonitorPlay, Sparkles } from "lucide-react";

export default function App() {
  // Authentication & session state
  const [token, setToken] = useState<string | null>(localStorage.getItem("cafeflow_token"));
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

  // Load baseline values from database APIs
  const fetchAllData = async (authToken: string) => {
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
      setCurrentUser(user);

      if (user.role === "kitchen") {
        setNavigationView("kitchen");
      } else if (user.role === "admin") {
        setNavigationView("admin");
      } else {
        setNavigationView("pos");
      }

      setProducts(await productsRes.json());
      setCategories(await categoriesRes.json());
      setCustomers(await customersRes.json());
      setFloors(await floorsRes.json());
      setTables(await tablesRes.json());
      setCoupons(await couponsRes.json());
      setPromotions(await promotionsRes.json());
      setOrders(await ordersRes.json());

      const activeSession = await sessionRes.json();
      setCurrentSession(activeSession?.id ? activeSession : null);

      // Fetch employees list if Admin
      if (user.role === "admin") {
        const empRes = await fetch("/api/users", { headers });
        setEmployees(await empRes.json());
      }
    } catch (err) {
      console.error("Baseline sync error, logging out ...", err);
      handleLogout();
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
        console.log("SSE Live Broadcast received:", payload);

        if (payload.type === "order_created") {
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === payload.data.id);
            if (exists) return prev.map((o) => o.id === payload.data.id ? payload.data : o);
            return [payload.data, ...prev];
          });
        } else if (payload.type === "order_updated") {
          setOrders((prev) => prev.map((o) => o.id === payload.data.id ? payload.data : o));
        } else if (payload.type === "table_updated") {
          setTables((prev) => prev.map((t) => t.id === payload.data.id ? payload.data : t));
        } else if (payload.type === "session_updated") {
          setCurrentSession(payload.data?.id ? payload.data : null);
        } else if (payload.type === "product_updated") {
          setProducts((prev) => prev.map((p) => p.id === payload.data.id ? payload.data : p));
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    sse.onerror = (e) => {
      console.warn("SSE disconnected, trying reconnection...");
    };

    return () => sse.close();
  }, [token]);

  // REST API trigger helpers
  const handleLogin = async (email: string, pass: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Auth error");
    }
    localStorage.setItem("cafeflow_token", data.token);
    setToken(data.token);
  };

  const handleSignup = async (name: string, email: string, pass: string, role: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: pass, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Signup error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cafeflow_token");
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

  const handlePayOrder = async (orderId: string, method: 'cash' | 'card' | 'upi') => {
    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentMethod: method }),
    });
    const parsed = await res.json();
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
    } catch (e) {
      console.error(e);
    }
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
    } catch (e) {
      console.error(e);
    }
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
    return <LoginScreen onLogin={handleLogin} onSignup={handleSignup} />;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-1 h-screen items-center justify-center bg-[#0c0a0f] text-purple-400">
        <div className="text-center font-mono space-y-4">
          <div className="h-10 w-10 bg-purple-600/30 rounded-full animate-bounce mx-auto flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <span className="text-xs">Loading secure restaurant node ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      
      {/* 1. APPLET TOP GENERAL BRAND & ROLE NAVIGATION TABSWITCH */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-150 bg-[#0c0a0f] px-6 text-white text-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600">
            <Flame className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-display font-medium tracking-wide">CafeFlow POS Terminal</span>
        </div>

        {/* View switcher for admin role */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
          {currentUser.role === "admin" && (
            <>
              <button
                id="btn-nav-admin"
                onClick={() => setNavigationView("admin")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 font-semibold transition ${
                  navigationView === "admin"
                    ? "bg-purple-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Shield className="h-3 w-3" />
                Office Admin
              </button>

              <button
                id="btn-nav-pos"
                onClick={() => setNavigationView("pos")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 font-semibold transition ${
                  navigationView === "pos"
                    ? "bg-purple-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Coffee className="h-3 w-3" />
                POS Cashier
              </button>

              <button
                id="btn-nav-kitchen"
                onClick={() => setNavigationView("kitchen")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 font-semibold transition ${
                  navigationView === "kitchen"
                    ? "bg-purple-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <MonitorPlay className="h-3 w-3" />
                Kitchen Display
              </button>
            </>
          )}

          {currentUser.role === "employee" && (
            <span className="text-neutral-300 font-semibold px-3 uppercase tracking-wider text-[10px] block">
              Logged in as Cashier / {currentUser.name}
            </span>
          )}

          {currentUser.role === "kitchen" && (
            <span className="text-neutral-300 font-semibold px-3 uppercase tracking-wider text-[10px] block">
              Logged in as Kitchen Cook / {currentUser.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-medium">Hello, <strong className="text-white">{currentUser.name}</strong></span>
          <button
            onClick={handleLogout}
            className="rounded border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 px-2 py-1 text-[10px] font-semibold text-neutral-400 hover:text-red-400"
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

        {navigationView === "pos" && (
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

        {navigationView === "kitchen" && (
          <KitchenDisplay
            orders={orders}
            tables={tables}
            products={products}
            onCompleteItem={handleCompleteKitchenItem}
            onCompleteTicket={handleCompleteWholeTicket}
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
