import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/types/frontend';

interface UIState {
  // Sidebar State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;

  // Workspace Switcher State
  activeWorkspaceId: string | null;
  workspaces: Workspace[]; // Placeholder for loaded workspaces
  setActiveWorkspaceId: (id: string) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      activeWorkspaceId: null,
      workspaces: [],
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      setWorkspaces: (workspaces) => set({ workspaces }),
    }),
    {
      name: 'serveflow-ui-state',
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }), // Only persist active workspace selection
    }
  )
);
