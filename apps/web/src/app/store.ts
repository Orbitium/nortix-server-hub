import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UiState = {
  navCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: "dark" | "light";
  toggleNav: () => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navCollapsed: false,
      mobileNavOpen: false,
      theme: "dark",
      toggleNav: () => set((state) => ({ navCollapsed: !state.navCollapsed })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: "nortix-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ navCollapsed, theme }) => ({ navCollapsed, theme }),
    },
  ),
);
