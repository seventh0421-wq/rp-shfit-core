import { Staff, ShiftSlot, StaffAvailability, ScheduledShift } from "../types";

export interface SolveResult {
  schedule: ScheduledShift[];
  diagnostics: {
    slotId: string;
    roleName: string;
    unfilledCount: number;
    reason: string;
  }[];
  staffShiftCounts: Record<string, number>;
}

export function autoSchedule(
  staffList: Staff[],
  slots: ShiftSlot[],
  availabilities: StaffAvailability[]
): SolveResult {
  const schedule: ScheduledShift[] = [];
  const diagnostics: SolveResult["diagnostics"] = [];
  const staffShiftCounts: Record<string, number> = {};

  // Initialize staff shift counts to 0
  staffList.forEach((s) => {
    staffShiftCounts[s.id] = 0;
  });

  // Create quick lookup for availabilities
  // key: staffId_slotId, value: "available" | "maybe" | "unavailable"
  const prefLookup: Record<string, string> = {};
  availabilities.forEach((avail) => {
    Object.entries(avail.preferences).forEach(([slotId, status]) => {
      prefLookup[`${avail.staffId}_${slotId}`] = status;
    });
  });

  // Helper to check if a staff can perform a role
  const canDoRole = (staff: Staff, roleName: string) => {
    return staff.roles.includes(roleName);
  };

  // Heuristic: Schedule slots with rarer roles first.
  // Let's count how many staff are available for each role overall to calculate "Rarity".
  const roleStaffCount: Record<string, number> = {};
  staffList.forEach((s) => {
    s.roles.forEach((r) => {
      roleStaffCount[r] = (roleStaffCount[r] || 0) + 1;
    });
  });

  // Sort slots: For each slot, sort its required roles by scarcity (rarer roles scheduled first)
  // Let's iterate through slots
  slots.forEach((slot) => {
    // Collect all role requirements we need to fulfill
    const reqs: { roleName: string; index: number }[] = [];
    slot.rolesRequired.forEach((req) => {
      for (let i = 0; i < req.count; i++) {
        reqs.push({ roleName: req.roleName, index: i });
      }
    });

    // Sort requirements by scarcest role first
    reqs.sort((a, b) => {
      const countA = roleStaffCount[a.roleName] || 999;
      const countB = roleStaffCount[b.roleName] || 999;
      return countA - countB; // lower count first (scarcerer)
    });

    // Track which staff are already assigned to this slot (cannot do double duty)
    const assignedInThisSlot = new Set<string>();

    reqs.forEach(({ roleName, index }) => {
      // Find eligible staff
      const candidates = staffList.filter((staff) => {
        // Must perform this role
        if (!canDoRole(staff, roleName)) return false;
        // Cannot be already assigned in this slot
        if (assignedInThisSlot.has(staff.id)) return false;
        // Must have room for more shifts
        if (staffShiftCounts[staff.id] >= staff.maxShifts) return false;

        const status = prefLookup[`${staff.id}_${slot.id}`] || "unavailable";
        return status === "available" || status === "maybe";
      });

      // Sort candidates to decide who is the best fit:
      // 1. Availability Status: "available" is preferred over "maybe"
      // 2. Fairness (Least loaded first, i.e., those who have done fewer shifts relative to their max)
      // 3. Or simply who has the lowest absolute number of assigned shifts currently
      candidates.sort((c1, c2) => {
        const pref1 = prefLookup[`${c1.id}_${slot.id}`] || "unavailable";
        const pref2 = prefLookup[`${c2.id}_${slot.id}`] || "unavailable";

        if (pref1 !== pref2) {
          return pref1 === "available" ? -1 : 1; // "available" first
        }

        // Less shifts assigned currently is preferred
        const current1 = staffShiftCounts[c1.id];
        const current2 = staffShiftCounts[c2.id];
        if (current1 !== current2) {
          return current1 - current2;
        }

        // Remaining quota (more quota is better)
        const rem1 = c1.maxShifts - current1;
        const rem2 = c2.maxShifts - current2;
        return rem2 - rem1; // larger remaining quota first
      });

      if (candidates.length > 0) {
        // Assign the best candidate
        const selected = candidates[0];
        schedule.push({
          slotId: slot.id,
          roleName,
          staffId: selected.id,
          roleIndex: index,
        });
        staffShiftCounts[selected.id]++;
        assignedInThisSlot.add(selected.id);
      } else {
        // No candidates found - document why in diagnostics
        const qualifiedStaff = staffList.filter((s) => canDoRole(s, roleName));
        let reason = "";

        if (qualifiedStaff.length === 0) {
          reason = `店裡沒有任何店員擁有此職能職務！請先到「店員管理」新增此角色職能的店員。`;
        } else {
          // See why qualified staff couldn't take this shift
          const explanationParts = qualifiedStaff.map((staff) => {
            const hasShiftRoom = staffShiftCounts[staff.id] < staff.maxShifts;
            const status = prefLookup[`${staff.id}_${slot.id}`] || "unavailable";
            const alreadyInSlot = assignedInThisSlot.has(staff.id);

            if (alreadyInSlot) {
              return `${staff.name}(此時段已擔任其他職務)`;
            }
            if (status === "unavailable") {
              return `${staff.name}(此時段無意願/不可排班)`;
            }
            if (!hasShiftRoom) {
              return `${staff.name}(排班數已達每週上限 ${staff.maxShifts} 次)`;
            }
            return `${staff.name}(其他限制)`;
          });
          reason = `符合職能的店員均無法排班：${explanationParts.join("、")}`;
        }

        diagnostics.push({
          slotId: slot.id,
          roleName,
          unfilledCount: 1,
          reason,
        });
      }
    });
  });

  return {
    schedule,
    diagnostics,
    staffShiftCounts,
  };
}
