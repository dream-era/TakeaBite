export type RestaurantPlan = 'basic' | 'pro' | 'enterprise'
export type SubscriptionPlan = 'starter' | 'growth' | 'pro'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'
export type RestaurantStatus = 'active' | 'inactive' | 'suspended'
export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing'
  | 'ready' | 'served' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'online' | 'cash'
export type ItemStatus = 'pending' | 'preparing' | 'done'
export type Station = 'food' | 'juice' | 'both'
export type StaffRole = 'owner' | 'chef' | 'juice' | 'server' | 'manager' | 'cook' | 'juice_maker' | 'cashier'
export type TableStatus = 'available' | 'occupied' | 'inactive'
export type BusinessType =
  | 'individual' | 'proprietorship'
  | 'partnership' | 'private_limited'

export interface Restaurant {
  id: string
  owner_id: string
  name: string
  slug: string
  type: string
  logo_url: string | null
  address: string | null
  city: string | null
  phone: string | null
  contact_email: string | null
  description: string | null
  working_hours: Record<string, unknown> | null
  is_active: boolean
  status: RestaurantStatus
  business_type: BusinessType | null
  gst_number: string | null
  fssai_number: string | null
  pan_number: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_holder_name: string | null
  razorpay_account_id: string | null
  payment_enabled: boolean
  commission_percent: number
  plan: RestaurantPlan
  current_plan: SubscriptionPlan
  sub_status: SubscriptionStatus
  trial_start_date: string | null
  trial_end_date: string | null
  billing_start_date: string | null
  billing_end_date: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}
export type RestaurantInsert = Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>

export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  image_url: string | null
  is_veg: boolean
  description: string | null
  station: Station
  is_available: boolean
  display_order: number
  created_at: string
  updated_at: string
}
export type MenuItemInsert = Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>

export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  icon: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}
export type MenuCategoryInsert = Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>

export interface RestaurantTable {
  id: string
  restaurant_id: string
  table_number: number
  table_name: string | null
  status: TableStatus
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}
export type RestaurantTableInsert = Omit<RestaurantTable, 'id' | 'created_at'>

export interface Staff {
  id: string
  restaurant_id: string
  user_id: string | null
  name: string
  role: StaffRole
  pin_hash: string
  phone: string | null
  email: string | null
  is_active: boolean
  status: 'pending' | 'active' | 'disabled'
  invite_token: string | null
  last_login: string | null
  created_at: string
}
export type StaffInsert = Omit<Staff, 'id' | 'created_at'>

export interface Order {
  id: string
  restaurant_id: string
  table_id: string
  status: OrderStatus
  total_amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  special_instructions: string | null
  daily_order_number: number | null
  order_hash: string | null
  created_at: string
  updated_at: string
}
export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at'>

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  price: number
  station: Station
  status: ItemStatus
  created_at: string
}
export type OrderItemInsert = Omit<OrderItem, 'id' | 'created_at'>

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  station: Station
  isVeg: boolean
  imageUrl?: string | null
}

export interface CreateOrderPayload {
  restaurantId: string
  tableId: string
  items: CartItem[]
  totalAmount: number
  paymentMethod: PaymentMethod
  specialInstructions?: string
}

export interface KitchenSession {
  staffId: string
  role: StaffRole
  name: string
  restaurantId: string
  expiry: number
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem })[]
  tables: RestaurantTable
}

export interface AnalyticsData {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  activeTables: number
  peakHours: { hour: number; count: number }[]
  topItems: { name: string; count: number; revenue: number }[]
}


