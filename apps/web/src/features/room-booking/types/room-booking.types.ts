export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'unavailable';

export type BookingStatus = 'confirmed' | 'pending' | 'in_progress' | 'cancelled' | 'completed';

export interface RoomFacility {
  id: string;
  name: string;
  icon?: string;
}

export interface RoomMapCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  labelPosition?: { x: number; y: number };
}

export interface Room {
  id: string;
  code: string;
  name: string;
  capacity: number;
  status: RoomStatus;
  location: string;
  floor: string;
  facilities: string[];
  description?: string;
  coordinates?: RoomMapCoordinates;
  currentBooking?: {
    title: string;
    organizer: string;
    endTime: string;
  };
}

export interface Booking {
  id: string;
  bookingCode: string;
  roomId: string;
  roomName: string;
  roomFloor: string;
  roomLocation: string;
  title: string;
  date: string;
  displayDate?: string;
  monthShort?: string;
  dayNumber?: string;
  startTime: string;
  endTime: string;
  organizerName: string;
  organizerAvatar?: string;
  organizerDept: string;
  status: BookingStatus;
  equipmentNeeded?: string[];
  notes?: string;
}

export interface RoomBookingStats {
  totalRooms: number;
  availableToday: number;
  availablePercentage: number;
  occupiedNow: number;
  occupiedPercentage: number;
  bookingsToday: number;
  cancellationsToday: number;
  cancellationPercentage: number;
}

export interface UsageTrendItem {
  day: string;
  percentage: number;
  fullDate?: string;
}

export interface RoomBookingFilter {
  location: string;
  floor: string;
  search: string;
  date: string;
}

export type RoomCanvasObjectType =
  | "room"
  | "table"
  | "chair"
  | "wall"
  | "door"
  | "reception"
  | "zone"
  | "screen"
  | "decoration";

export interface RoomCanvasObject {
  id: string;
  type: RoomCanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
  parentId?: string;
  // Room metadata
  roomId?: string;
  roomCode?: string;
  roomStatus?: RoomStatus;
  capacity?: number;
  // Table / Desk properties
  tableShape?: "rectangle" | "circle" | "square";
  // Zone / Wall / Door properties
  color?: string;
  opacity?: number;
  thickness?: number;
  doorWidth?: number;
}

export interface RoomLayoutCanvasData {
  location: string;
  floor: string;
  width: number;
  height: number;
  gridSize: number;
  objects: RoomCanvasObject[];
  rooms: Room[];
}

