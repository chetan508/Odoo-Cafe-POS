import React, { useState, useEffect } from "react";
import { Product, Category, Customer, Table, Session, Order, Coupon, Promotion } from "../types";
import { Search, ShoppingBag, Send, User, ChevronRight, Check, X, RotateCcw, AlertTriangle, QrCode, CreditCard, DollarSign, Plus, Minus, Trash2, ArrowLeft, Mic, Keyboard, Gift, Info } from "lucide-react";

interface PosTerminalProps {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  tables: Table[];
  coupons: Coupon[];
  promotions: Promotion[];
  currentSession: Session | null;
  onOpenSession: (balance: number) => void;
  onCloseSession: (amount: number) => void;
  onSubmitOrder: (order: Partial<Order>) => Promise<Order>;
  onPayOrder: (orderId: string, paymentMethod: 'cash' | 'card' | 'upi') => Promise<Order>;
  onTableStatusChange: (tableId: string, status: 'available' | 'occupied' | 'reserved') => void;
  onAddCustomer: (customer: { name: string; email: string; phone: string }) => Promise<Customer>;
  onTriggerReceipt: (order: Order) => void;
}

export default function PosTerminal({
  products,
  categories,
  customers,
  tables,
  coupons,
  promotions,
  currentSession,
  onOpenSession,
  onCloseSession,
  onSubmitOrder,
  onPayOrder,
  onTableStatusChange,
  onAddCustomer,
  onTriggerReceipt,
}: PosTerminalProps) {
  // Navigation & Sub-Selection States
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Cart Items State
  const [cart, setCart] = useState<{ product: Product; quantity: number; notes: string }[]>([]);
  const [customOrderNotes, setCustomOrderNotes] = useState<string>("");

  // Session Opening Balance State
  const [openBalanceInput, setOpenBalanceInput] = useState<string>("5000");
  const [closeBalanceInput, setCloseBalanceInput] = useState<string>("7200");

  // Coupon State
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState<string>("");
  const [couponError, setCouponError] = useState<string>("");

  // Modals & Popups States
  const [showTablePopup, setShowTablePopup] = useState<boolean>(true);
  const [showCustomerPopup, setShowCustomerPopup] = useState<boolean>(false);
  const [showCouponModal, setShowCouponModal] = useState<boolean>(false);
  const [selectedFloorId, setSelectedFloorId] = useState<string>("floor-1");

  // Voice State
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceQueryInput, setVoiceQueryInput] = useState<string>("");

  // Checkout Payment Panel States
  const [onPaymentScreen, setOnPaymentScreen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | null>(null);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [cardTxRef, setCardTxRef] = useState<string>("");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Customer Creator Form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Helper variables
  const activeFloorTables = tables.filter((t) => t.floorId === selectedFloorId);
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate Subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // AUTOMATIC PROMOTION ALGORITHM
  // 1. Discount for matching Specialty Coffee items (categoryId = "cat-1") if >= 3 coffee ordered
  let buy3CoffeePromoDiscount = 0;
  const coffeePromo = promotions.find((p) => p.promotionType === "buy_x_get_y" && p.active);
  if (coffeePromo) {
    const coffeeQuantity = cart
      .filter((itm) => itm.product.categoryId === "cat-1")
      .reduce((sum, itm) => sum + itm.quantity, 0);
    if (coffeeQuantity >= (coffeePromo.minimumQuantity || 3)) {
      const coffeeSubtotal = cart
        .filter((itm) => itm.product.categoryId === "cat-1")
        .reduce((sum, itm) => sum + itm.product.price * itm.quantity, 0);
      buy3CoffeePromoDiscount = coffeeSubtotal * (coffeePromo.discountValue / 100);
    }
  }

  // 2. Order discount: ₹100 flat off if order total is above ₹1000
  let orderDiscountAmount = 0;
  const orderPromo = promotions.find((p) => p.promotionType === "order_discount" && p.active);
  if (orderPromo) {
    const baselineSum = subtotal - buy3CoffeePromoDiscount;
    if (baselineSum >= (orderPromo.minimumOrderAmount || 1000)) {
      if (orderPromo.discountType === "fixed") {
        orderDiscountAmount = orderPromo.discountValue;
      } else {
        orderDiscountAmount = baselineSum * (orderPromo.discountValue / 100);
      }
    }
  }

  // Combine automatic promotions
  const autoPromoDiscount = buy3CoffeePromoDiscount + orderDiscountAmount;

  // 3. Coupon manual discounts on top of baseline
  let couponDiscount = 0;
  if (appliedCoupon) {
    const baselineSum = Math.max(0, subtotal - autoPromoDiscount);
    if (appliedCoupon.discountType === "fixed") {
      couponDiscount = appliedCoupon.discountValue;
    } else {
      couponDiscount = baselineSum * (appliedCoupon.discountValue / 100);
    }
  }

  const totalDiscount = autoPromoDiscount + couponDiscount;

  // TAX SUM (CGST + SGST) based on individual product line taxes
  const totalTax = cart.reduce((sum, item) => {
    const lineSubtotal = item.product.price * item.quantity;
    const proportion = item.product.price / (subtotal || 1);
    const lineDiscount = totalDiscount * proportion;
    // Apply tax rate onto discounted row total
    const rowTaxable = Math.max(0, lineSubtotal - lineDiscount);
    return sum + (item.product.tax / 100) * rowTaxable;
  }, 0);

  const finalTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  // Cart operations
  const addToCart = (product: Product) => {
    const existing = cart.find((itm) => itm.product.id === product.id);
    if (existing) {
      setCart(cart.map((itm) => itm.product.id === product.id ? { ...itm, quantity: itm.quantity + 1 } : itm));
    } else {
      setCart([...cart, { product, quantity: 1, notes: "" }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((itm) => {
          if (itm.product.id === productId) {
            const nextQty = itm.quantity + delta;
            return { ...itm, quantity: nextQty };
          }
          return itm;
        })
        .filter((itm) => itm.quantity > 0)
    );
  };

  const removeCartRow = (productId: string) => {
    setCart(cart.filter((itm) => itm.product.id !== productId));
  };

  const handleApplyCoupon = () => {
    const match = coupons.find((c) => c.code.toLowerCase() === couponInput.trim().toLowerCase());
    if (!match) {
      setCouponError("Invalid coupon promotional code, try WELCOME100!");
      return;
    }
    if (!match.active) {
      setCouponError("This promotional is inactive or expired.");
      return;
    }
    setAppliedCoupon(match);
    setCouponError("");
    setShowCouponModal(false);
  };

  // Simulated Voice order taking using local transcript parsing (via our server API!)
  const handleSimulateVoiceCommand = async (text: string) => {
    setIsListeningVoice(true);
    setVoiceQueryInput(text);
    
    try {
      const response = await fetch("/api/ai/voice-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("cafeflow_token")}`,
        },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await response.json();
      if (data.success && data.matchedItems?.length > 0) {
        // Clear cart or add item
        const newCartItems = [...cart];
        data.matchedItems.forEach((itm: any) => {
          const product = products.find((p) => p.id === itm.productId);
          if (product) {
            const existing = newCartItems.find((ci) => ci.product.id === product.id);
            if (existing) {
              existing.quantity += itm.quantity;
            } else {
              newCartItems.push({ product, quantity: itm.quantity, notes: itm.notes || "" });
            }
          }
        });
        setCart(newCartItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsListeningVoice(false);
    }
  };

  const handleSendToKitchenAndDraftOrder = async () => {
    if (cart.length === 0) return;
    
    const draftPayload = {
      tableId: selectedTable?.id,
      customerId: selectedCustomer?.id,
      items: cart.map((itm) => ({
        productId: itm.product.id,
        productName: itm.product.name,
        quantity: itm.quantity,
        price: itm.product.price,
        tax: itm.product.tax,
        discount: 0,
        lineTotal: itm.product.price * itm.quantity,
        isKitchenItem: itm.product.isKitchenItem,
        notes: itm.notes,
      })),
      subtotal,
      tax: totalTax,
      discount: totalDiscount,
      total: finalTotal,
      notes: customOrderNotes,
    };

    try {
      const order = await onSubmitOrder(draftPayload);
      setActiveOrder(order);
      setOnPaymentScreen(true);
    } catch (e) {
      alert("Submission error " + e);
    }
  };

  // Submit complete payment
  const handleConfirmCheckout = async () => {
    if (!activeOrder || !paymentMethod) return;

    try {
      const paidOrder = await onPayOrder(activeOrder.id, paymentMethod);
      onTriggerReceipt(paidOrder);
      
      // Reset POS States after receipt trigger
      setCart([]);
      setSelectedTable(null);
      setSelectedCustomer(null);
      setAppliedCoupon(null);
      setCouponInput("");
      setCustomOrderNotes("");
      setOnPaymentScreen(false);
      setPaymentMethod(null);
      setActiveOrder(null);
      setCashReceived("");
      setCardTxRef("");
      setShowTablePopup(true); // Return back to floor plan
    } catch (e) {
      alert("Payment processing failure. Check session state.");
    }
  };

  // Customer quick-manager
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return;
    try {
      const cust = await onAddCustomer({ name: customerName, email: customerEmail, phone: customerPhone });
      setSelectedCustomer(cust);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setShowCustomerPopup(false);
    } catch (e) {
      alert(e);
    }
  };

  // Dynamic UPI Code url inside the POS Checkout panel
  const upiVpaStr = "cafeflow@ybl";
  const finalPaidStr = finalTotal.toFixed(2);
  const upirefe = `upi://pay?pa=${upiVpaStr}&pn=CafeFlow%20POS&am=${finalPaidStr}&cu=INR&tn=CFOrder`;
  const checkoutQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(upirefe)}`;

  // Active terminal checks
  if (!currentSession) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#FAF7F2] min-h-[85vh]">
        <div className="max-w-md bg-[#FFFFFF] p-8 rounded-[2rem] shadow-[0_24px_70px_rgba(111,78,55,0.1)] border border-[#E6DDD2] flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-[#F5EFE6] flex items-center justify-center mb-6 text-[#6F4E37]">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-black text-[#3E2723]">POS Register Closed</h2>
          <p className="mt-2 text-sm text-[#6B5B4D] leading-relaxed">You must initialize the POS cash drawer registry with a starting float balance before executing sales operations.</p>
          
          <div className="mt-6 w-full text-left font-sans">
            <label className="text-xs font-bold text-[#6F4E37] uppercase tracking-wider">Opening Float Balance (₹)</label>
            <input
              type="number"
              value={openBalanceInput}
              onChange={(e) => setOpenBalanceInput(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#E6DDD2] bg-[#FAF7F2] px-4 py-3 text-lg font-bold text-[#3E2723] focus:border-[#6F4E37] focus:ring-4 focus:ring-[#C8A96B]/20 outline-none transition"
              placeholder="5000"
            />
          </div>

          <button
            onClick={() => onOpenSession(Number(openBalanceInput))}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] px-6 py-3.5 text-sm font-black text-white hover:scale-[1.015] hover:shadow-[#6F4E37]/35 shadow-[#6F4E37]/20 shadow-lg transition duration-200 cursor-pointer"
          >
            Start Register Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#FAF7F2] font-sans lg:flex-row h-[89vh]">
      
      {/* 1. FLOOR PLAN POPUP SELECTOR COVER */}
      {showTablePopup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-[0_32px_90px_rgba(62,39,35,0.18)] border border-[#E6DDD2] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E6DDD2] pb-4">
              <div>
                <h3 className="font-display text-xl font-black text-[#3E2723]">Floor Layout & Table Selection</h3>
                <p className="text-xs text-[#6F4E37] font-medium">Select an active customer table to open or modify an order ticket</p>
              </div>
              <button
                onClick={() => {
                  if (selectedTable) setShowTablePopup(false);
                  else alert("You must choose a dining table to resume.");
                }}
                className="rounded-xl p-2 text-[#6F4E37] hover:bg-[#F5EFE6] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Floors Tab row */}
            <div className="flex gap-2 border-b border-[#E6DDD2] py-3 scrollbar-none overflow-x-auto">
              {tables.reduce((acc: string[], t) => {
                if (!acc.includes(t.floorId)) acc.push(t.floorId);
                return acc;
              }, []).map((floorId) => {
                const isSelected = selectedFloorId === floorId;
                const name = floorId === "floor-1" ? "Ground floor" : floorId === "floor-2" ? "Mezzanine Lounge" : "Garden Terrace";
                return (
                  <button
                    key={floorId}
                    onClick={() => setSelectedFloorId(floorId)}
                    className={`rounded-full px-4 py-2 text-xs font-black whitespace-nowrap border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#6F4E37] text-white border-[#6F4E37]"
                        : "bg-[#F5EFE6] text-[#6F4E37] border-[#E6DDD2] hover:bg-[#EFE3D3]"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Table layout cards Grid */}
            <div className="grid flex-1 grid-cols-2 gap-4 py-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto min-h-[300px]">
              {activeFloorTables.map((t) => {
                const isSelected = selectedTable?.id === t.id;
                
                let cardStyle = "bg-[#F5EFE6] border-[#E6DDD2] text-[#6F4E37]"; // default cream card
                
                if (isSelected) {
                  cardStyle = "bg-[#6F4E37] text-white border-[#6F4E37]";
                } else if (t.status === "occupied") {
                  cardStyle = "bg-[#FFF9EB] border-[#C8A96B] text-[#3E2723] shadow-sm"; // soft gold occupied card
                } else if (t.status === "reserved") {
                  cardStyle = "bg-[#EADBC8] border-[#E6DDD2] text-[#6F4E37]"; // reserved cream card style
                }

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTable(t);
                      setShowTablePopup(false);
                    }}
                    className={`flex flex-col justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${cardStyle}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold">{t.tableNumber}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        isSelected ? "bg-white" :
                        t.status === "occupied" ? "bg-[#C8A96B]" : t.status === "reserved" ? "bg-[#6F4E37]" : "bg-green-600"
                      }`} />
                    </div>
                    <div className="mt-4 flex items-baseline gap-1 text-[11px] font-bold opacity-90">
                      <span>{t.seats} seats</span>
                      <span className="capitalize">• {t.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#E6DDD2] pt-4 flex justify-between items-center text-xs text-[#6F4E37] font-semibold">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-600" /> Available</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#C8A96B]" /> Occupied</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#6F4E37]" /> Reserved</span>
              </div>
              <button
                onClick={() => {
                  setSelectedTable({ id: "", tableNumber: "Takeout", seats: 1, floorId: "", active: true, status: "available" });
                  setShowTablePopup(false);
                }}
                className="font-black text-[#6F4E37] hover:text-[#3E2723] transition cursor-pointer"
              >
                Proceed as Takeout / Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CUSTOMER ASSIGN POPUP */}
      {showCustomerPopup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-[0_32px_90px_rgba(62,39,35,0.18)] border border-[#E6DDD2] overflow-hidden max-h-[85vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E6DDD2] pb-3">
              <h3 className="font-display text-lg font-black text-[#3E2723]">Assign Customer</h3>
              <button onClick={() => setShowCustomerPopup(false)} className="rounded-xl p-2 text-[#6F4E37] hover:bg-[#F5EFE6] transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 flex-1 overflow-hidden">
              {/* Left Column: Search & List */}
              <div className="flex flex-col overflow-hidden">
                <div className="relative">
                  <Search className="absolute top-3.5 left-3.5 h-4 w-4 text-[#6F4E37]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name or phone..."
                    className="w-full rounded-2xl border border-[#E6DDD2] bg-[#FAF7F2] pl-10 pr-4 py-2.5 text-xs outline-none text-[#2B2B2B] focus:border-[#6F4E37] focus:bg-white focus:ring-4 focus:ring-[#C8A96B]/20 transition"
                  />
                </div>

                <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
                  {customers
                    .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerPopup(false);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all duration-200 ${
                          selectedCustomer?.id === c.id
                            ? "bg-[#F5EFE6] border-[#6F4E37] text-[#3E2723] shadow-xs"
                            : "bg-white border-[#E6DDD2] hover:bg-[#FAF7F2] hover:border-[#C8A96B]"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black text-[#3E2723]">{c.name}</p>
                          <p className="text-[10px] text-[#6F4E37] font-medium mt-0.5">{c.phone || "No Phone"} • {c.email || "No Email"}</p>
                        </div>
                        {selectedCustomer?.id === c.id && <Check className="h-4 w-4 text-[#6F4E37]" />}
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Quick Add Customer form */}
              <form onSubmit={handleQuickAddCustomer} className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E6DDD2] flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#3E2723] uppercase tracking-wider">Quick Create</h4>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#6F4E37] uppercase">Customer Name *</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="mt-1 w-full rounded-xl border border-[#E6DDD2] bg-white px-3 py-2 text-xs text-[#2B2B2B] outline-none focus:border-[#6F4E37] focus:ring-4 focus:ring-[#C8A96B]/20 transition"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#6F4E37] uppercase">Email Address</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#E6DDD2] bg-white px-3 py-2 text-xs text-[#2B2B2B] outline-none focus:border-[#6F4E37] focus:ring-4 focus:ring-[#C8A96B]/20 transition"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#6F4E37] uppercase">Phone Number</label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#E6DDD2] bg-white px-3 py-2 text-xs text-[#2B2B2B] outline-none focus:border-[#6F4E37] focus:ring-4 focus:ring-[#C8A96B]/20 transition"
                        placeholder="+91 99882..."
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] px-4 py-3 text-xs font-black text-white hover:scale-[1.015] hover:shadow-[#6F4E37]/35 shadow-[#6F4E37]/20 shadow-md transition duration-200 cursor-pointer"
                >
                  Create & Assign
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. COUPONS SELECTOR MODAL */}
      {showCouponModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_32px_90px_rgba(62,39,35,0.18)] border border-[#E6DDD2]">
            <h3 className="font-display font-black text-lg text-[#3E2723]">Add Promotion Coupon</h3>
            <p className="text-xs text-[#6F4E37] font-medium mt-1">Enter valid manual voucher code to deduct item sum balances</p>

            <div className="mt-4">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Voucher code (e.g. WELCOME100)"
                className="w-full rounded-2xl border border-[#E6DDD2] bg-[#FAF7F2] px-4 py-3 text-sm font-bold tracking-wider outline-none focus:border-[#6F4E37] uppercase text-center focus:bg-white text-[#3E2723]"
              />
              {couponError && <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{couponError}</p>}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowCouponModal(false)}
                className="flex-1 rounded-xl border border-[#E6DDD2] bg-[#FAF7F2] hover:bg-[#F5EFE6] py-3 text-xs font-black text-[#6F4E37] transition duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCoupon}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] py-3 text-xs font-black text-white hover:scale-[1.015] hover:shadow-[#6F4E37]/35 shadow-[#6F4E37]/20 shadow-md transition duration-200 cursor-pointer"
              >
                Apply Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THREE LAYOUT COLUMS OVERALL CONTAINER */}
      
      {/* COLUMN 1: LEFT SIDE CATALOG PANE */}
      <div className={`flex flex-col flex-1 border-r border-[#E6DDD2] overflow-hidden ${onPaymentScreen ? "hidden md:flex" : "flex"}`}>
        {/* Catalog Control Panels (Search + Category scrolling) */}
        <div className="bg-white p-4 border-b border-[#E6DDD2] flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-3.5 left-3.5 h-4 w-4 text-[#6F4E37]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food item, beverages, specialty espresso..."
                className="w-full rounded-2xl border border-[#E6DDD2] bg-[#FAF7F2] pl-10 pr-4 py-2.5 text-xs outline-none text-[#2B2B2B] focus:border-[#6F4E37] focus:bg-white focus:ring-4 focus:ring-[#C8A96B]/20 transition duration-200"
              />
            </div>

            {/* Simulated Voice Command Trigger Button */}
            <button
              onClick={() => handleSimulateVoiceCommand("Add three Iced Lavender Lattes and one Smashed Avocado Toast please")}
              className={`rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer ${
                isListeningVoice
                  ? "bg-[#FFF9EB] text-[#C8A96B] border-[#C8A96B] pulsing-ring"
                  : "bg-[#F5EFE6] border-[#E6DDD2] text-[#6F4E37] hover:bg-[#EFE3D3] hover:border-[#C8A96B]"
              }`}
              title="Simulate Voice Guided Order"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>

          {/* Scrolling Categories tabs */}
          <div className="flex gap-2 scrollbar-none overflow-x-auto py-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-xl px-4 py-2 text-xs font-black whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#6F4E37] text-white border-[#6F4E37] shadow-sm"
                  : "bg-[#F5EFE6] text-[#6F4E37] border-[#E6DDD2] hover:bg-[#EFE3D3]"
              }`}
            >
              All Catalog
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`rounded-xl px-4 py-2 text-xs font-black whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                  selectedCategory === c.id
                    ? "bg-[#6F4E37] text-white border-[#6F4E37] shadow-sm"
                    : "bg-[#F5EFE6] text-[#6F4E37] border-[#E6DDD2] hover:bg-[#EFE3D3]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Products card lists scrollable */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 min-h-[300px]">
          {filteredProducts.map((p) => {
            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="group relative flex flex-col rounded-2xl border border-[#E6DDD2] bg-white overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(111,78,55,0.12)] hover:border-[#C8A96B]"
              >
                <div className="relative aspect-square overflow-hidden bg-[#F5EFE6] h-40">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className="absolute top-2 left-2 flex h-5 items-center rounded-lg px-2 font-display text-[9px] font-black bg-[#FAF7F2] text-[#6F4E37] border border-[#E6DDD2] uppercase tracking-wider"
                  >
                    {p.unit}
                  </span>
                </div>

                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-xs font-bold text-[#3E2723] line-clamp-1">{p.name}</h4>
                    <p className="mt-1 text-[10px] text-[#6B5B4D] font-medium line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-[#E6DDD2] pt-2 text-right">
                    <span className="font-mono text-xs font-black text-[#6F4E37]">₹{p.price.toFixed(2)}</span>
                    <span className="text-[9px] font-bold text-[#C8A96B]">GST {p.tax}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMN 2: CENTER CART & CALCULATOR SCREEN */}
      <div className={`flex flex-col w-full border-r border-[#E6DDD2] bg-white ${onPaymentScreen ? "hidden" : "lg:w-96 md:flex"}`}>
        
        {/* Cart Header details */}
        <header className="px-4 py-3 bg-[#FAF7F2] border-b border-[#E6DDD2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xs font-black text-[#3E2723] uppercase tracking-wider">Active Ticket</h3>
            <span className="rounded-lg bg-[#F5EFE6] px-2 py-0.5 font-mono text-[10px] font-bold text-[#6F4E37] tracking-wide border border-[#E6DDD2]">
              {cart.reduce((sum, ci) => sum + ci.quantity, 0)} items
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowTablePopup(true)}
              className="rounded-xl border border-[#C8A96B]/30 bg-[#FFF9EB] px-2.5 py-1.5 text-[10px] font-bold text-[#6F4E37] hover:bg-[#FAF0DD] transition cursor-pointer"
            >
              Table: {selectedTable ? selectedTable.tableNumber : "Assign"}
            </button>

            <button
              onClick={() => setShowCustomerPopup(true)}
              className="rounded-xl border border-[#E6DDD2] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#6F4E37] hover:bg-[#FAF7F2] flex items-center gap-1 transition cursor-pointer"
            >
              <User className="h-3 w-3" />
              {selectedCustomer ? selectedCustomer.name.split(" ")[0] : "Walk-in"}
            </button>
          </div>
        </header>

        {/* Cart items list scrolling */}
        <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-[#E6DDD2] max-h-[350px]">
          {cart.map((itm, i) => (
            <div key={i} className="py-3 flex justify-between items-start">
              <div className="max-w-[60%]">
                <h5 className="text-xs font-bold text-[#3E2723] line-clamp-2">{itm.product.name}</h5>
                <p className="mt-0.5 font-mono text-[10px] text-[#6F4E37] font-semibold">₹{itm.product.price.toFixed(2)} x {itm.quantity}</p>
                
                <input
                  type="text"
                  value={itm.notes}
                  onChange={(e) => {
                    const updated = [...cart];
                    updated[i].notes = e.target.value;
                    setCart(updated);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-[#E6DDD2] bg-[#FAF7F2] px-2 py-1 text-[9px] font-mono outline-none text-[#2B2B2B] focus:border-[#6F4E37] focus:bg-white placeholder-gray-400"
                  placeholder="Special instructions..."
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-[#E6DDD2] bg-[#FAF7F2] overflow-hidden">
                  <button onClick={() => updateQuantity(itm.product.id, -1)} className="p-1 px-2 text-[#6F4E37] hover:bg-[#F5EFE6]">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-1.5 font-mono text-xs font-black text-[#3E2723]">{itm.quantity}</span>
                  <button onClick={() => updateQuantity(itm.product.id, 1)} className="p-1 px-2 text-[#6F4E37] hover:bg-[#F5EFE6]">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button onClick={() => removeCartRow(itm.product.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#6F4E37] border border-dashed border-[#E6DDD2] bg-[#FAF7F2] rounded-2xl m-2">
              <ShoppingBag className="h-8 w-8 text-[#C8A96B] mb-2" />
              <p className="text-xs">No catalog items selected. Tap left product cards to begin!</p>
            </div>
          )}
        </div>

        {/* Calculation summary + Checkout action button */}
        <div className="border-t border-[#E6DDD2] bg-[#FAF7F2] p-4 space-y-3 rounded-b-2xl shadow-[0_8px_30px_rgba(111,78,55,0.04)]">
          
          {/* Automatic Promotion descriptions inside the POS center column */}
          {autoPromoDiscount > 0 && (
            <div className="rounded-xl bg-[#F5EFE6] border border-[#E6DDD2] p-2.5 space-y-1">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#3E2723]">
                <Info className="h-3 w-3 text-[#C8A96B]" />
                Promotions Multi-Buy applied
              </span>
              {buy3CoffeePromoDiscount > 0 && (
                <p className="text-[10px] text-[#6F4E37] font-semibold">↳ 10% Coffee Multi-discount: -₹{buy3CoffeePromoDiscount.toFixed(2)}</p>
              )}
              {orderDiscountAmount > 0 && (
                <p className="text-[10px] text-[#6F4E37] font-semibold">↳ Flat ₹100 over ₹1000 cart: -₹{orderDiscountAmount.toFixed(2)}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5 text-xs text-[#6F4E37] font-semibold">
            <div className="flex justify-between">
              <span>Cart Subtotal:</span>
              <span className="font-mono text-[#3E2723]">₹{subtotal.toFixed(2)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span className="flex items-center gap-1">
                  Discount:
                  {appliedCoupon && <span className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5 text-[8px] font-black text-rose-700">{appliedCoupon.code}</span>}
                </span>
                <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>GST (CGST/SGST):</span>
              <span className="font-mono text-[#3E2723]">₹{totalTax.toFixed(2)}</span>
            </div>

            <div className="border-t border-[#E6DDD2] pt-2 flex justify-between text-base font-black text-[#3E2723]">
              <span>Total to Pay:</span>
              <span className="font-mono text-[#6F4E37] font-display">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowCouponModal(true)}
              className="rounded-xl border border-[#E6DDD2] bg-white p-3.5 text-xs text-[#6F4E37] hover:bg-[#FAF7F2] transition cursor-pointer"
              title="Apply Coupon Code"
            >
              <Gift className="h-4 w-4" />
            </button>

            <button
              id="btn-pos-order-kitchen"
              onClick={handleSendToKitchenAndDraftOrder}
              disabled={cart.length === 0}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] hover:scale-[1.015] hover:shadow-[#6F4E37]/35 shadow-[#6F4E37]/20 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition px-4 py-3.5 text-xs font-black text-white flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Send className="h-4 w-4" />
              Send Order To Kitchen & Pay
            </button>
          </div>
        </div>
      </div>

      {/* COLUMN 3: RIGHT PANEL PAYMENT METHODS CHECKOUT COVER */}
      {onPaymentScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[2rem] border border-[#E6DDD2] bg-white p-6 shadow-[0_32px_90px_rgba(62,39,35,0.18)] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[#E6DDD2] pb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setOnPaymentScreen(false)} className="rounded-xl p-2 text-[#6F4E37] hover:bg-[#F5EFE6] transition cursor-pointer">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="font-display text-base font-black text-[#3E2723]">Choose Payment Method</h3>
                  <p className="text-[11px] text-[#6F4E37] font-medium">Order ticket {activeOrder?.orderNumber}</p>
                </div>
              </div>
              <span className="font-mono text-lg font-black text-[#6F4E37]">₹{finalTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method grids buttons chooser */}
            <div className="grid grid-cols-3 gap-3 py-6">
              <button
                onClick={() => {
                  setPaymentMethod("cash");
                  setCashReceived("");
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                  paymentMethod === "cash"
                    ? "bg-[#F5EFE6] border-[#6F4E37] text-[#3E2723] shadow-md shadow-[#6F4E37]/10"
                    : "bg-white border-[#E6DDD2] text-[#6F4E37] hover:bg-[#FAF7F2] hover:border-[#C8A96B]"
                }`}
              >
                <DollarSign className="h-6 w-6 text-[#6F4E37]" />
                <span className="text-xs font-bold">Cash</span>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("card");
                  setCardTxRef("");
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                  paymentMethod === "card"
                    ? "bg-[#F5EFE6] border-[#6F4E37] text-[#3E2723] shadow-md shadow-[#6F4E37]/10"
                    : "bg-white border-[#E6DDD2] text-[#6F4E37] hover:bg-[#FAF7F2] hover:border-[#C8A96B]"
                }`}
              >
                <CreditCard className="h-6 w-6 text-[#6F4E37]" />
                <span className="text-xs font-bold">Credit/Debit</span>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("upi");
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                  paymentMethod === "upi"
                    ? "bg-[#F5EFE6] border-[#6F4E37] text-[#3E2723] shadow-md shadow-[#6F4E37]/10"
                    : "bg-white border-[#E6DDD2] text-[#6F4E37] hover:bg-[#FAF7F2] hover:border-[#C8A96B]"
                }`}
              >
                <QrCode className="h-6 w-6 text-[#6F4E37]" />
                <span className="text-xs font-bold">UPI QR</span>
              </button>
            </div>

            {/* Sub-panels based on payment method */}
            <div className="flex-1 py-4">
              {paymentMethod === "cash" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E6DDD2] bg-[#FAF7F2] p-4">
                    <span className="text-xs font-bold text-[#6F4E37] uppercase">Amount Received from Buyer</span>
                    <div className="relative mt-2">
                      <span className="absolute top-2.5 left-3.5 font-bold text-[#6F4E37] text-sm">₹</span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={finalTotal.toFixed(2)}
                        className="w-full rounded-xl border border-[#E6DDD2] bg-white pl-8 pr-4 py-3 text-lg font-bold text-[#3E2723] outline-none focus:border-[#6F4E37]"
                      />
                    </div>
                  </div>

                  {Number(cashReceived) >= finalTotal && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 transition-all">
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Change Calculation</span>
                      <p className="mt-1 font-mono text-2xl font-bold text-green-800">
                        ₹{(Number(cashReceived) - finalTotal).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="rounded-xl border border-[#E6DDD2] bg-[#FAF7F2] p-4 space-y-3">
                  <span className="text-xs font-bold text-[#6F4E37] uppercase">Transaction Reference Pin Number</span>
                  <input
                    type="text"
                    value={cardTxRef}
                    onChange={(e) => setCardTxRef(e.target.value)}
                    placeholder="e.g. TXN-993882772"
                    className="w-full rounded-xl border border-[#E6DDD2] bg-white px-4 py-3 text-sm font-semibold text-[#3E2723] outline-none focus:border-[#6F4E37]"
                  />
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="mt-2 flex flex-col items-center bg-[#FAF7F2] p-4 rounded-xl border border-dashed border-[#E6DDD2] tracking-wider">
                  <span className="text-[10px] font-bold text-[#6F4E37] uppercase tracking-wider">UPI Dynamic Code (Auto-generated)</span>
                  <p className="text-xs text-[#6F4E37] font-semibold mb-3">Pay exactly ₹{finalTotal.toFixed(2)}</p>
                  <div className="bg-white p-2.5 rounded-lg border border-[#E6DDD2] shadow-sm">
                    <img src={checkoutQrCode} alt="Terminal QR" className="h-[125px] w-[125px] object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <span className="mt-2 text-[9px] font-mono text-[#C8A96B] uppercase font-bold">Auto-Voucher active</span>
                </div>
              )}

              {paymentMethod === null && (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-[#E6DDD2] rounded-xl bg-[#FAF7F2] text-[#6F4E37] font-semibold">
                  <DollarSign className="h-8 w-8 mb-2 text-[#C8A96B]" />
                  <p className="text-xs">Choose payment mode from buttons above.</p>
                </div>
              )}
            </div>

            <div className="mt-auto space-y-3 pt-6 border-t border-[#E6DDD2]">
              <button
                onClick={handleConfirmCheckout}
                disabled={
                  !paymentMethod ||
                  (paymentMethod === "cash" && Number(cashReceived) < finalTotal && cashReceived !== "") ||
                  (paymentMethod === "card" && !cardTxRef)
                }
                className="w-full rounded-xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] hover:scale-[1.015] hover:shadow-[#6F4E37]/35 shadow-[#6F4E37]/20 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed py-4 text-xs font-black text-white transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Complete Transaction & Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
