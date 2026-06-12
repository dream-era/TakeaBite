// Types for Frontend State Placeholders
// These mirror what would eventually come from the backend/database

export type WorkspaceStatus = 'active' | 'suspended' | 'setup_pending';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatus;
  plan: 'free' | 'starter' | 'growth' | 'pro';
  logo?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  isVeg: boolean;
  image?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  tableNumber?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  timeElapsed?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'owner' | 'servant' | 'cashier' | 'kitchen' | 'server';
  status: 'active' | 'invited' | 'disabled';
  email?: string;
}
