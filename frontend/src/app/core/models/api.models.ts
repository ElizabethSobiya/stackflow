/**
 * Transport types mirroring the backend DTOs.
 *
 * <p>Hand-maintained on purpose at this size — the API is small and the compiler catches drift the
 * moment a field is used. If the surface grows, generate this file from the OpenAPI document the
 * backend already serves at /v3/api-docs rather than editing it by hand.
 */

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  timestamp: string;
  status: number;
  code: ApiErrorCode;
  message: string;
  path: string;
  fieldErrors?: { field: string; message: string }[];
}

export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'BUSINESS_RULE_VIOLATION'
  | 'RESOURCE_CONFLICT'
  | 'CONCURRENT_MODIFICATION'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_STATUS_TRANSITION'
  | 'AUTHENTICATION_FAILED'
  | 'ACCESS_DENIED'
  | 'INTERNAL_ERROR';

export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  category: string;
  sku: string;
  price: number;
  active: boolean;
  quantity?: number;
  lowStockThreshold?: number;
  lowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name: string;
  description?: string | null;
  category: string;
  sku: string;
  price: number;
  initialQuantity?: number | null;
  lowStockThreshold?: number | null;
}

export interface StockView {
  productId: number;
  quantity: number;
  lowStockThreshold: number;
  lowStock: boolean;
}

export interface StockItem {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  lowStock: boolean;
  updatedAt: string;
}

export type StockMovementReason =
  | 'INITIAL_STOCK'
  | 'PURCHASE_RECEIVED'
  | 'MANUAL_ADJUSTMENT'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'DAMAGE_WRITE_OFF'
  | 'STOCK_COUNT_CORRECTION';

export interface StockMovement {
  id: number;
  delta: number;
  resultingQuantity: number;
  reason: StockMovementReason;
  referenceId?: number;
  note?: string;
  createdBy?: number;
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderStatusHistoryEntry {
  id: number;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedBy?: number;
  note?: string;
  changedAt: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  status: OrderStatus;
  /** Next legal statuses, decided by the server's state machine — the UI never guesses. */
  allowedTransitions: OrderStatus[];
  totalAmount: number;
  notes?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  statusHistory: OrderStatusHistoryEntry[];
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  allowedTransitions: OrderStatus[];
  totalAmount: number;
  totalUnits: number;
  createdAt: string;
}

export interface CreateOrderPayload {
  customerName: string;
  customerEmail?: string | null;
  notes?: string | null;
  items: { productId: number; quantity: number }[];
}

export interface DashboardSummary {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenueThisWeek: number;
  lowStockCount: number;
  activeProducts: number;
  unitsOnHand: number;
  revenueSeries: { date: string; amount: number }[];
  recentOrders: OrderSummary[];
}
