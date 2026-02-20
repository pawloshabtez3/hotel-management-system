"use client";

import { create } from "zustand";

type LocationMode = "manual" | "gps";

type LocationState = {
  mode: LocationMode;
  selectedCity: string;
  gpsLabel: string | null;
  isLocating: boolean;
  setMode: (mode: LocationMode) => void;
  setCity: (city: string) => void;
  startLocating: () => void;
  setGpsLabel: (label: string) => void;
};

export const useLocationStore = create<LocationState>((set) => ({
  mode: "manual",
  selectedCity: "Addis Ababa",
  gpsLabel: null,
  isLocating: false,
  setMode: (mode) => set({ mode }),
  setCity: (selectedCity) => set({ selectedCity, mode: "manual" }),
  startLocating: () => set({ isLocating: true, mode: "gps" }),
  setGpsLabel: (gpsLabel) => set({ gpsLabel, isLocating: false }),
}));
