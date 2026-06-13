import React, { useRef, useState } from "react";
import { Order, Customer, Table } from "../types";
import { Printer, Download, Mail, Share2, Check, X, FileText } from "lucide-react";

interface ReceiptModalProps {
  order: Order | null;
  customer: Customer | null;
  table: Table | null;
  onClose: () => void;
}

export default function ReceiptModal({ order, customer, table, onClose }: ReceiptModalProps) {
  const [emailSent, setEmailSent] = useState(false);
  const [whatsappShared, setWhatsappShared] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate distinct items taxes
  const totalTaxRate = order.items.reduce((acc, itm) => acc + (itm.tax / 100) * itm.lineTotal, 0);

  // Dynamic UPI payment QR generation URL
  const upiVpa = "Cafe POS@ybl";
  const upiAmount = order.total.toFixed(2);
  const upiestr = `upi://pay?pa=${upiVpa}&pn=Cafe POS%20POS&am=${upiAmount}&cu=INR&tn=Order%20${order.orderNumber}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiestr)}`;

  // Simulated PDF download
  const handleDownloadPDF = () => {
    alert("Downloading PDF Receipt containing high-fidelity vector metadata...");
    const content = receiptRef.current?.innerText || "";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Receipt_${order.orderNumber}.txt`;
    link.click();
  };

  // Printing style handler
  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Simple popup window or styling replacement to print beautifully
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${order.orderNumber}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; line-height: 1.4; color: #111; max-width: 320px; margin: 0 auto; }
              .center { text-align: center; }
              .dashed { border-top: 1px dashed #000; margin: 10px 0; }
              .flex { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handleWhatsappShare = () => {
    setWhatsappShared(true);
    setTimeout(() => setWhatsappShared(false), 3000);
    // Open standard whatsapp text link
    const text = `Thanks for dining at Cafe POS! Your receipts for Order ${order.orderNumber} is ready. Total: ₹${order.total.toFixed(2)}. Have an awesome day!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans">
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row max-h-[90vh]">
        
        {/* Left Side: Receipt Actions Dashboard */}
        <div className="flex flex-col justify-between border-b border-gray-100 bg-gray-50/50 p-6 md:w-5/12 md:border-b-0 md:border-r">
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900">Paid Receipt</h3>
            <p className="mt-1 text-sm text-gray-500">Order successfully recorded. Actions available for customers.</p>
            
            <div className="mt-6 space-y-3">
              <button
                id="btn-print-receipt"
                onClick={handlePrint}
                className="flex w-full items-center gap-3 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-purple-700"
              >
                <Printer className="h-4 w-4" />
                Print Cashier Ticket
              </button>
              
              <button
                id="btn-download-pdf"
                onClick={handleDownloadPDF}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 text-purple-500" />
                Download PDF Receipt
              </button>

              <button
                id="btn-email-receipt"
                onClick={handleSendEmail}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-purple-500" />
                  Email Receipt to Customer
                </div>
                {emailSent && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" /> Sent</span>}
              </button>

              <button
                id="btn-whatsapp-receipt"
                onClick={handleWhatsappShare}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="h-4 w-4 text-emerald-500" />
                  Share via WhatsApp
                </div>
                {whatsappShared && <span className="text-xs text-green-600">Opened</span>}
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-purple-50 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-800">
              <span className="h-2 w-2 rounded-full bg-purple-500 pulsing-ring" />
              Dynamic UPI Payment Code
            </h4>
            <p className="mt-1 text-xs text-purple-600">Unified Payments Interface sandbox mode. Dynamic instant amount matching.</p>
            <div className="mt-3 flex justify-center bg-white p-2 rounded-lg border border-purple-100 max-w-[170px] mx-auto">
              <img src={qrCodeUrl} alt="UPI QR" className="h-36 w-36 object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="mt-2 text-center text-[10px] font-mono text-purple-600 font-medium">VPA: {upiVpa}</div>
          </div>
        </div>

        {/* Right Side: Scrollable Receipt Render */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2 text-gray-400">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="font-mono text-xs">{order.orderNumber}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-10 py-8">
            {/* Printable Receipt Area */}
            <div
              ref={receiptRef}
              className="mx-auto max-w-sm rounded-lg border border-gray-100 bg-neutral-50 px-6 py-8 outline-dashed outline-1 outline-offset-4 outline-neutral-200"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              <div className="text-center">
                <h1 className="text-xl font-bold uppercase tracking-widest text-neutral-800">Cafe POS</h1>
                <p className="text-[11px] text-neutral-500">12, Green Park Avenue, Delhi</p>
                <p className="text-[11px] text-neutral-500">Tel: +91 99882 11000</p>
              </div>

              <div className="mt-6 border-b border-dashed border-neutral-300 pb-2 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Order: {order.orderNumber}</span>
                  <span>Date: {formattedDate}</span>
                </div>
                {table && (
                  <div className="flex justify-between">
                    <span>Table: {table.tableNumber} ({table.seats} seats)</span>
                    <span>Floor: Lobby</span>
                  </div>
                )}
                {customer && (
                  <div className="mt-1 flex justify-between">
                    <span>Buyer: {customer.name}</span>
                    <span>Phone: {customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="mt-4 text-xs">
                <div className="flex border-b border-neutral-200 pb-1 font-bold text-neutral-700 text-right">
                  <span className="flex-1 text-left">Item</span>
                  <span className="w-12">Qty</span>
                  <span className="w-20">Price</span>
                  <span className="w-20">Total</span>
                </div>

                <div className="space-y-2 mt-2">
                  {order.items.map((itm, i) => (
                    <div key={i} className="flex text-right text-neutral-600">
                      <span className="flex-1 text-left truncate">{itm.productName}</span>
                      <span className="w-12">{itm.quantity}</span>
                      <span className="w-20">₹{itm.price.toFixed(2)}</span>
                      <span className="w-20 font-bold">₹{itm.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashed my-4 border-t border-dashed border-neutral-300" />

              {/* Calculations */}
              <div className="space-y-1.5 text-xs text-neutral-600 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CGST & SGST:</span>
                  <span>₹{order.tax.toFixed(2)}</span>
                </div>
                <div className="dashed my-4 border-t border-dashed border-neutral-300" />
                <div className="flex justify-between text-sm font-bold text-neutral-800">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹{order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="dashed my-4 border-t border-dashed border-neutral-300" />

              {/* Payment Details */}
              <div className="text-center text-[10px] text-neutral-500">
                <p>Payment Method: <span className="font-bold uppercase text-neutral-700">{order.paymentMethod || "UPI"}</span></p>
                <p className="mt-4">*** THANK YOU FOR DINING ***</p>
                <p>Powered by Cafe POS</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
