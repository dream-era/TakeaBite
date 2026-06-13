import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StaffRole = 'owner' | 'chef' | 'juice' | 'server' | 'servant' | 'cook' | 'juice_maker' | 'cashier' | 'Cook' | 'Juice Maker' | 'Servant' | 'Server';

export interface CurrentSession {
  id?: string;
  staffId?: string;
  name: string;
  role: StaffRole | string;
  workspaceId?: string;
  restaurantId?: string;
  restaurantName?: string;
  expiry: number;
  fingerprint?: string;
}

interface StaffStore {
  currentSession: CurrentSession | null;
  logout: () => void;
  setSession: (session: CurrentSession | null) => void;
}

export const useStaffStore = create<StaffStore>()(
  persist(
    (set) => ({
      currentSession: null,
      logout: () => set({ currentSession: null }),
      setSession: (session) => set({ currentSession: session })
    }),
    {
      name: 'serveflow-staff-storage',
    }
  )
);
