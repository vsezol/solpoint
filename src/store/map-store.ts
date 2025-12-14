import { create } from "zustand";

export type Country = {
    name: string
    code: string
}

interface Maptate {
 country: Country | null
 isLoading: boolean
 setCountry: (c: Country) => void
  setLoading: (loading: boolean) => void
}

export const useMapStore = create<Maptate>((set) => ({
    country: null,
  isLoading: false,
  setCountry: (c) => {
    set({
      country: c,
     
    });
  },
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

}));

