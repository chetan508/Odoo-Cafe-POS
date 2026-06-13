import React, { useState, useEffect } from "react";
import { Order, Table, Category, Product } from "../types";
import { Clock, CheckSquare, Bell, Flame, ChevronRight, Check } from "lucide-react";

interface KitchenDisplayProps {
  orders: Order[];
  tables: Table[];
  products: Product[];
  onCompleteItem: (orderId: string, productId: string) => void;
  onCompleteTicket: (orderId: string) => void;
  onDeleteTicket?: (orderId: string) => void;
}

export default function KitchenDisplay({
  orders,
  tables,
  products,
  onCompleteItem,
  onCompleteTicket,
}: KitchenDisplayProps) {
  // Only kitchen items count in KDS
  const activeOrders = orders.filter(
    (o) => o.status !== "cancelled" && o.items.some((i) => i.isKitchenItem)
  );

  // States to keep track of local ticket timings (Live Kitchen Timers!)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders into To Cook (Draft, or newly created with uncompleted kitchen items), Preparing, and Completed
  const getKitchenItems = (o: Order) => o.items.filter((i) => i.isKitchenItem);

  const getOrderStatusGroup = (o: Order): "to_cook" | "preparing" | "completed" => {
    const kItems = getKitchenItems(o);
    const completedCount = kItems.filter((i) => i.completed).length;

    if (completedCount === 0) return "to_cook";
    if (completedCount === kItems.length) return "completed";
    return "preparing";
  };

  const getTableNumber = (tableId?: string) => {
    return tables.find((t) => t.id === tableId)?.tableNumber || "Takeout";
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

  return (
    <div className="flex h-full flex-col bg-neutral-900 text-white font-sans">
      
      {/* KDS Header Banner */}
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight">KDS Screen</h1>
            <p className="text-xs text-neutral-400">CafeFlow Point of Sale real-time kitchen monitors</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-green-500 pulsing-ring" />
            <span className="text-neutral-300">Live Listening Node (SSE Active)</span>
          </div>

          <button
            onClick={triggerNotificationSound}
            className="rounded-lg bg-neutral-800 p-2 text-neutral-400 hover:bg-neutral-700 hover:text-white"
            title="Test Kitchen Buzzer Sound Alarm"
          >
            <Bell className="h-4 w-4 text-purple-400" />
          </button>
        </div>
      </header>

      {/* KDS Body Columns (To Cook -> Preparing -> Completed) */}
      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-3">
        
        {/* Column 1: To Cook Tickets */}
        <div className="flex flex-col rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-orange-400 flex items-center gap-2">
              <span className="flex h-6 w-16 items-center justify-center rounded-md bg-orange-500/10 text-xs font-semibold text-orange-400 uppercase">To Cook</span>
            </h2>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
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
        <div className="flex flex-col rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-yellow-400 flex items-center gap-2">
              <span className="flex h-6 w-20 items-center justify-center rounded-md bg-yellow-500/10 text-xs font-semibold text-yellow-400 uppercase font-display">Preparing</span>
            </h2>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
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
        <div className="flex flex-col rounded-xl bg-neutral-950/40 border border-neutral-800 p-4 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-emerald-400 flex items-center gap-2">
              <span className="flex h-6 w-22 items-center justify-center rounded-md bg-emerald-500/10 text-xs font-semibold text-emerald-400 uppercase font-display">Completed</span>
            </h2>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
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
  getTableNumber: (id?: string) => string;
  onCompleteItem: (orderId: string, productId: string) => void;
  onCompleteTicket: (orderId: string) => void;
  isCompletedView?: boolean;
}

function KitchenTicketCard({
  order,
  currentTime,
  getTableNumber,
  onCompleteItem,
  onCompleteTicket,
  isCompletedView = false,
}: TicketCardProps) {
  // Kitchen items
  const kItems = order.items.filter((i) => i.isKitchenItem);
  const orderTime = new Date(order.createdAt).getTime();
  const elapsedMs = currentTime - orderTime;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);

  // Time-glowing borders
  const isDelayed = minutes >= 10; // Trigger yellow / red delay alarm

  return (
    <div
      className={`relative flex flex-col rounded-xl bg-neutral-900 border transition-all ${
        isDelayed && !isCompletedView
          ? "border-red-500/40 shadow-xs shadow-red-500/10"
          : isCompletedView
          ? "border-neutral-800 opacity-60 hover:opacity-100"
          : "border-neutral-800 hover:border-neutral-700"
      }`}
    >
      {/* Card Header details */}
      <div className={`flex items-center justify-between border-b px-4 py-3 ${
        isDelayed && !isCompletedView
          ? "border-red-500/20 bg-red-950/20"
          : "border-neutral-800 bg-neutral-950/50"
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{order.orderNumber}</span>
          <span className="rounded-md bg-purple-500/20 px-1.5 py-0.5 font-display text-xs font-semibold text-purple-300">
            Table {getTableNumber(order.tableId)}
          </span>
        </div>

        {/* Live Kitchen Timer Counter */}
        <div className={`flex items-center gap-1.5 text-xs font-mono font-semibold ${
          isDelayed && !isCompletedView ? "text-red-400" : "text-neutral-400"
        }`}>
          <Clock className="h-3 w-3" />
          <span>
            {minutes}:{seconds.toString().padStart(2, "0")}m
          </span>
        </div>
      </div>

      {/* Card Items List */}
      <div className="flex-1 p-4">
        {order.notes && (
          <div className="mb-3 rounded-lg bg-red-950/30 border border-red-500/20 px-3 py-2 text-xs text-red-300">
            <span className="font-bold">Instructions:</span> {order.notes}
          </div>
        )}

        <ul className="space-y-3">
          {kItems.map((itm, index) => (
            <li key={index} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 max-w-[80%]">
                <span className="font-mono font-bold text-orange-400 text-sm">{itm.quantity}x</span>
                <div>
                  <span
                    className={`text-sm font-semibold tracking-wide block ${
                      itm.completed ? "line-through text-neutral-500" : "text-neutral-200"
                    }`}
                  >
                    {itm.productName}
                  </span>
                  {itm.notes && (
                    <span className="text-[10px] text-yellow-400/80 font-mono italic block mt-0.5">
                      ↳ {itm.notes}
                    </span>
                  )}
                </div>
              </div>

              {!itm.completed && !isCompletedView && (
                <button
                  onClick={() => onCompleteItem(order.id, itm.productId)}
                  className="rounded-md border border-neutral-800 bg-neutral-950/40 p-1 text-neutral-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
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
      {!isCompletedView && (
        <div className="border-t border-neutral-800/80 bg-neutral-950/30 p-3 flex justify-end">
          <button
            onClick={() => onCompleteTicket(order.id)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
          >
            Advance Ticket
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-neutral-800/50 bg-neutral-950/20 border-dashed">
      <CheckSquare className="h-8 w-8 text-neutral-600 mb-2" />
      <p className="text-xs text-neutral-500">{message}</p>
    </div>
  );
}
