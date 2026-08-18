import type { Room, Booking, RoomBookingStats, UsageTrendItem, RoomBookingFilter, RoomLayoutCanvasData } from "../types/room-booking.types";
import { MOCK_STATS, MOCK_ROOMS, MOCK_UPCOMING_BOOKINGS, MOCK_TODAY_BOOKINGS, MOCK_USAGE_TREND, getMockFloorCanvasLayout } from "../utils/mock-data";

export async function fetchRoomBookingStats(): Promise<RoomBookingStats> {
  return Promise.resolve({ ...MOCK_STATS });
}

export async function fetchRooms(filter?: Partial<RoomBookingFilter>): Promise<Room[]> {
  let rooms = [...MOCK_ROOMS];
  if (filter?.location && filter.location.includes("Surabaya")) {
    const layout = getMockFloorCanvasLayout(filter.location, filter.floor || "Lantai 1");
    rooms = layout.rooms;
  } else if (filter?.floor && filter.floor === "Lantai 2") {
    const layout = getMockFloorCanvasLayout(filter.location || "Kantor Pusat - Jakarta", "Lantai 2");
    rooms = layout.rooms;
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    rooms = rooms.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }
  return Promise.resolve(rooms);
}

export async function fetchRoomFloorLayout(location: string, floor: string): Promise<RoomLayoutCanvasData> {
  const layout = getMockFloorCanvasLayout(location, floor);
  return Promise.resolve(structuredClone(layout));
}

export async function fetchUpcomingBookings(): Promise<Booking[]> {
  return Promise.resolve([...MOCK_UPCOMING_BOOKINGS]);
}

export async function fetchTodayBookings(): Promise<Booking[]> {
  return Promise.resolve([...MOCK_TODAY_BOOKINGS]);
}

export async function fetchRoomUsageTrend(): Promise<UsageTrendItem[]> {
  return Promise.resolve([...MOCK_USAGE_TREND]);
}

