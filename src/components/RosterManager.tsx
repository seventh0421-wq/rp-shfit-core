import React, { useState } from "react";
import { Staff } from "../types";
import { UserPlus, Trash2, Edit2, BadgeAlert, ShieldAlert, Check, Plus, Settings2, X, Edit, Save } from "lucide-react";

interface RosterManagerProps {
  staffList: Staff[];
  onAddStaff: (staff: Omit<Staff, "id">) => void;
  onUpdateStaff: (staff: Staff) => void;
  onDeleteStaff: (id: string) => void;
  roles: string[];
  onAddRole: (role: string) => void;
  onRenameRole: (oldName: string, newName: string) => void;
  onDeleteRole: (role: string) => void;
}

export default function RosterManager({
  staffList,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  roles,
  onAddRole,
  onRenameRole,
  onDeleteRole,
}: RosterManagerProps) {
  const [name, setName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [maxShifts, setMaxShifts] = useState(2);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // States for role management UI
  const [newRoleInput, setNewRoleInput] = useState("");
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");

  // Form handling
  const handleRoleToggle = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStaffId) {
      onUpdateStaff({
        id: editingStaffId,
        name: name.trim(),
        roles: selectedRoles,
        maxShifts,
      });
      setEditingStaffId(null);
    } else {
      onAddStaff({
        name: name.trim(),
        roles: selectedRoles,
        maxShifts,
      });
    }

    // Reset form
    setName("");
    setSelectedRoles([]);
    setMaxShifts(2);
  };

  const startEdit = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setName(staff.name);
    setSelectedRoles(staff.roles);
    setMaxShifts(staff.maxShifts);
  };

  const cancelEdit = () => {
    setEditingStaffId(null);
    setName("");
    setSelectedRoles([]);
    setMaxShifts(2);
  };

  return (
    <div className="space-y-6">
      {/* Headings & Info */}
      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#D8D2C2] text-sm text-[#6D5F52] font-semibold">
        <p className="font-serif font-bold text-[#4A3D33] mb-1">🎭 RP 店員職務與店務運作設定</p>
        <p className="leading-relaxed">
          在此管理您店裡的所有 RP 店員夥伴。您可以新增夥伴並設定他們所擅長的 RP 工作職能（例如調酒、陪聊表演者、DJ 音控等），
          並規定他們每週最高限制排班頻率。多角色演繹的夥伴，排班器會優先調配至其最合適的空缺崗位。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column wrapper containing both forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* Editor Form Panel */}
          <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-4">
          <h3 className="text-sm font-serif font-bold text-[#4A3D33] flex items-center gap-2">
            {editingStaffId ? (
              <>
                <Edit2 className="w-4 h-4 text-[#8B7355]" /> 編輯夥伴檔案
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-[#8B7355]" /> 登記新夥伴店員
              </>
            )}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#8B7355] mb-1.5 uppercase tracking-wider">
                夥伴名字 / 角色 ID (如: Y'shtola Rhul)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入 RP 角色名稱..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#D8D2C2] text-[#4A3D33] font-semibold focus:ring-1 focus:ring-[#8B7355] outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#8B7355] uppercase tracking-wider">
                  可任職務職能（可複選）
                </label>
                {roles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRoles.length === roles.length) {
                        setSelectedRoles([]);
                      } else {
                        setSelectedRoles([...roles]);
                      }
                    }}
                    className="text-3xs text-[#8B7355] hover:text-[#4A3D33] font-extrabold border border-[#D8D2C2] rounded px-1.5 py-0.5 bg-white shadow-2xs cursor-pointer select-none transition active:scale-95"
                  >
                    {selectedRoles.length === roles.length ? "取消全選" : "全選"}
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {roles.length === 0 ? (
                  <p className="text-2xs text-[#A19882] italic py-2">目前沒有設定任何職務名稱，請先新增職務名稱。</p>
                ) : (
                  roles.map((role) => {
                    const isChecked = selectedRoles.includes(role);
                    return (
                      <label
                        key={role}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-2xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? "bg-[#8B7355] border-transparent text-white"
                            : "bg-white border-[#D8D2C2] text-[#6D5F52] hover:bg-[#FAF9F6]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleRoleToggle(role)}
                          className="hidden"
                        />
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-[#4A3D33] border-transparent text-white"
                              : "border-[#D8D2C2] bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span>{role}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedRoles.length === 0 && (
                <p className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1 font-bold">
                  <BadgeAlert className="w-3.5 h-3.5" /> ⚠️ 請為夥伴挑選至少一項職能項目。
                </p>
              )}
            </div>

            <div>
              <label className="block text-2xs font-bold text-[#8B7355] mb-1.5 flex justify-between uppercase">
                <span>每週受領班數上限</span>
                <span className="font-bold text-[#4A3D33] bg-[#E7E0D3] px-2 py-0.5 rounded text-3xs">{maxShifts} 班</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxShifts}
                onChange={(e) => setMaxShifts(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#E7E0D3] rounded-lg appearance-none cursor-pointer accent-[#8B7355]"
              />
              <div className="flex justify-between text-[10px] text-[#A19882] mt-1 font-semibold">
                <span>1 次 (偶爾演出)</span>
                <span>5 次 (全勤全能)</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                disabled={!name.trim() || selectedRoles.length === 0}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-lg text-white bg-[#8B7355] hover:bg-[#705D45] transition disabled:opacity-40 cursor-pointer shadow-sm"
              >
                {editingStaffId ? "確認儲存" : "加入排班名冊"}
              </button>
              {editingStaffId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="py-2 px-3 text-xs font-bold rounded-lg border border-[#D8D2C2] text-[#6D5F52] bg-white hover:bg-[#FAF9F6] transition cursor-pointer"
                >
                  取消
                </button>
              )}
            </div>
          </form>
          </div>

          {/* Card 2: 職務名稱管理 (店長專用) */}
          <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#4A3D33] flex items-center justify-between border-b border-[#D8D2C2]/40 pb-2">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#8B7355]" /> 職務角色自訂（店長專用）
              </span>
              <span className="text-[10px] font-bold text-[#8B7355] bg-[#8B7355]/10 px-2 py-0.5 rounded-md">
                {roles.length} 種職務
              </span>
            </h3>

            {/* Add Role Mini-Form */}
            <div className="space-y-2">
              <label className="block text-3xs font-bold text-[#8B7355] uppercase tracking-wider">
                新增職務名稱 (如: VIP接待 / 調香師)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  placeholder="請輸入欲新增之職務名稱..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white border border-[#D8D2C2] text-[#4A3D33] font-semibold focus:ring-1 focus:ring-[#8B7355] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newRoleInput.trim()) {
                        onAddRole(newRoleInput);
                        setNewRoleInput("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newRoleInput.trim()) {
                      onAddRole(newRoleInput);
                      setNewRoleInput("");
                    }
                  }}
                  disabled={!newRoleInput.trim()}
                  className="py-1.5 px-3 text-xs font-bold rounded-lg text-white bg-[#8B7355] hover:bg-[#705D45] transition disabled:opacity-40 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> 新增
                </button>
              </div>
            </div>

            {/* Roles List with Edit/Delete Interactions */}
            <div className="space-y-2">
              <span className="block text-3xs font-bold text-[#A19882] tracking-wider uppercase mb-1">
                現行職能列表 (雙擊名稱即可變更名稱)
              </span>
              
              {roles.length === 0 ? (
                <p className="text-2xs text-[#A19882] italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-[#D8D2C2]">
                  目前查無任何職務，請於上方新增職務項目。
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {roles.map((role) => {
                    const isEditing = editingRoleName === role;
                    return (
                      <div
                        key={role}
                        className="flex items-center justify-between p-2 rounded-lg border border-[#D8D2C2] bg-white text-2xs font-semibold group hover:bg-[#FAF9F6] transition"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingRoleValue}
                              onChange={(e) => setEditingRoleValue(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs rounded bg-[#FAF9F6] border border-[#8B7355] text-[#4A3D33] font-semibold outline-none animate-fadeIn"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  onRenameRole(role, editingRoleValue);
                                  setEditingRoleName(null);
                                } else if (e.key === "Escape") {
                                  setEditingRoleName(null);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onRenameRole(role, editingRoleValue);
                                setEditingRoleName(null);
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="確認變更"
                            >
                              <Save className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoleName(null)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title="取消"
                            >
                              <X className="w-3.5 h-3.5 text-rose-600" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className="text-[#4A3D33] cursor-pointer hover:underline"
                              onDoubleClick={() => {
                                setEditingRoleName(role);
                                setEditingRoleValue(role);
                              }}
                              title="按兩下可直接編輯"
                            >
                              {role}
                            </span>
                            <div className="flex items-center gap-1 opacity-65 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoleName(role);
                                  setEditingRoleValue(role);
                                }}
                                className="p-1 hover:bg-[#E7E0D3] text-[#6D5F52] hover:text-[#4A3D33] rounded"
                                title="編輯名稱"
                              >
                                <Edit className="w-3 h-3 text-[#6D5F52]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteRole(role)}
                                className="p-1 hover:bg-rose-50 text-[#A19882] hover:text-[#rose-600] rounded"
                                title="刪除此職務"
                              >
                                <Trash2 className="w-3 h-3 text-[darkred]" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Staff Table Panel */}
        <div className="lg:col-span-2 bg-[#FAF9F6] rounded-2xl border border-[#D8D2C2] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D8D2C2] flex justify-between items-center">
            <h3 className="text-sm font-serif font-bold text-[#4A3D33]">
              🌟 註冊店員名冊 ({staffList.length} 位)
            </h3>
          </div>

          <div className="overflow-x-auto">
            {staffList.length === 0 ? (
              <div className="p-12 text-center text-[#A19882]">
                <ShieldAlert className="w-10 h-10 mx-auto text-[#D8D2C2] mb-2" />
                <p className="text-xs">目前名冊尚未建立任何夥伴，快在左側將夥伴店員登記進來吧！</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-[#4A3D33]">
                <thead className="text-2xs uppercase text-[#4A3D33] bg-[#E7E0D3] border-b border-[#D8D2C2] font-semibold">
                  <tr>
                    <th className="px-5 py-3 font-serif font-bold">店員店名 / 姓名</th>
                    <th className="px-5 py-3 font-serif font-bold">擅長職務類型</th>
                    <th className="px-5 py-3 font-serif font-bold text-center">每週排班最高次數</th>
                    <th className="px-5 py-3 font-serif font-bold text-right text-3xs">管理</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2C2]/40 bg-white">
                  {staffList.map((staff) => (
                    <tr
                      key={staff.id}
                      className={`hover:bg-[#FAF9F6]/50 transition ${
                        editingStaffId === staff.id ? "bg-[#E7E0D3]/30" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-bold text-[#4A3D33]">
                        {staff.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {staff.roles.map((role) => (
                            <span
                              key={role}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF9F6] text-[#6D5F52] border border-[#D8D2C2]"
                            >
                              {role.split(" / ")[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-[#8B7355]">
                        {staff.maxShifts} 班
                      </td>
                      <td className="px-5 py-3.5 text-right flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(staff)}
                          className="p-1.5 px-2.5 rounded hover:bg-[#E7E0D3] text-[#6D5F52] hover:text-[#4A3D33] transition cursor-pointer"
                          title="修改檔案"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteStaff(staff.id)}
                          className="p-1.5 px-2.5 rounded hover:bg-rose-50 text-[#A19882] hover:text-rose-600 transition cursor-pointer"
                          title="刪除夥伴"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
