export type Role = 'admin' | 'employee' | 'kitchen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind bg-class or hex hex code
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  unit: string; // e.g., 'pcs', 'portion', 'glass'
  tax: number; // e.g., 5 for 5% tax
  description: string;
  image: string; // base64 or placeholder URL
  isKitchenItem: boolean;
  createdAt: string;
}

export interface Floor {
  id: string;
  name: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface Table {
  id: string;
  tableNumber: string;
  seats: number;
  floorId: string;
  active: boolean;
  status: TableStatus;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  active: boolean;
}

export interface Promotion {
  id: string;
  promotionType: 'buy_x_get_y' | 'order_discount';
  minimumQuantity?: number;
  minimumOrderAmount?: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  active: boolean;
  description: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  tax: number; // calculated tax for item
  discount: number; // promo/coupon discount for this item
  lineTotal: number;
  isKitchenItem: boolean;
  completed?: boolean; // Kitchen completion status for this item
  notes?: string;
}

export type OrderStatus = 'draft' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  tableId?: string;
  customerId?: string;
  employeeId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod?: 'cash' | 'card' | 'upi';
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

export interface Session {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingAmount?: number;
  status: 'open' | 'closed';
  employeeId: string;
}

export interface RealtimeEvent {
  type: 'NEW_ORDER' | 'KITCHEN_UPDATE' | 'ORDER_PAID' | 'TABLE_STATUS_CHANGE' | 'SESSION_UPDATE';
  data: any;
  timestamp: string;
}
