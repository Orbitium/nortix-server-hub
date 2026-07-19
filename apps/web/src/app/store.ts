import { create } from "zustand";

type UiState = {
  navCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: "dark" | "dim";
  toggleNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  navCollapsed: false,
  mobileNavOpen: false,
  theme: "dark",
  toggleNav: () => set((state) => ({ navCollapsed: !state.navCollapsed })),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "dim" : "dark" })),
}));
