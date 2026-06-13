import React, { useState, useEffect } from "react";
import { Order, Table, Category, Product } from "../types";
import { Clock, CheckSquare, Bell, Flame, ChevronRight, Check, Coffee } from "lucide-react";
import BrandLogo from "./common/BrandLogo";

interface KitchenDisplayProps {
  orders: Order[];
  tables: Table[];
  products: Product[];
  onCompleteItem: (orderId: string, productId: string) => void;
  onCompleteTicket: (orderId: string) => void;
  onDeleteTicket?: (orderId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function KitchenDisplay({
  orders,
  tables,
  products,
  onCompleteItem,
  onCompleteTicket,
  isLoading = false,
  error = null,
}: KitchenDisplayProps) {
  // Safe backups to ensure layout never crashes on non-array payloads
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeTables = Array.isArray(tables) ? tables : [];

  // Only kitchen items count in KDS
  const activeOrders = safeOrders.filter(
    (o) => o && o.status !== "cancelled" && Array.isArray(o.items) && o.items.some((i) => i && i.isKitchenItem)
  );

  // States to keep track of local ticket timings (Live Kitchen Timers!)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [completedTimes, setCompletedTimes] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("kds_completed_times");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setCompletedTimes((prev) => {
      const next = { ...prev };
      let changed = false;
      activeOrders.forEach(o => {
        if (getOrderStatusGroup(o) === "completed" && !next[o.id]) {
          next[o.id] = Date.now();
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("kds_completed_times", JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, [activeOrders]);

  // Filter orders into To Cook (Draft, or newly created with uncompleted kitchen items), Preparing, and Completed
  const getKitchenItems = (o: Order) => o && Array.isArray(o.items) ? o.items.filter((i) => i && i.isKitchenItem) : [];

  const getOrderStatusGroup = (o: Order): "to_cook" | "preparing" | "completed" | null => {
    if (!o) return null;
    const status = o.status;
    if (status === "To Cook" || status === "draft" || status === "to_cook") return "to_cook";
    if (status === "Preparing" || status === "preparing") return "preparing";
    if (status === "Completed" || status === "completed") return "completed";
    return null;
  };

  const getTableNumber = (tableId?: string) => {
    return safeTables.find((t) => t && t.id === tableId)?.tableNumber || "Takeout";
  };

  // Sound Alarm helper for new order flashes
  const triggerNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Sound frequency (A4)
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Ignored if browser blocks audio
    }
  };

  // Play audio upon receiving new ticket count
  useEffect(() => {
    if (activeOrders.length > 0) {
      triggerNotificationSound();
    }
  }, [activeOrders.length]);

  // KDS Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col bg-[#FAF7F2] text-[#2B2B2B] font-sans">

        <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF7F2] text-[#6F4E37]">
          <div className="text-center font-display space-y-4">
            <div className="flex items-center justify-center">
              <BrandLogo size="md" className="animate-spin" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] block">Loading kitchen orders...</span>
          </div>
        </div>
      </div>
    );
  }

