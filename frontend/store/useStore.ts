
import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  themeColor: string;
  toggleSidebar: () => void;
  setThemeColor: (color: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  themeColor: 'blue',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setThemeColor: (color) => set({ themeColor: color }),
}));
