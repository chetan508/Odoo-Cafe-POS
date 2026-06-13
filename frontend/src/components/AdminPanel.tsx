import React, { useState, useEffect } from "react";
import { Product, Category, Floor, Table, User, Coupon, Promotion, Order, Session } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { LayoutDashboard, ShoppingCart, Layers, Grid, Users, Settings, Tag, Shield, FileSpreadsheet, CreditCard, LogOut, Search, Plus, Trash2, Edit2, Key, Archive, Check, X, FileText, ArrowUpRight, TrendingUp, DollarSign, ListOrdered, Percent, Eye, Sparkles, Coffee, Globe, Moon, Sun, Award } from "lucide-react";
import { APP_NAME, DEFAULT_UPI_VPA, getAuthToken } from "../constants";

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  floors: Floor[];
  tables: Table[];
  employees: User[];
  coupons: Coupon[];
  promotions: Promotion[];
  orders: Order[];
  sessions: Session[];
  onAddProduct: (prod: Partial<Product>) => Promise<Product>;
  onEditProduct: (id: string, prod: Partial<Product>) => Promise<Product>;
  onDeleteProduct: (id: string) => Promise<void>;
  onBulkDeleteProducts: (ids: string[]) => Promise<void>;
  onAddCategory: (cat: Partial<Category>) => Promise<Category>;
  onEditCategory: (id: string, cat: Partial<Category>) => Promise<Category>;
  onDeleteCategory: (id: string) => Promise<void>;
  onAddFloor: (flr: Partial<Floor>) => Promise<Floor>;
  onEditFloor: (id: string, flr: Partial<Floor>) => Promise<Floor>;
  onDeleteFloor: (id: string) => Promise<void>;
  onAddTable: (tbl: Partial<Table>) => Promise<Table>;
  onEditTable: (id: string, tbl: Partial<Table>) => Promise<Table>;
  onDeleteTable: (id: string) => Promise<void>;
  onAddEmployee: (emp: any) => Promise<User>;
  onEditEmployee: (id: string, emp: any) => Promise<User>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onAddCoupon: (cpn: Partial<Coupon>) => Promise<Coupon>;
  onEditCoupon: (id: string, cpn: Partial<Coupon>) => Promise<Coupon>;
  onDeleteCoupon: (id: string) => Promise<void>;
  onAddPromotion: (prm: Partial<Promotion>) => Promise<Promotion>;
  onEditPromotion: (id: string, prm: Partial<Promotion>) => Promise<Promotion>;
  onDeletePromotion: (id: string) => Promise<void>;
  onUpdatePaymentSettings: (settings: any) => Promise<void>;
  onLogout: () => void;
}

