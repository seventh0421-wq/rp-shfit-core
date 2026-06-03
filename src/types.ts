export type AvailabilityStatus = "available" | "maybe" | "unavailable";

export interface Staff {
  id: string;
  name: string;
  roles: string[]; // List of roles they can perform (e.g. ["Host", "Bartender"])
  maxShifts: number; // Max allowed shifts per week
}

export interface SlotRoleRequirement {
  roleName: string;
  count: number;
  isUnlimited?: boolean;
}

export interface ShiftSlot {
  id: string;
  day: string; // "週一" | "週二" | "週三" | "週四" | "週五" | "週六" | "週日"
  time: string; // e.g., "21:00 - 23:00"
  rolesRequired: SlotRoleRequirement[];
}

export interface StaffAvailability {
  staffId: string;
  // Key is slotId, value is the availability status
  preferences: Record<string, AvailabilityStatus>;
  // Key is slotId, value is specific note or time comment
  notes?: Record<string, string>;
}

export interface ScheduledShift {
  slotId: string;
  roleName: string;
  staffId: string; // The staff assigned to this role in this slot
  roleIndex?: number; // 0-based index to handle multiple counts of the same role
}

// Predefined default roles in Final Fantasy XIV roleplay clubs
export const FFXIV_RP_ROLES = [
  "Host / 陪聊 / 迎賓",
  "Bartender / 調酒師 / 點單",
  "DJ / 幻術師 / 配樂",
  "Security / 保安 / 維序",
  "Performer / 舞者 / 歌手",
  "Manager / 店長 / 領班",
] as const;

export const DAYS_OF_WEEK = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
