import React, { useState } from "react";
import { ShiftSlot, DAYS_OF_WEEK } from "../types";
import { CalendarClock, Plus, Minus, Trash2, ShieldQuestion, Edit2 } from "lucide-react";

interface SlotConfiguratorProps {
  slots: ShiftSlot[];
  onAddSlot: (slot: Omit<ShiftSlot, "id">) => void;
  onUpdateSlot: (slot: ShiftSlot) => void;
  onDeleteSlot: (id: string) => void;
  roles: string[];
}

export default function SlotConfigurator({
  slots,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  roles,
}: SlotConfiguratorProps) {
  const [day, setDay] = useState("週六");
  const [time, setTime] = useState("21:00 - 23:00");
  
  // Track counts for each FFXIV role in the slot we are adding or editing
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  // Track if a role is unlimited
  const [roleUnlimited, setRoleUnlimited] = useState<Record<string, boolean>>({});
  // Track whether we are editing an existing slot
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  React.useEffect(() => {
    setRoleCounts((prev) => {
      const next = { ...prev };
      roles.forEach((r) => {
        if (next[r] === undefined) {
          next[r] = r.startsWith("Host") || r.includes("陪聊") ? 2 : r.startsWith("Manager") || r.includes("店長") || r.startsWith("Bartender") || r.includes("調酒") ? 1 : 0;
        }
      });
      // Remove any roles that no longer exist
      Object.keys(next).forEach((key) => {
        if (!roles.includes(key)) {
          delete next[key];
        }
      });
      return next;
    });

    setRoleUnlimited((prev) => {
      const next = { ...prev };
      roles.forEach((r) => {
        if (next[r] === undefined) {
          next[r] = false;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!roles.includes(key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [roles]);

  const handleRoleCountChange = (role: string, change: number) => {
    setRoleCounts((prev) => {
      const current = prev[role] || 0;
      const next = Math.max(0, current + change);
      return { ...prev, [role]: next };
    });
  };

  const handleUnlimitedToggle = (role: string, checked: boolean) => {
    setRoleUnlimited((prev) => ({ ...prev, [role]: checked }));
    if (checked) {
      setRoleCounts((prev) => ({ ...prev, [role]: 1 }));
    }
  };

  const startEdit = (slot: ShiftSlot) => {
    setEditingSlotId(slot.id);
    setDay(slot.day);
    setTime(slot.time);

    const counts: Record<string, number> = {};
    const unlimited: Record<string, boolean> = {};

    // Initial base reset
    roles.forEach((r) => {
      counts[r] = 0;
      unlimited[r] = false;
    });

    slot.rolesRequired.forEach((req) => {
      counts[req.roleName] = req.count;
      unlimited[req.roleName] = !!req.isUnlimited;
    });

    setRoleCounts(counts);
    setRoleUnlimited(unlimited);
  };

  const cancelEdit = () => {
    setEditingSlotId(null);
    setTime("21:00 - 23:00");
    const counts: Record<string, number> = {};
    const unlimited: Record<string, boolean> = {};
    roles.forEach((r) => {
      counts[r] = r.startsWith("Host") || r.includes("陪聊") ? 2 : r.startsWith("Manager") || r.includes("店長") || r.startsWith("Bartender") || r.includes("調酒") ? 1 : 0;
      unlimited[r] = false;
    });
    setRoleCounts(counts);
    setRoleUnlimited(unlimited);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time.trim()) return;

    // Build the required roles list
    const rolesRequired = Object.entries(roleCounts)
      .filter(([roleName, count]) => (count as number) > 0 || !!roleUnlimited[roleName])
      .map(([roleName, count]) => ({
        roleName,
        count: roleUnlimited[roleName] ? 0 : (count as number),
        isUnlimited: !!roleUnlimited[roleName]
      }));

    if (editingSlotId) {
      onUpdateSlot({
        id: editingSlotId,
        day,
        time: time.trim(),
        rolesRequired,
      });
      setEditingSlotId(null);
    } else {
      onAddSlot({
        day,
        time: time.trim(),
        rolesRequired,
      });
    }

    // Reset some defaults
    setTime("21:00 - 23:00");
    setEditingSlotId(null);
    const initialCounts: Record<string, number> = {};
    const initialUnlimited: Record<string, boolean> = {};
    roles.forEach((r) => {
      initialCounts[r] = r.startsWith("Host") || r.includes("陪聊") ? 2 : r.startsWith("Manager") || r.includes("店長") || r.startsWith("Bartender") || r.includes("調酒") ? 1 : 0;
      initialUnlimited[r] = false;
    });
    setRoleCounts(initialCounts);
    setRoleUnlimited(initialUnlimited);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#D8D2C2] text-sm text-[#6D5F52] font-semibold">
        <p className="font-serif font-bold text-[#4A3D33] mb-1">⏰ 營業時段與編制需求規劃</p>
        <p className="leading-relaxed">
          請設定 RP 店家的預定開業營業時段（例如：每週六 21:00 - 23:00），
          並指定該時段的理想職員編制（例如：1 名 Bartender 調酒、2 名陪聊 Hosts、1 名 Manager 指揮）。排班算法會確保這些編制能公平調配給意願夥伴。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-1 bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-4">
          <h3 className="text-sm font-serif font-bold text-[#4A3D33] flex items-center gap-2">
            {editingSlotId ? (
              <>
                <Edit2 className="w-5 h-5 text-[#8B7355]" /> 編輯開業時段與班制
              </>
            ) : (
              <>
                <CalendarClock className="w-5 h-5 text-[#8B7355]" /> 新增開業時段與班制
              </>
            )}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-3xs font-bold text-[#8B7355] mb-1.5 uppercase tracking-widest">
                選擇星期
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`px-3 py-1 text-2xs font-bold rounded-lg border transition cursor-pointer ${
                      day === d
                        ? "bg-[#8B7355] border-transparent text-white"
                        : "bg-white border-[#D8D2C2] text-[#6D5F52] hover:bg-[#FAF9F6]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-3xs font-bold text-[#8B7355] mb-1.5 uppercase tracking-widest">
                開業時間區段 (Time Span)
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="例如: 21:00 - 23:00"
                className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#D8D2C2] text-[#4A3D33] font-semibold focus:ring-1 focus:ring-[#8B7355] outline-none"
              />
            </div>

            <div>
              <label className="block text-3xs font-bold text-[#8B7355] mb-3 uppercase tracking-widest">
                設定此時段之所需配編人數
              </label>
              <div className="space-y-2.5 bg-white p-3 rounded-xl border border-[#D8D2C2] max-h-64 overflow-y-auto">
                {roles.length === 0 ? (
                  <p className="text-2xs text-[#A19882] italic py-2 text-center">目前沒有設定任何職務。請先至「店員管理」新增自訂職務！</p>
                ) : (
                  roles.map((role) => {
                    const count = roleCounts[role] || 0;
                    const isUnlimited = !!roleUnlimited[role];
                    return (
                      <div key={role} className="flex items-center justify-between text-2xs font-semibold py-1.5 border-b border-[#D8D2C2]/20 last:border-0 animate-fadeIn">
                        <span className="text-[#4A3D33] max-w-28 truncate">
                          {role.split(" / ")[0]}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer text-3xs text-[#8B7355] select-none hover:text-[#4A3D33]">
                            <input
                              type="checkbox"
                              checked={isUnlimited}
                              onChange={(e) => handleUnlimitedToggle(role, e.target.checked)}
                              className="accent-[#8B7355] cursor-pointer"
                            />
                            <span className="font-bold">無上限</span>
                          </label>

                          <div className={`flex items-center gap-1.5 ${isUnlimited ? "opacity-30 pointer-events-none" : ""}`}>
                            <button
                              type="button"
                              onClick={() => handleRoleCountChange(role, -1)}
                              className="w-5.5 h-5.5 rounded bg-[#E7E0D3] hover:bg-[#D8D2C2] flex items-center justify-center text-[#4A3D33] transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className={`w-5 text-center font-bold ${count > 0 ? "text-[#8B7355]" : "text-[#A19882]"}`}>
                              {count}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRoleCountChange(role, 1)}
                              className="w-5.5 h-5.5 rounded bg-[#E7E0D3] hover:bg-[#D8D2C2] flex items-center justify-center text-[#4A3D33] transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!editingSlotId && Object.entries(roleCounts).every(([r, val]) => val === 0 && !roleUnlimited[r])}
                className="flex-1 py-2.5 px-3 text-xs font-bold rounded-lg text-white bg-[#8B7355] hover:bg-[#705D45] transition disabled:opacity-40 flex justify-center items-center gap-1 cursor-pointer shadow-sm animate-fadeIn"
              >
                {editingSlotId ? "確認修改開業時段" : "儲存並建檔此對應時段"}
              </button>
              {editingSlotId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="py-2.5 px-3 text-xs font-bold rounded-lg border border-[#D8D2C2] text-[#6D5F52] bg-white hover:bg-[#FAF9F6] transition cursor-pointer"
                >
                  取消
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List of slots Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-serif font-bold text-[#4A3D33]">
            🗓️ 已設定之開業時段名冊 ({slots.length})
          </h3>

          {slots.length === 0 ? (
            <div className="bg-[#FAF9F6] p-12 text-center text-[#A19882] rounded-2xl border border-[#D8D2C2] shadow-2xs">
              <ShieldQuestion className="w-10 h-10 mx-auto text-[#D8D2C2] mb-2" />
              <p className="text-xs">目前尚未設定任何開業時段。請利用左側欄位新增規劃！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => {
                const totalPersonnel = slot.rolesRequired.reduce((sum, item) => sum + (item.isUnlimited ? 0 : item.count), 0);
                const hasUnlimited = slot.rolesRequired.some(item => item.isUnlimited);
                
                return (
                  <div
                    key={slot.id}
                    className={`bg-[#FAF9F6] p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
                      editingSlotId === slot.id ? "ring-2 ring-[#8B7355] border-transparent" : "border-[#D8D2C2]"
                    }`}
                  >
                    <div>
                      {/* Slot Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#D8D2C2]/40">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-[#E7E0D3] border border-[#D8D2C2]/60 text-[#4A3D33]">
                            {slot.day}
                          </span>
                          <span className="font-bold text-xs text-[#4A3D33]">
                            {slot.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(slot)}
                            className="p-1 px-2 rounded hover:bg-[#E7E0D3] text-[#6D5F52] hover:text-[#4A3D33] transition cursor-pointer"
                            title="修改此開業時段與編制"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteSlot(slot.id)}
                            className="p-1 px-2 rounded hover:bg-rose-50 text-[#A19882] hover:text-rose-600 transition cursor-pointer"
                            title="刪除此開業時段"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Required Roles and Counts */}
                      <div className="space-y-1.5">
                        <span className="text-3xs font-bold text-[#A19882] tracking-widest block uppercase mb-1">
                          各角色職責需求編制
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {slot.rolesRequired.map((req) => (
                            <span
                              key={req.roleName}
                              className="px-2 py-1 rounded text-3xs font-bold bg-white border border-[#D8D2C2] text-[#6D5F52] flex items-center gap-1 shadow-2xs"
                            >
                              <span>{req.roleName.split(" / ")[0]}</span>
                              {req.isUnlimited ? (
                                <span className="bg-emerald-600 text-white font-black px-1.5 rounded-full text-[8px] scale-90">
                                  無上限
                                </span>
                              ) : (
                                <span className="bg-[#8B7355] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center text-[9px] scale-90">
                                  {req.count}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between text-3xs text-[#A19882] font-semibold">
                      <span>需求編制人數: <strong className="text-[#8B7355] font-bold">{totalPersonnel}{hasUnlimited ? "+α" : ""} 名</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
