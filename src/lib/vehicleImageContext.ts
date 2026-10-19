import { createContext, useContext } from 'react';

export interface VehicleImage {
  /** The latest uploaded photo, else the representative image for the model; null if neither. */
  src: string | null;
  /** True for a photo of this vehicle, false for a representative one. */
  isPhoto: boolean;
}

/** Set by the vehicle profile, so its tabs show the same image as its header. */
export const VehicleImageContext = createContext<VehicleImage>({ src: null, isPhoto: false });

export function useVehicleImage(): VehicleImage {
  return useContext(VehicleImageContext);
}