  // KDS Error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col bg-[#FAF7F2] text-[#2B2B2B] font-sans">

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center bg-white border border-[#E6DDD2] rounded-2xl p-8 shadow-[0_8px_30px_rgba(111,78,55,0.06)]">
            <div className="h-14 w-14 bg-[#FFF9EB] border border-[#C8A96B]/30 rounded-full mx-auto flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-[#C8A96B]" />
            </div>
            <h3 className="font-display font-black text-lg text-[#3E2723] mb-2">Notice</h3>
            <p className="text-sm font-semibold text-[#6F4E37]">{error}</p>
            <p className="text-xs text-gray-400 mt-2">Please check database connectivity or contact system administration.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#FAF7F2] text-[#2B2B2B] font-sans">
      


      {/* KDS Body Columns (To Cook -> Preparing -> Completed) */}
      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-3">
        
        {/* Column 1: To Cook Tickets */}
        <div className="flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#E6DDD2] p-5 shadow-[0_8px_30px_rgba(111,78,55,0.06)] overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-black text-[#6F4E37] flex items-center gap-2">
              <span className="flex h-6 px-2.5 items-center justify-center rounded-lg bg-[#FFF3CD] text-xs font-black text-[#D4A017] uppercase tracking-wide">To Cook</span>
            </h2>
            <span className="rounded-full bg-[#F5EFE6] px-2.5 py-0.5 font-mono text-xs font-bold text-[#6F4E37] border border-[#E6DDD2]">
              {activeOrders.filter((o) => getOrderStatusGroup(o) === "to_cook").length} Tickets
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {activeOrders
              .filter((o) => getOrderStatusGroup(o) === "to_cook")
              .map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  currentTime={currentTime}
                  completedTime={completedTimes[order.id]}
                  getTableNumber={getTableNumber}
                  onCompleteItem={onCompleteItem}
                  onCompleteTicket={onCompleteTicket}
                />
              ))}

            {activeOrders.filter((o) => getOrderStatusGroup(o) === "to_cook").length === 0 && (
              <EmptyState message="All tickets are currently cooking." />
            )}
          </div>
        </div>

        {/* Column 2: Preparing Columns */}
        <div className="flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#E6DDD2] p-5 shadow-[0_8px_30px_rgba(111,78,55,0.06)] overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-black text-[#6F4E37] flex items-center gap-2">
              <span className="flex h-6 px-2.5 items-center justify-center rounded-lg bg-[#EADBC8] text-xs font-black text-[#6F4E37] uppercase tracking-wide">Preparing</span>
            </h2>
            <span className="rounded-full bg-[#F5EFE6] px-2.5 py-0.5 font-mono text-xs font-bold text-[#6F4E37] border border-[#E6DDD2]">
              {activeOrders.filter((o) => getOrderStatusGroup(o) === "preparing").length} Tickets
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {activeOrders
              .filter((o) => getOrderStatusGroup(o) === "preparing")
              .map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  currentTime={currentTime}
                  completedTime={completedTimes[order.id]}
                  getTableNumber={getTableNumber}
                  onCompleteItem={onCompleteItem}
                  onCompleteTicket={onCompleteTicket}
                />
              ))}

            {activeOrders.filter((o) => getOrderStatusGroup(o) === "preparing").length === 0 && (
              <EmptyState message="No tickets currently in active preparation status." />
            )}
          </div>
        </div>

        {/* Column 3: Completed Tickets */}
        <div className="flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#E6DDD2] p-5 shadow-[0_8px_30px_rgba(111,78,55,0.06)] overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-black text-[#2E7D32] flex items-center gap-2">
              <span className="flex h-6 px-2.5 items-center justify-center rounded-lg bg-[#DFF5E1] text-xs font-black text-[#2E7D32] uppercase tracking-wide font-display">Completed</span>
            </h2>
            <span className="rounded-full bg-[#F5EFE6] px-2.5 py-0.5 font-mono text-xs font-bold text-[#6F4E37] border border-[#E6DDD2]">
              {activeOrders.filter((o) => getOrderStatusGroup(o) === "completed").length} Tickets
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {activeOrders
              .filter((o) => getOrderStatusGroup(o) === "completed")
              .map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  currentTime={currentTime}
                  completedTime={completedTimes[order.id]}
                  getTableNumber={getTableNumber}
                  onCompleteItem={onCompleteItem}
                  onCompleteTicket={onCompleteTicket}
                  isCompletedView={true}
                />
              ))}

            {activeOrders.filter((o) => getOrderStatusGroup(o) === "completed").length === 0 && (
              <EmptyState message="No completed tickets in active work cycle." />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Inner helper component: Kitchen Ticket Card
interface TicketCardProps {
  key?: React.Key;
  order: Order;
  currentTime: number;
  completedTime?: number;
  getTableNumber: (id?: string) => string;
  onCompleteItem: (orderId: string, productId: string) => void;
  onCompleteTicket: (orderId: string) => void;
  isCompletedView?: boolean;
}

function KitchenTicketCard({
  order,
  currentTime,
  completedTime,
  getTableNumber,
  onCompleteItem,
  onCompleteTicket,
  isCompletedView = false,
}: TicketCardProps) {
  // Kitchen items
  const kItems = order && Array.isArray(order.items) ? order.items.filter((i) => i && i.isKitchenItem) : [];
  const currentStatus = order.status === "draft" || order.status === "to_cook" ? "To Cook" : order.status;
  const showButton = !isCompletedView && currentStatus !== "Completed" && currentStatus !== "completed";
  const buttonText = currentStatus === "To Cook" ? "Start Preparing" : "Mark Completed";
  const isOrderCompleted = isCompletedView || currentStatus === "Completed" || currentStatus === "completed";

  const orderTime = order && order.createdAt ? new Date(order.createdAt).getTime() : currentTime;
  const targetTime = isOrderCompleted && completedTime ? completedTime : currentTime;
  const elapsedMs = Math.max(0, targetTime - orderTime);
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);

  // Time-glowing borders
  const isDelayed = minutes >= 10; // Trigger yellow / red delay alarm

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white border shadow-[0_8px_24px_rgba(111,78,55,0.08)] transition-all duration-200 ${
        isDelayed && !isCompletedView
          ? "border-red-500 shadow-lg shadow-red-500/5"
          : "border-[#6F4E37]"
      } ${
        isCompletedView ? "opacity-60 hover:opacity-100" : ""
      }`}
    >
      {/* Card Header details */}
      <div className={`flex items-center justify-between border-b px-4 py-3 rounded-t-2xl ${
        isDelayed && !isCompletedView
          ? "border-red-200 bg-red-50"
          : "border-[#E6DDD2] bg-[#FAF7F2]"
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-black text-[#3E2723]">{order.orderNumber}</span>
          <span className="rounded-lg bg-[#F5EFE6] px-2 py-0.5 font-display text-xs font-black text-[#6F4E37]">
            Table {getTableNumber(order.tableId)}
          </span>
        </div>

        {/* Live Kitchen Timer Counter */}
        <div className={`flex items-center gap-1.5 text-xs font-mono font-black ${
          isDelayed && !isCompletedView ? "text-red-600 animate-pulse" : "text-[#6F4E37]"
        }`}>
          <Clock className="h-3 w-3" />
          <span>
            {minutes}:{seconds.toString().padStart(2, "0")}m
          </span>
        </div>
      </div>

      {/* Card Items List */}
      <div className="flex-1 p-4 bg-white rounded-b-2xl">
        {order.notes && (
          <div className="mb-3 rounded-xl bg-[#FFF9EB] border border-[#C8A96B]/30 px-3 py-2 text-xs text-[#6F4E37]">
            <span className="font-black text-[#3E2723]">Instructions:</span> {order.notes}
          </div>
        )}

        <ul className="space-y-3">
          {kItems.map((itm, index) => (
            <li key={index} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 max-w-[80%]">
                <span className={`font-mono font-black text-sm ${
                  isOrderCompleted ? "text-gray-400 line-through" : "text-[#C8A96B]"
                }`}>{itm.quantity}x</span>
                <div>
                  <span
                    className={`text-sm font-bold tracking-wide block ${
                      isOrderCompleted ? "line-through text-gray-400" : "text-[#3E2723]"
                    }`}
                  >
                    {itm.productName}
                  </span>
                  {itm.notes && (
                    <span className={`text-[10px] font-mono italic block mt-0.5 ${
                      isOrderCompleted ? "line-through text-gray-400" : "text-[#6F4E37]"
                    }`}>
                      ↳ {itm.notes}
                    </span>
                  )}
                </div>
              </div>

              {!itm.completed && !isCompletedView && (
                <button
                  onClick={() => onCompleteItem(order.id, itm.productId)}
                  className="rounded-lg border border-[#E6DDD2] bg-[#FAF7F2] p-1 text-[#6F4E37] hover:border-[#6F4E37] hover:bg-[#F5EFE6] transition cursor-pointer"
                  title="Mark Item Completed"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Overall Card progression Action */}
      {showButton && (
        <div className="border-t border-[#E6DDD2] bg-[#FAF7F2] p-3 flex justify-end rounded-b-2xl">
          <button
            onClick={() => {
              console.log("KDS Card Button Clicked: orderId =", order.id, "currentStatus =", order.status);
              onCompleteTicket(order.id);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] hover:scale-[1.015] hover:shadow-[#6F4E37]/35 shadow-[#6F4E37]/20 px-3 py-1.5 text-xs font-black text-white transition duration-200 cursor-pointer shadow-md"
          >
            {buttonText}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#E6DDD2] bg-[#FAF7F2] text-[#6F4E37]">
      <CheckSquare className="h-8 w-8 text-[#C8A96B] mb-2" />
      <p className="text-xs font-bold">{message}</p>
    </div>
  );
}
