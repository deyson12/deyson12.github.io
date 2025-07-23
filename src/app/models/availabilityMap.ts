// Define la estructura de TimeSlot según el DTO del backend
export interface TimeSlot {
  start: Date | null; // ISO string, e.g. "2025-07-19T13:00:00.000Z"
  end: Date | null;
}

// Mapa de días a listas de franjas
export type AvailabilityMap = Record<string, TimeSlot[]>;

export interface SellerAvailabilityDto {
  id: string;
  sellerId: string;
  dayOfWeek: string;   // "MONDAY", "THURSDAY", …
  startTime: string;   // "08:00:00"
  endTime: string;     // "17:00:00"
}