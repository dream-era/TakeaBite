import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Database } from '@/types/database'

type Workspace = Database['public']['Tables']['workspaces']['Row']

interface WorkspaceState {
  activeWorkspace: Workspace | null
  setActiveWorkspace: (workspace: Workspace) => void
  clearActiveWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspace: null,
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      clearActiveWorkspace: () => set({ activeWorkspace: null }),
    }),
    {
      name: 'serveflow-workspace-storage',
    }
  )
)
