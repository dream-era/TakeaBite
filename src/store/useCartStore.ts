import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // The original menuItem id
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  workspaceId: string;
  tableId?: string;
}

interface CartStore {
  items: CartItem[];
  orderType: 'dine_in' | 'takeaway' | null;
  setOrderType: (type: 'dine_in' | 'takeaway') => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, workspaceId: string, delta: number) => void;
  removeItem: (id: string, workspaceId: string) => void;
  clearCart: (workspaceId: string) => void;
  getCartForWorkspace: (workspaceId: string, tableId: string) => CartItem[];
  confirmedOrderDetails: any | null;
  setConfirmedOrderDetails: (details: any) => void;
  placedOrderId: string | null;
  setPlacedOrderId: (id: string) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: null,
      setOrderType: (type) => set({ orderType: type }),
      confirmedOrderDetails: null,
      placedOrderId: null,
      setConfirmedOrderDetails: (details) => set({ confirmedOrderDetails: details }),
      setPlacedOrderId: (id) => set({ placedOrderId: id }),
      addItem: (item) => set((state) => {
        const existingItem = state.items.find(i => i.id === item.id && i.workspaceId === item.workspaceId && i.tableId === item.tableId);
        if (existingItem) {
          return {
            items: state.items.map(i => 
              i.id === item.id && i.workspaceId === item.workspaceId && i.tableId === item.tableId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          };
        }
        // Auto-set removed to force explicit selection
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),
      updateQuantity: (id, workspaceId, delta) => set((state) => {
        return {
          items: state.items.map(item => {
            if (item.id === id && item.workspaceId === workspaceId) {
              const newQ = Math.max(0, item.quantity + delta);
              return { ...item, quantity: newQ };
            }
            return item;
          }).filter(item => item.quantity > 0)
        };
      }),
      removeItem: (id, workspaceId) => set((state) => ({
        items: state.items.filter(item => !(item.id === id && item.workspaceId === workspaceId))
      })),
      clearCart: (workspaceId) => set((state) => ({
        items: state.items.filter(item => item.workspaceId !== workspaceId),
        orderType: null, // Reset to default
      })),
      getCartForWorkspace: (workspaceId, tableId) => {
        return get().items.filter(item => item.workspaceId === workspaceId && item.tableId === tableId);
      }
    }),
    {
      name: 'serveflow-cart-storage',
    }
  )
);