export default function AdminPanel({
  products,
  categories,
  floors,
  tables,
  employees,
  coupons,
  promotions,
  orders,
  sessions,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onBulkDeleteProducts,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddFloor,
  onEditFloor,
  onDeleteFloor,
  onAddTable,
  onEditTable,
  onDeleteTable,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onAddCoupon,
  onEditCoupon,
  onDeleteCoupon,
  onAddPromotion,
  onEditPromotion,
  onDeletePromotion,
  onUpdatePaymentSettings,
  onLogout,
}: AdminPanelProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Filter ranges for Reports / Dashboard
  const [reportRange, setReportRange] = useState<string>("today"); // today, week, month, custom
  const [reportEmployee, setReportEmployee] = useState<string>("all");
  const [reportProduct, setReportProduct] = useState<string>("all");
  const [reportSession, setReportSession] = useState<string>("all");

  // AI forecasting data
  const [aiForecasting, setAiForecasting] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  // CRUD Forms lists
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [bulkList, setBulkList] = useState<string[]>([]);

  // Editing dialog indices references
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);

  // Form templates
  const [prodForm, setProdForm] = useState({ name: "", price: 0, categoryId: "", unit: "portion", tax: 5, description: "", image: "", isKitchenItem: true });
  const [catForm, setCatForm] = useState({ name: "", color: "#8b5cf6" });
  const [floorForm, setFloorForm] = useState({ name: "" });
  const [tableForm, setTableForm] = useState({ tableNumber: "", seats: 4, floorId: "", active: true, status: "available" as any });
  const [couponForm, setCouponForm] = useState({ code: "", discountType: "fixed" as any, discountValue: 50, active: true });
  const [promoForm, setPromoForm] = useState({ promotionType: "order_discount" as any, minimumQuantity: 3, minimumOrderAmount: 1000, discountType: "fixed" as any, discountValue: 100, active: true, description: "" });
  const [empForm, setEmpForm] = useState({ name: "", email: "", password: "", role: "cashier" as any, status: "active" as any });
  const [paySettingsForm, setPaySettingsForm] = useState({ cashEnabled: true, cardEnabled: true, upiEnabled: true, upiVpa: DEFAULT_UPI_VPA });

  // Settings configs
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [multiBranchEnabled, setMultiBranchEnabled] = useState<boolean>(false);
  const [loyaltyMultiplier, setLoyaltyMultiplier] = useState<number>(1);

  // Synchronize payment settings
  useEffect(() => {
    fetch("/api/payment-settings", {
      headers: { "Authorization": `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.upiVpa) setPaySettingsForm(data);
      })
      .catch(() => undefined);
  }, []);

  // Fetch AI Forecasting Report
  const triggerAIForecast = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ filterDays: reportRange }),
      });
      const data = await response.json();
      setAiForecasting(data);
    } catch {
      setAiForecasting(null);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      triggerAIForecast();
    }
  }, [activeTab]);

  // Aggregate metrics reports
  const paidOrders = orders.filter((o) => {
    if (o.status !== "paid") return false;
    
    // Day Range
    const date = new Date(o.createdAt);
    const diffMs = Date.now() - date.getTime();
    if (reportRange === "today" && diffMs > 24 * 3600000) return false;
    if (reportRange === "week" && diffMs > 7 * 24 * 3600000) return false;
    if (reportRange === "month" && diffMs > 30 * 24 * 3600000) return false;

    // Filter Employee
    if (reportEmployee !== "all" && o.employeeId !== reportEmployee) return false;
    
    // Filter Product
    if (reportProduct !== "all" && !o.items.some((i) => i.productId === reportProduct)) return false;

    return true;
  });

  const totalOrders = paidOrders.length;
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Static Excel Export (renders a dynamic CSV sheet and triggers native download)
  const handleExportXLS = () => {
    let csv = "Order Number,Date,Server Employee,Items Count,Subtotal,Discount,Tax,Total Revenue,Payment Method\n";
    paidOrders.forEach((o) => {
      const serverName = employees.find((e) => e.id === o.employeeId)?.name || "Cashier";
      const itemsCount = o.items.reduce((sum, itm) => sum + itm.quantity, 0);
      csv += `"${o.orderNumber}","${o.createdAt.split("T")[0]}","${serverName}",${itemsCount},${o.subtotal},${o.discount},${o.tax},${o.total},"${o.paymentMethod || "UPI"}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Cafe_POS_Revenue_Report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Static PDF Print Report
  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${APP_NAME} Analytics PDF Report</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              h1 { font-size: 24px; color: #7c3aed; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f3ff; color: #6d28d9; }
            </style>
          </head>
          <body>
            <h1>${APP_NAME} - Revenue Dashboard Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Orders:</strong> ${totalOrders} | <strong>Revenue:</strong> ₹${totalRevenue.toFixed(2)} | <strong>Average Ticket:</strong> ₹${averageOrderValue.toFixed(2)}</p>
            <h3>Recent Paid Transactions</h3>
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${paidOrders.map(o => `
                  <tr>
                    <td>${o.orderNumber}</td>
                    <td>${o.createdAt.split("T")[0]}</td>
                    <td>₹${o.subtotal.toFixed(2)}</td>
                    <td>₹${o.tax.toFixed(2)}</td>
                    <td>₹${o.discount.toFixed(2)}</td>
                    <td><strong>₹${o.total.toFixed(2)}</strong></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // ----------------------------------------------------
  // DATA PREP FOR CHARTS
  // ----------------------------------------------------
  
  // 1. Sales Trend
  const salesMap = paidOrders.reduce((acc: any, o) => {
    const day = new Date(o.createdAt).toLocaleDateString("en-IN", { weekday: "short" });
    acc[day] = (acc[day] || 0) + o.total;
    return acc;
  }, {});
  const salesTrendData = Object.keys(salesMap).map((day) => ({ day, Sales: salesMap[day] }));

  // 2. Top Categories
  const categoryMap = paidOrders.reduce((acc: any, o) => {
    o.items.forEach((itm) => {
      const prod = products.find((p) => p.id === itm.productId);
      const catName = categories.find((c) => c.id === prod?.categoryId)?.name || "Other";
      acc[catName] = (acc[catName] || 0) + itm.lineTotal;
    });
    return acc;
  }, {});
  const topCategoriesData = Object.keys(categoryMap).map((name) => ({ name, value: categoryMap[name] }));

  // 3. Top Products
  const productMap = paidOrders.reduce((acc: any, o) => {
    o.items.forEach((itm) => {
      acc[itm.productName] = (acc[itm.productName] || 0) + itm.quantity;
    });
    return acc;
  }, {});
  const topProductsData = Object.keys(productMap)
    .map((name) => ({ name, Sales: productMap[name] }))
    .sort((a, b) => b.Sales - a.Sales)
    .slice(0, 5);

  // Sidebar Menu links
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: ShoppingCart },
    { id: "categories", label: "Categories", icon: Layers },
    { id: "floors", label: "Floors", icon: Grid },
    { id: "tables", label: "Tables", icon: Grid },
    { id: "coupons", label: "Coupons", icon: Tag },
    { id: "promotions", label: "Promotions", icon: Percent },
    { id: "employees", label: "Employees", icon: Users },
    { id: "payments", label: "Payment Methods", icon: CreditCard },
    { id: "reports", label: "Reports Module", icon: FileSpreadsheet },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Sorting products helper
  const sortedProducts = [...products]
    .filter((p) => {
      const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      let valA = a[sortField as keyof typeof a];
      let valB = b[sortField as keyof typeof b];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "desc" ? 1 : -1;
      if (valA > valB) return sortOrder === "desc" ? -1 : 1;
      return 0;
    });

  const toggleBulk = (id: string) => {
    if (bulkList.includes(id)) {
      setBulkList(bulkList.filter((x) => x !== id));
    } else {
      setBulkList([...bulkList, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkList.length === 0) return;
    if (confirm(`Are you sure you want to delete ${bulkList.length} products in bulk?`)) {
      await onBulkDeleteProducts(bulkList);
      setBulkList([]);
    }
  };

  return (
    <div className={`flex flex-1 h-[89vh] font-sans overflow-hidden bg-gray-50`}>
      
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-[#E7DCCB] bg-[#FFFDF9] flex flex-col justify-between overflow-y-auto">
        <div className="py-4">
          <div className="px-6 pb-4 border-b border-[#E7DCCB] flex items-center gap-2">
            <Coffee className="h-5 w-5 text-[#6F4E37]" />
            <span className="font-display font-black text-sm tracking-wider text-[#3E2723]">Cafe POS Office</span>
          </div>

          <nav className="mt-4 px-3 space-y-1">
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold tracking-wide transition cursor-pointer ${
                    isSelected ? "bg-purple-100 text-purple-800" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Admin Contents Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
        
        {/* ====================================
            TAB: DASHBOARD
            ==================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header banner */}
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Dashboard Reports</h2>
                <p className="text-xs text-gray-500">Live operational metrics and revenue insights</p>
              </div>

              {/* Time Filters */}
              <div className="flex gap-2 bg-white rounded-xl border border-gray-100 p-1">
                {["today", "week", "month"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportRange(r)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition ${
                      reportRange === r ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </header>

            {/* Metrics cards widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Revenue</span>
                  <h3 className="font-mono font-black text-xl text-gray-900 mt-1">₹{totalRevenue.toFixed(2)}</h3>
                  <p className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5"><ArrowUpRight className="h-3.5 w-3.5" /> +14.2% versus yesterday</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <ListOrdered className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Paid Tickets</span>
                  <h3 className="font-mono font-black text-xl text-gray-900 mt-1">{totalOrders}</h3>
                  <p className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5"><ArrowUpRight className="h-3.5 w-3.5" /> All operations stable</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Average Order Value</span>
                  <h3 className="font-mono font-black text-xl text-gray-900 mt-1">₹{averageOrderValue.toFixed(2)}</h3>
                  <p className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5"><ArrowUpRight className="h-3.5 w-3.5" /> Premium cart growth active</p>
                </div>
              </div>
            </div>

            {/* Business Forecasting Box */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-6 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-200/20 blur-2xl pointer-events-none" />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 text-purple-900">
                  <Sparkles className="h-5 w-5 text-purple-600 pulsing-ring rounded-full" />
                  <h4 className="font-display font-extrabold text-sm tracking-wide uppercase">Business Forecasts</h4>
                </div>
                
                {loadingAI ? (
                  <div className="mt-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-purple-200/60 rounded w-11/12" />
                    <div className="h-4 bg-purple-200/60 rounded w-9/12" />
                    <div className="h-4 bg-purple-200/60 rounded w-5/12" />
                  </div>
                ) : aiForecasting ? (
                  <div className="mt-3">
                    <p className="text-xs text-purple-950 font-medium leading-relaxed">{aiForecasting.forecastSummary}</p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Growth Insights */}
                      <div className="rounded-xl bg-white/70 p-3.5 border border-purple-100">
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Actionable insights</span>
                        <ul className="mt-2 space-y-1.5">
                          {aiForecasting.growthInsights?.map((ins: string, idx: number) => (
                            <li key={idx} className="text-[10px] text-gray-700 flex items-start gap-1.5 leading-normal">
                              <span className="mt-1 flex h-1 w-1 shrink-0 rounded-full bg-purple-500" />
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Best Seller */}
                      <div className="rounded-xl bg-white/70 p-3.5 border border-purple-100 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Predicted Best Seller</span>
                          <span className="text-xs font-black text-gray-900 mt-2 block">{aiForecasting.predictedBestSeller}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-green-600 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" /> Matched for upcoming service cycles
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">Refresh the forecast to model sales trends.</p>
                )}
              </div>

              <button
                onClick={triggerAIForecast}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 text-xs flex items-center gap-2 shadow transition cursor-pointer self-end md:self-auto shrink-0"
              >
                <Coffee className="h-4 w-4" />
                Refresh Forecast
              </button>
            </div>

            {/* Recharts Graphical section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Sales trends Line area */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weekly Sales Trend (₹)</span>
                {salesTrendData.length > 0 ? (
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrendData}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="Sales" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-12 text-center">No historic sales date within selected filter.</p>
                )}
              </div>

              {/* Top Products Bar Chart */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Products (Qty Sold)</span>
                {topProductsData.length > 0 ? (
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProductsData}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="Sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-12 text-center">No catalog purchase histories found.</p>
                )}
              </div>
            </div>

            {/* Bottom: Top Orders static review card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Top Orders Feed</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold pb-2">
                      <th className="py-2.5">Order Number</th>
                      <th>Date</th>
                      <th>Items Count</th>
                      <th>Discount Applied</th>
                      <th>Total Sum</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidOrders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="border-b border-gray-50 text-gray-700 hover:bg-gray-50/40">
                        <td className="py-3 font-mono font-bold text-purple-950">{o.orderNumber}</td>
                        <td>{o.createdAt.split("T")[0]}</td>
                        <td>{o.items.reduce((sum, item) => sum + item.quantity, 0)} Items</td>
                        <td className={o.discount > 0 ? "text-rose-600 font-semibold" : ""}>₹{o.discount.toFixed(2)}</td>
                        <td className="font-bold text-purple-700">₹{o.total.toFixed(2)}</td>
                        <td><span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] uppercase font-bold text-gray-600">{o.paymentMethod || "UPI"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================
            TAB: PRODUCT MANAGEMENT (CRUD)
            ==================================== */}
        {activeTab === "products" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Food & Beverage Products</h2>
                <p className="text-xs text-gray-500">Manage diner catalog, edit tax margins, and create items</p>
              </div>

              <div className="flex gap-2">
                {bulkList.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Bulk Dismiss ({bulkList.length})
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveEditingId("new");
                    setProdForm({ name: "", price: 250, categoryId: categories[0]?.id || "", unit: "portion", tax: 5, description: "", image: "", isKitchenItem: true });
                  }}
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add New Product
                </button>
              </div>
            </header>

            {/* Products catalog grid search and filter selectors */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Review product catalog name..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none text-gray-600"
              >
                <option value="all">All Food Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Editing Pane Modal */}
            {activeEditingId && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (activeEditingId === "new") {
                      await onAddProduct(prodForm);
                    } else {
                      await onEditProduct(activeEditingId, prodForm);
                    }
                    setActiveEditingId(null);
                  } catch (err) {
                    alert(err);
                  }
                }}
                className="bg-white rounded-2xl border border-purple-200 p-6 space-y-4 shadow"
              >
                <h3 className="font-display font-black text-sm tracking-wide text-purple-950 uppercase">
                  {activeEditingId === "new" ? "Add Product Card" : "Edit Product Details"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={prodForm.name}
                      onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                      placeholder="e.g. Saffron Pistachio Croissant"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Standard Price (₹) *</label>
                    </div>
                    <input
                      type="number"
                      required
                      value={prodForm.price}
                      onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Category Group *</label>
                    <select
                      value={prodForm.categoryId}
                      onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-600 focus:border-purple-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Unit Measurement</label>
                    <input
                      type="text"
                      value={prodForm.unit}
                      onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                      placeholder="portion, glass, cup"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tax Rate (CGST+SGST %)</label>
                    <input
                      type="number"
                      value={prodForm.tax}
                      onChange={(e) => setProdForm({ ...prodForm, tax: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                      placeholder="5, 12, 18"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Interactive Image URL</label>
                    <input
                      type="text"
                      value={prodForm.image}
                      onChange={(e) => setProdForm({ ...prodForm, image: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                      placeholder="Splash image address..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={prodForm.isKitchenItem}
                      onChange={(e) => setProdForm({ ...prodForm, isKitchenItem: e.target.checked })}
                      className="rounded text-purple-600"
                    />
                    Requires Kitchen cook preparation?
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                  <textarea
                    value={prodForm.description}
                    onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500 h-20"
                    placeholder="Brief description of dietary and raw ingredients..."
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveEditingId(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* List Products display */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold pb-2">
                      <th className="py-3 px-4 w-10">Bulk</th>
                      <th>Product Info</th>
                      <th>Category</th>
                      <th>Base Cost</th>
                      <th>Tax</th>
                      <th>KDS Routing</th>
                      <th className="text-right pr-6">Manage Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map((p) => {
                      const cName = categories.find((c) => c.id === p.categoryId)?.name || "Other";
                      const cColor = categories.find((c) => c.id === p.categoryId)?.color || "#8b5cf6";
                      return (
                        <tr key={p.id} className="border-b border-gray-50 text-gray-700 hover:bg-gray-50/20">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={bulkList.includes(p.id)}
                              onChange={() => toggleBulk(p.id)}
                              className="rounded text-purple-600 focus:ring-0"
                            />
                          </td>
                          <td className="py-3 flex items-center gap-3">
                            <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                            <div>
                              <p className="font-bold text-purple-950">{p.name}</p>
                              <p className="text-[10px] text-gray-400 line-clamp-1">{p.description || "No description loaded."}</p>
                            </div>
                          </td>
                          <td>
                            <span className="rounded bg-gray-50 p-1 px-2 font-semibold text-[10px] uppercase block border border-gray-150 text-center max-w-[120px]" style={{ color: cColor }}>
                              {cName}
                            </span>
                          </td>
                          <td className="font-mono font-bold text-purple-950">₹{p.price.toFixed(2)} / {p.unit}</td>
                          <td>{p.tax}% GST</td>
                          <td>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              p.isKitchenItem ? "bg-orange-50 text-orange-600" : "bg-teal-50 text-teal-600"
                            }`}>
                              {p.isKitchenItem ? "Kitchen item" : "Pre-packaged"}
                            </span>
                          </td>
                          <td className="text-right pr-6 space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setActiveEditingId(p.id);
                                setProdForm({ ...p });
                              }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete product ${p.name}?`)) {
                                  await onDeleteProduct(p.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================
            TAB: CATEGORY MANAGEMENT (CRUD)
            ==================================== */}
        {activeTab === "categories" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Menu Categories</h2>
                <p className="text-xs text-gray-500">Add or alter menu categories and align visual color indicators</p>
              </div>

              <button
                onClick={() => {
                  setActiveEditingId("new_cat");
                  setCatForm({ name: "", color: "#8b5cf6" });
                }}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </header>

            {activeEditingId === "new_cat" || (activeEditingId && activeEditingId.startsWith("cat-")) ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (activeEditingId === "new_cat") {
                    await onAddCategory(catForm);
                  } else if (activeEditingId) {
                    await onEditCategory(activeEditingId, catForm);
                  }
                  setActiveEditingId(null);
                }}
                className="bg-white p-6 rounded-2xl border border-purple-200 space-y-4 shadow"
              >
                <h3 className="font-display font-black text-xs uppercase text-purple-900 tracking-wider">
                  {activeEditingId === "new_cat" ? "Create Category" : "Edit Category group"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Color Picker Tag</label>
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        type="color"
                        value={catForm.color}
                        onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                        className="h-9 w-9 rounded-md border border-gray-200 cursor-pointer p-0 bg-transparent"
                      />
                      <span className="font-mono text-xs text-gray-500">{catForm.color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setActiveEditingId(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700">Save Category</button>
                </div>
              </form>
            ) : null}

            {/* List Categories */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-gray-100 flex justify-between items-center bg-gray-50/30">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-md" style={{ backgroundColor: c.color }} />
                    <span className="font-bold text-purple-950 text-xs">{c.name}</span>
                  </div>

                  <div className="space-x-1">
                    <button
                      onClick={() => {
                        setActiveEditingId(c.id);
                        setCatForm({ name: c.name, color: c.color });
                      }}
                      className="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete category ${c.name}? All linked items will untag.`)) {
                          await onDeleteCategory(c.id);
                        }
                      }}
                      className="p-1.5 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================
            TAB: FLOOR / TABLES
            ==================================== */}
        {activeTab === "floors" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Cafe Floors</h2>
                <p className="text-xs text-gray-500">Draft or delete branches or floor locations of table layouts</p>
              </div>

              <button
                onClick={() => {
                  setActiveEditingId("new_floor");
                  setFloorForm({ name: "" });
                }}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Floor Location
              </button>
            </header>

            {activeEditingId === "new_floor" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAddFloor(floorForm);
                  setActiveEditingId(null);
                }}
                className="bg-white p-5 rounded-xl border border-purple-200 space-y-3 shadow"
              >
                <label className="text-[10px] font-bold text-gray-400 uppercase">Floor name *</label>
                <input
                  type="text"
                  required
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({ name: e.target.value })}
                  placeholder="e.g. Garden Terrace"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                />
                <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700">Save Floor</button>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              {floors.map((f) => (
                <div key={f.id} className="p-3 rounded-lg border border-gray-50 flex justify-between items-center bg-gray-50/20">
                  <span className="font-bold text-xs text-gray-800">{f.name}</span>
                  <button onClick={() => onDeleteFloor(f.id)} className="p-1 rounded hover:bg-rose-50 text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================
            TAB: TABLES CRUD
            ==================================== */}
        {activeTab === "tables" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Dining Tables Setup</h2>
                <p className="text-xs text-gray-500">Configure layout tables numbers, seats capacity and active state</p>
              </div>

              <button
                onClick={() => {
                  setActiveEditingId("new_tbl");
                  setTableForm({ tableNumber: "", seats: 4, floorId: floors[0]?.id || "", active: true, status: "available" });
                }}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Dining Table
              </button>
            </header>

            {activeEditingId === "new_tbl" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAddTable(tableForm);
                  setActiveEditingId(null);
                }}
                className="bg-white p-6 rounded-2xl border border-purple-200 space-y-4 shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Table Number Label *</label>
                    <input
                      type="text"
                      required
                      value={tableForm.tableNumber}
                      onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                      placeholder="e.g. G-5"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Seats Count Capacity *</label>
                    <input
                      type="number"
                      required
                      value={tableForm.seats}
                      onChange={(e) => setTableForm({ ...tableForm, seats: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Linked Floor Location *</label>
                    <select
                      value={tableForm.floorId}
                      onChange={(e) => setTableForm({ ...tableForm, floorId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-600"
                    >
                      {floors.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveEditingId(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-65">Cancel</button>
                  <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700">Save Table</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-2 gap-4 sm:grid-cols-4 whitespace-nowrap">
              {tables.map((tbl) => {
                const fName = floors.find((f) => f.id === tbl.floorId)?.name || "Mezzanine Loft";
                return (
                  <div key={tbl.id} className="p-4 rounded-xl border border-gray-100 flex flex-col justify-between bg-gray-50/10">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm font-bold text-gray-800">{tbl.tableNumber}</span>
                      <span className="text-[10px] text-gray-400">{tbl.seats} seats</span>
                    </div>
                    <span className="text-[10px] text-purple-600 truncate mt-2">{fName}</span>
                    <button
                      onClick={async () => {
                        if (confirm("Delete this dining table selection?")) {
                          await onDeleteTable(tbl.id);
                        }
                      }}
                      className="mt-4 text-[10px] font-bold text-rose-600 hover:text-rose-700 inline-block text-left"
                    >
                      Dismiss Table
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================
            TAB: EMPLOYEES CRUD
            ==================================== */}
        {activeTab === "employees" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Active Employees</h2>
                <p className="text-xs text-gray-500">Manage cashier credentials, update passwords or archive rosters</p>
              </div>

              <button
                onClick={() => {
                  setActiveEditingId("new_emp");
                  setEmpForm({ name: "", email: "", password: "", role: "cashier" as any, status: "active" as any });
                }}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </button>
            </header>

            {activeEditingId === "new_emp" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAddEmployee(empForm);
                  setActiveEditingId(null);
                }}
                className="bg-white p-6 rounded-2xl border border-purple-200 space-y-4 shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Employee Name *</label>
                    <input
                      type="text"
                      required
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      placeholder="Sarah Lane"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Sign-in Email Link *</label>
                    <input
                      type="email"
                      required
                      value={empForm.email}
                      onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                      placeholder="cashier@cafepos.com"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Authentication Password *</label>
                    <input
                      type="password"
                      required
                      value={empForm.password}
                      onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                      placeholder="Min 6 characters..."
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Pos System Role *</label>
                    <select
                      value={empForm.role}
                      onChange={(e) => setEmpForm({ ...empForm, role: e.target.value as any })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-600 focus:border-purple-500"
                    >
                      <option value="cashier">Cashier</option>
                      <option value="kitchen">Kitchen Staff</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setActiveEditingId(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-65">Cancel</button>
                  <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700">Save Employee</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 rounded-xl border border-gray-100 flex justify-between items-center bg-gray-50/10">
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">{emp.name}</span>
                    <span className="text-[9px] font-mono text-gray-400 uppercase">{emp.role} • {emp.email}</span>
                  </div>

                  <div className="space-x-1">
                    <button
                      onClick={() => {
                        const nextPass = prompt(`Set new password for ${emp.name}:`);
                        if (nextPass) {
                          onEditEmployee(emp.id, { password: nextPass })
                            .then(() => alert("Password modified successfully."))
                            .catch(e => alert(e));
                        }
                      }}
                      className="px-2 py-1 bg-white border border-gray-200 hover:bg-purple-50 text-[10px] font-bold text-purple-700 rounded-lg"
                    >
                      Set Pass
                    </button>
                    {emp.status === "active" ? (
                      <button
                        onClick={async () => {
                          await onEditEmployee(emp.id, { status: "archived" });
                        }}
                        className="p-1 px-2.5 rounded text-xs font-semibold hover:bg-amber-50 text-amber-600"
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await onEditEmployee(emp.id, { status: "active" });
                        }}
                        className="p-1 px-2.5 rounded text-xs font-semibold hover:bg-green-50 text-green-600"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (confirm(`Absolutely delete and wipe ${emp.name}?`)) {
                          await onDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-1 px-1.5 rounded hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================
            TAB: COUPONS
            ==================================== */}
        {activeTab === "coupons" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Voucher Coupons</h2>
                <p className="text-xs text-gray-500">Edit fixed deduction or percentage cart Coupons</p>
              </div>

              <button
                onClick={() => {
                  setActiveEditingId("new_cp");
                  setCouponForm({ code: "", discountType: "fixed", discountValue: 100, active: true });
                }}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Coupon Code
              </button>
            </header>

            {activeEditingId === "new_cp" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAddCoupon(couponForm);
                  setActiveEditingId(null);
                }}
                className="bg-white p-6 rounded-2xl border border-purple-200 space-y-4 shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Coupon Code Label *</label>
                    <input
                      type="text"
                      required
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SPECIAL30"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500 uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Discount Type *</label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-600"
                    >
                      <option value="fixed">Fixed Flat Deduction (₹)</option>
                      <option value="percentage">Percentage Off (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Discount Value *</label>
                    <input
                      type="number"
                      required
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700">Save Coupon</button>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              {coupons.map((cp) => (
                <div key={cp.id} className="p-4 rounded-xl border border-gray-50 flex justify-between items-center bg-gray-50/10">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-purple-950 tracking-wider block p-0.5 bg-purple-100/50 rounded max-w-[130px] text-center">{cp.code}</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Value: {cp.discountType === "fixed" ? `₹${cp.discountValue}` : `${cp.discountValue}%`} off entire bill
                    </span>
                  </div>
                  <button onClick={() => onDeleteCoupon(cp.id)} className="p-1 rounded text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================
            TAB: PROMOTIONS Setup (CRUD)
            ==================================== */}
        {activeTab === "promotions" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Automated Promotion Rules</h2>
                <p className="text-xs text-gray-500">Auto-applied discount parameters, basket multipliers</p>
              </div>

              <button
                onClick={() => {
                  setActiveEditingId("new_pm");
                  setPromoForm({ promotionType: "order_discount", minimumQuantity: 3, minimumOrderAmount: 1000, discountType: "fixed", discountValue: 100, active: true, description: "" });
                }}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Promotion Rule
              </button>
            </header>

            {activeEditingId === "new_pm" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAddPromotion(promoForm);
                  setActiveEditingId(null);
                }}
                className="bg-white p-6 rounded-2xl border border-purple-200 space-y-4 shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Promotion trigger type</label>
                    <select
                      value={promoForm.promotionType}
                      onChange={(e) => setPromoForm({ ...promoForm, promotionType: e.target.value as any })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-65"
                    >
                      <option value="buy_x_get_y">Buy Multi-Quantity (X matching items)</option>
                      <option value="order_discount">Cart totals Above Minimum threshold</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Trigger Threshold Value (qty or sum amount)</label>
                    <input
                      type="number"
                      required
                      value={promoForm.promotionType === "buy_x_get_y" ? (promoForm.minimumQuantity || 3) : (promoForm.minimumOrderAmount || 1000)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (promoForm.promotionType === "buy_x_get_y") {
                          setPromoForm({ ...promoForm, minimumQuantity: val });
                        } else {
                          setPromoForm({ ...promoForm, minimumOrderAmount: val });
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Applied Discount Type</label>
                    <select
                      value={promoForm.discountType}
                      onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value as any })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-65"
                    >
                      <option value="fixed">Fixed flat off (₹)</option>
                      <option value="percentage">percentage discount (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Discount Deduction Amount / Rate</label>
                    <input
                      type="number"
                      required
                      value={promoForm.discountValue}
                      onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Rule Description info *</label>
                  <input
                    type="text"
                    required
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                    placeholder="Buy 3 Specialty Espresso get 10% Off automatically"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500"
                  />
                </div>

                <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700">Save promotion Auto-Rule</button>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              {promotions.map((pm) => (
                <div key={pm.id} className="p-4 rounded-xl border border-gray-50 flex justify-between items-center bg-gray-50/10">
                  <div>
                    <h5 className="font-bold text-xs text-purple-900">{pm.description}</h5>
                    <p className="text-[9px] text-gray-400 mt-1 uppercase font-mono">
                      Type: {pm.promotionType} • Value: {pm.discountType === "fixed" ? `₹${pm.discountValue}` : `${pm.discountValue}%`}
                    </p>
                  </div>
                  <button onClick={() => onDeletePromotion(pm.id)} className="p-1 rounded text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================
            TAB: PAYMENT SETTINGS (CRUD)
            ==================================== */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-fade-in">
            <header>
              <h2 className="font-display text-2xl font-black text-gray-950">Payment Integrations</h2>
              <p className="text-xs text-gray-500">Configure customer payment channels, gateway active parameters</p>
            </header>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdatePaymentSettings(paySettingsForm);
                alert("Payment gateway configurations updated successfully.");
              }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4"
            >
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={paySettingsForm.cashEnabled}
                    onChange={(e) => setPaySettingsForm({ ...paySettingsForm, cashEnabled: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  Enable Cash Drawer Payment method
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={paySettingsForm.cardEnabled}
                    onChange={(e) => setPaySettingsForm({ ...paySettingsForm, cardEnabled: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  Enable Credit Card Swipe payment gateway
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={paySettingsForm.upiEnabled}
                    onChange={(e) => setPaySettingsForm({ ...paySettingsForm, upiEnabled: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  Enable UPI dynamic terminal QR code payments
                </label>
              </div>

              {paySettingsForm.upiEnabled && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">UPI VPA Merchant account Address *</label>
                  <input
                    type="text"
                    required
                    value={paySettingsForm.upiVpa}
                    onChange={(e) => setPaySettingsForm({ ...paySettingsForm, upiVpa: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold tracking-wide text-gray-800 outline-none focus:border-purple-500"
                    placeholder="e.g. Cafe POS@ybl"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Merchant sandbox dynamic amount routing is bounded to this address.</p>
                </div>
              )}

              <button type="submit" className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition">
                Update Payment Gateways
              </button>
            </form>
          </div>
        )}

        {/* ====================================
            TAB: REPORTS MODULE (PDF / XLS EXPORT)
            ==================================== */}
        {activeTab === "reports" && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="font-display text-2xl font-black text-gray-950">Operational Reports</h2>
                <p className="text-xs text-gray-500">Audit sales records, download tax spreadsheets in one-click</p>
              </div>

              <div className="flex gap-2">
                <button
                  id="btn-export-reports-xls"
                  onClick={handleExportXLS}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  Excel Export (.csv)
                </button>

                <button
                  id="btn-print-reports-pdf"
                  onClick={handlePrintPDF}
                  className="rounded-xl bg-purple-65 bg-purple-600 hover:bg-purple-700 px-4 py-3 text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  Generate audit PDF
                </button>
              </div>
            </header>

            {/* Selection filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-gray-100">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Day Period Filter</label>
                <select
                  value={reportRange}
                  onChange={(e) => setReportRange(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-65"
                >
                  <option value="today">Today's transactions</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past 30 days</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cashier</label>
                <select
                  value={reportEmployee}
                  onChange={(e) => setReportEmployee(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-65"
                >
                  <option value="all">All employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Target Audit Food item</label>
                <select
                  value={reportProduct}
                  onChange={(e) => setReportProduct(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none text-gray-65"
                >
                  <option value="all">All menu items</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audit Table Feed */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden">
              <span className="text-xs font-bold text-gray-45 uppercase tracking-wider block mb-4">Wiped/Paid Transactions Log</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold pb-2">
                      <th className="py-2.5">Order link</th>
                      <th>Time / Date</th>
                      <th>Server Agent</th>
                      <th>Subtotal Sum</th>
                      <th>Deduction</th>
                      <th>CGST+SGST Sum</th>
                      <th>Total paid</th>
                      <th>Gate Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidOrders.map((o) => {
                      const empName = employees.find((e) => e.id === o.employeeId)?.name || "Walk-in Cashier";
                      return (
                        <tr key={o.id} className="border-b border-gray-50 text-gray-700 hover:bg-gray-50/20">
                          <td className="py-3 font-mono font-bold text-purple-950">{o.orderNumber}</td>
                          <td>{o.createdAt.replace("T", " ").substring(0, 16)}</td>
                          <td>{empName}</td>
                          <td className="font-mono">₹{o.subtotal.toFixed(2)}</td>
                          <td className={o.discount > 0 ? "text-rose-600 font-semibold" : ""}>-₹{o.discount.toFixed(2)}</td>
                          <td className="font-mono">₹{o.tax.toFixed(2)}</td>
                          <td className="font-bold text-purple-700">₹{o.total.toFixed(2)}</td>
                          <td><span className="rounded bg-purple-50 px-1.5 py-0.5 text-[9px] uppercase font-bold text-purple-700">{o.paymentMethod || "UPI"}</span></td>
                        </tr>
                      );
                    })}

                    {paidOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400">Zero matches filtered currently.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================
            TAB: SETTINGS (BONUS Hackathon features configs)
            ==================================== */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            <header>
              <h2 className="font-display text-2xl font-black text-gray-950">System Configurations</h2>
              <p className="text-xs text-gray-500">Configure global POS branch details, loyalty point configurations</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Branch Multi-selector */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-purple-600" />
                    <span className="font-bold text-xs text-gray-800">Multi-Branch Sync</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={multiBranchEnabled}
                    onChange={(e) => setMultiBranchEnabled(e.target.checked)}
                    className="rounded text-purple-65"
                  />
                </div>
                <p className="text-[11px] text-gray-500">Sync catalogs, active tables, and kitchen queues across multiple branch devices concurrently.</p>
              </div>

              {/* Loyalty cards program points settings */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <span className="font-bold text-xs text-gray-800">Loyalty Rewards Points</span>
                </div>
                <p className="text-[11px] text-gray-500">Increase or decrease points reward coefficients multiplier per rupees checked out.</p>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Multiplier:</span>
                  <input
                    type="number"
                    value={loyaltyMultiplier}
                    onChange={(e) => setLoyaltyMultiplier(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-mono font-bold w-20 outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-purple-600 font-semibold">x point rewards</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
