import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
export type ItemType = 'food' | 'beverage';

export interface OrderItem {
  id: string; // unique item id inside order
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes: string;
  itemType: ItemType;
  imageUrl?: string;
}

export interface Order {
  id: string;
  workspaceId: string;
  tableId: string;
  items: OrderItem[];
  statusByFood: OrderStatus; // Status tracking for food items
  statusByBeverage: OrderStatus; // Status tracking for beverage items
  createdAt: number;
}

interface OrderStore {
  orders: Order[];
  placeOrder: (workspaceId: string, tableId: string, items: Omit<OrderItem, 'id'>[]) => void;
  updateOrderStatus: (orderId: string, itemType: ItemType, newStatus: OrderStatus) => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      orders: [],
      placeOrder: (workspaceId, tableId, items) => {
        const hasFood = items.some(i => i.itemType === 'food');
        const hasBeverage = items.some(i => i.itemType === 'beverage');

        const newOrder: Order = {
          id: `order-${crypto.randomUUID()}`,
          workspaceId,
          tableId,
          items: items.map(item => ({ ...item, id: `oi-${crypto.randomUUID()}` })),
          statusByFood: hasFood ? 'NEW' : 'COMPLETED',
          statusByBeverage: hasBeverage ? 'NEW' : 'COMPLETED',
          createdAt: Date.now(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders]
        }));
      },
      updateOrderStatus: (orderId, itemType, newStatus) => {
        set((state) => ({
          orders: state.orders.map(order => {
            if (order.id !== orderId) return order;
            if (itemType === 'food') {
              return { ...order, statusByFood: newStatus };
            } else {
              return { ...order, statusByBeverage: newStatus };
            }
          })
        }));
      }
    }),
    {
      name: 'serveflow-orders-storage',
    }
  )
);
