import { Staff, ShiftSlot, StaffAvailability, FFXIV_RP_ROLES } from "./types";

export const DEFAULT_STAFF: Staff[] = [
  {
    id: "staff-1",
    name: "彌亞 (Miya)",
    roles: [FFXIV_RP_ROLES[0], FFXIV_RP_ROLES[5]], // Host, Manager
    maxShifts: 2,
  },
  {
    id: "staff-2",
    name: "艾莉絲 (Iris)",
    roles: [FFXIV_RP_ROLES[0], FFXIV_RP_ROLES[4]], // Host, Performer
    maxShifts: 2,
  },
  {
    id: "staff-3",
    name: "雷恩 (Leon)",
    roles: [FFXIV_RP_ROLES[1]], // Bartender
    maxShifts: 1,
  },
  {
    id: "staff-4",
    name: "塞爾溫 (Selwyn)",
    roles: [FFXIV_RP_ROLES[2], FFXIV_RP_ROLES[0]], // DJ, Host
    maxShifts: 2,
  },
  {
    id: "staff-5",
    name: "克勞德 (Cloud)",
    roles: [FFXIV_RP_ROLES[3], FFXIV_RP_ROLES[1]], // Security, Bartender
    maxShifts: 2,
  },
  {
    id: "staff-6",
    name: "蒂法 (Tifa)",
    roles: [FFXIV_RP_ROLES[0], FFXIV_RP_ROLES[1]], // Host, Bartender
    maxShifts: 2,
  },
  {
    id: "staff-7",
    name: "佐助 (Sasuke)",
    roles: [FFXIV_RP_ROLES[3]], // Security
    maxShifts: 1,
  },
  {
    id: "staff-8",
    name: "優娜 (Yuna)",
    roles: [FFXIV_RP_ROLES[4]], // Performer
    maxShifts: 1,
  }
];

export const DEFAULT_SLOTS: ShiftSlot[] = [
  {
    id: "slot-fri",
    day: "週五",
    time: "21:00 - 23:00",
    rolesRequired: [
      { roleName: FFXIV_RP_ROLES[5], count: 1 }, // Manager x1
      { roleName: FFXIV_RP_ROLES[1], count: 1 }, // Bartender x1
      { roleName: FFXIV_RP_ROLES[0], count: 3 }, // Host x3
      { roleName: FFXIV_RP_ROLES[2], count: 1 }, // DJ x1
      { roleName: FFXIV_RP_ROLES[3], count: 1 }, // Security x1
    ]
  },
  {
    id: "slot-sat",
    day: "週六",
    time: "21:00 - 23:30",
    rolesRequired: [
      { roleName: FFXIV_RP_ROLES[5], count: 1 }, // Manager x1
      { roleName: FFXIV_RP_ROLES[1], count: 2 }, // Bartender x2
      { roleName: FFXIV_RP_ROLES[0], count: 4 }, // Host x4
      { roleName: FFXIV_RP_ROLES[2], count: 1 }, // DJ x1
      { roleName: FFXIV_RP_ROLES[3], count: 1 }, // Security x1
      { roleName: FFXIV_RP_ROLES[4], count: 1 }, // Performer x1
    ]
  }
];

export const DEFAULT_AVAILABILITY: StaffAvailability[] = [
  {
    staffId: "staff-1",
    preferences: {
      "slot-fri": "available",
      "slot-sat": "available"
    }
  },
  {
    staffId: "staff-2",
    preferences: {
      "slot-fri": "available",
      "slot-sat": "available"
    }
  },
  {
    staffId: "staff-3",
    preferences: {
      "slot-fri": "available",
      "slot-sat": "maybe"
    }
  },
  {
    staffId: "staff-4",
    preferences: {
      "slot-fri": "maybe",
      "slot-sat": "available"
    }
  },
  {
    staffId: "staff-5",
    preferences: {
      "slot-fri": "available",
      "slot-sat": "available"
    }
  },
  {
    staffId: "staff-6",
    preferences: {
      "slot-fri": "unavailable",
      "slot-sat": "available"
    }
  },
  {
    staffId: "staff-7",
    preferences: {
      "slot-fri": "available",
      "slot-sat": "unavailable"
    }
  },
  {
    staffId: "staff-8",
    preferences: {
      "slot-fri": "unavailable",
      "slot-sat": "available"
    }
  }
];
