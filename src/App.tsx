import { useState, useEffect } from "react";
import { Staff, ShiftSlot, StaffAvailability, ScheduledShift, FFXIV_RP_ROLES } from "./types";
import { DEFAULT_STAFF, DEFAULT_SLOTS, DEFAULT_AVAILABILITY } from "./defaultData";
import RosterManager from "./components/RosterManager";
import SlotConfigurator from "./components/SlotConfigurator";
import AvailabilityGrid from "./components/AvailabilityGrid";
import ScheduleBoard from "./components/ScheduleBoard";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  Github,
  Moon,
  Sun,
  ClipboardList,
  HelpCircle,
  BookOpen,
  X
} from "lucide-react";

function getWeekRangeLabel(weekId: string): string {
  const offset = weekId === "this_week" ? 0 : weekId === "next_week" ? 1 : 2;
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday + offset * 7);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const format = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  return `(${format(monday)} ~ ${format(sunday)})`;
}

export default function App() {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Main state with localStorage persistence
  const [currentRealTime, setCurrentRealTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentRealTime(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem("ffxiv_roster_staff");
    return saved ? JSON.parse(saved) : DEFAULT_STAFF;
  });

  const [slots, setSlots] = useState<ShiftSlot[]>(() => {
    const saved = localStorage.getItem("ffxiv_roster_slots");
    return saved ? JSON.parse(saved) : DEFAULT_SLOTS;
  });

  const [roles, setRoles] = useState<string[]>(() => {
    const saved = localStorage.getItem("ffxiv_roster_custom_roles");
    return saved ? JSON.parse(saved) : [...FFXIV_RP_ROLES];
  });

  const [selectedWeek, setSelectedWeek] = useState<"this_week" | "next_week" | "two_weeks_after">("this_week");

  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    const saved = localStorage.getItem("ffxiv_roster_tutorial_viewed");
    return saved !== "true";
  });

  const [tutorialStep, setTutorialStep] = useState<number>(0);

  const handleCloseTutorial = () => {
    localStorage.setItem("ffxiv_roster_tutorial_viewed", "true");
    setShowTutorial(false);
  };

  // Combined state dictionary for schedule & availabilities across weeks
  const [allWeeksData, setAllWeeksData] = useState<Record<string, { availabilities: StaffAvailability[], schedule: ScheduledShift[] }>>(() => {
    const saved = localStorage.getItem("ffxiv_roster_weeks_data");
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Fallback/migration loader
    const oldAvail = localStorage.getItem("ffxiv_roster_availabilities");
    const oldSched = localStorage.getItem("ffxiv_roster_schedule");
    
    const parsedAvails = oldAvail ? JSON.parse(oldAvail) : DEFAULT_AVAILABILITY;
    const parsedSched = oldSched ? JSON.parse(oldSched) : [];
    
    return {
      this_week: { availabilities: parsedAvails, schedule: parsedSched },
      next_week: { availabilities: parsedAvails, schedule: [] },
      two_weeks_after: { availabilities: parsedAvails, schedule: [] }
    };
  });

  const activeWeekData = allWeeksData[selectedWeek] || { availabilities: DEFAULT_AVAILABILITY, schedule: [] };
  const availabilities = activeWeekData.availabilities;
  const schedule = activeWeekData.schedule;

  const setAvailabilities = (arg: StaffAvailability[] | ((prev: StaffAvailability[]) => StaffAvailability[])) => {
    setAllWeeksData((prevWeeks) => {
      const currentVal = prevWeeks[selectedWeek]?.availabilities || DEFAULT_AVAILABILITY;
      const nextVal = typeof arg === "function" ? arg(currentVal) : arg;
      return {
        ...prevWeeks,
        [selectedWeek]: {
          ...prevWeeks[selectedWeek],
          availabilities: nextVal,
        },
      };
    });
  };

  const setSchedule = (arg: ScheduledShift[] | ((prev: ScheduledShift[]) => ScheduledShift[])) => {
    setAllWeeksData((prevWeeks) => {
      const currentVal = prevWeeks[selectedWeek]?.schedule || [];
      const nextVal = typeof arg === "function" ? arg(currentVal) : arg;
      return {
        ...prevWeeks,
        [selectedWeek]: {
          ...prevWeeks[selectedWeek],
          schedule: nextVal,
        },
      };
    });
  };

  const [activeTab, setActiveTab] = useState<"schedule" | "availability" | "staff" | "slots">("schedule");

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem("ffxiv_roster_staff", JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem("ffxiv_roster_slots", JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem("ffxiv_roster_custom_roles", JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem("ffxiv_roster_weeks_data", JSON.stringify(allWeeksData));
  }, [allWeeksData]);

  // Action Helpers
  const handleAddStaff = (newStaff: Omit<Staff, "id">) => {
    const id = `staff-${Date.now()}`;
    const staff: Staff = { id, ...newStaff };
    setStaffList((prev) => [...prev, staff]);
    // Also initialize preference set for this new staff member as blank
    setAvailabilities((prev) => [
      ...prev,
      { staffId: id, preferences: {} }
    ]);
  };

  const handleUpdateStaff = (updatedStaff: Staff) => {
    setStaffList((prev) => prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm("確定要刪除這位店員夥伴嗎？這將會清空其排班意願與當前班表紀錄。")) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      setAvailabilities((prev) => prev.filter((a) => a.staffId !== id));
      setSchedule((prev) => prev.filter((s) => s.staffId !== id));
    }
  };

  const handleAddSlot = (newSlot: Omit<ShiftSlot, "id">) => {
    const id = `slot-${Date.now()}`;
    const slot: ShiftSlot = { id, ...newSlot };
    setSlots((prev) => [...prev, slot]);
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("確定要刪除此開業時段與其對應的編制設定嗎？")) {
      setSlots((prev) => prev.filter((s) => s.id !== id));
      // Remove preferences maps associated with this slot id
      setAvailabilities((prev) =>
        prev.map((a) => {
          const nextPrefs = { ...a.preferences };
          delete nextPrefs[id];
          const nextNotes = a.notes ? { ...a.notes } : {};
          if (nextNotes) {
            delete nextNotes[id];
          }
          return { ...a, preferences: nextPrefs, notes: nextNotes };
        })
      );
      // Remove current schedule assignments in this deleted slot
      setSchedule((prev) => prev.filter((s) => s.slotId !== id));
    }
  };

  const handleUpdateSlot = (updatedSlot: ShiftSlot) => {
    setSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
  };

  // Change individual grid preference
  const handleChangePreference = (staffId: string, slotId: string, status: "available" | "maybe" | "unavailable") => {
    setAvailabilities((prev) => {
      const index = prev.findIndex((a) => a.staffId === staffId);
      if (index === -1) {
        // Create new
        const newRecord: StaffAvailability = {
          staffId,
          preferences: { [slotId]: status }
        };
        return [...prev, newRecord];
      }

      // Update existing
      const next = [...prev];
      next[index] = {
        ...next[index],
        preferences: {
          ...next[index].preferences,
          [slotId]: status
        }
      };
      return next;
    });
  };

  // Bulk overwrite from Excel or AI Parser
  const handleBatchUpdateAvailabilities = (updatedAvails: StaffAvailability[], updatedStaffList?: Staff[]) => {
    setAvailabilities(updatedAvails);
    if (updatedStaffList) {
      setStaffList(updatedStaffList);
    }
  };

  const handleAddRole = (newRoleName: string) => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    if (roles.includes(trimmed)) {
      alert("⚠️ 此職務名稱已存在！");
      return;
    }
    setRoles((prev) => [...prev, trimmed]);
  };

  const handleRenameRole = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return;
    if (roles.map(r => r.toLowerCase()).includes(trimmedNew.toLowerCase()) && trimmedNew.toLowerCase() !== oldName.toLowerCase()) {
      alert("⚠️ 新的職務名稱與現有的其他職務名稱重複了！");
      return;
    }

    setRoles((prev) => prev.map((r) => (r === oldName ? trimmedNew : r)));

    setStaffList((prevStaff) =>
      prevStaff.map((staff) => ({
        ...staff,
        roles: staff.roles.map((r) => (r === oldName ? trimmedNew : r)),
      }))
    );

    setSlots((prevSlots) =>
      prevSlots.map((slot) => ({
        ...slot,
        rolesRequired: slot.rolesRequired.map((req) =>
          req.roleName === oldName ? { ...req, roleName: trimmedNew } : req
        ),
      }))
    );

    setAllWeeksData((prevWeeks) => {
      const nextWeeks = { ...prevWeeks };
      Object.keys(nextWeeks).forEach((weekId) => {
        const week = nextWeeks[weekId];
        if (week && week.schedule) {
          nextWeeks[weekId] = {
            ...week,
            schedule: week.schedule.map((shift) =>
              shift.roleName === oldName ? { ...shift, roleName: trimmedNew } : shift
            ),
          };
        }
      });
      return nextWeeks;
    });
  };

  const handleDeleteRole = (roleToDelete: string) => {
    if (
      !confirm(
        `確定要刪除「${roleToDelete}」職務嗎？\n這將會：\n1. 從所有店員夥伴的擅長職務中移除此職能\n2. 從所有營業時段將此編制需求計畫移除\n3. 從所有目前班表中撤銷此職務的排班。`
      )
    ) {
      return;
    }

    setRoles((prev) => prev.filter((r) => r !== roleToDelete));

    setStaffList((prevStaff) =>
      prevStaff.map((staff) => ({
        ...staff,
        roles: staff.roles.filter((r) => r !== roleToDelete),
      }))
    );

    setSlots((prevSlots) =>
      prevSlots.map((slot) => ({
        ...slot,
        rolesRequired: slot.rolesRequired.filter((req) => req.roleName !== roleToDelete),
      }))
    );

    setAllWeeksData((prevWeeks) => {
      const nextWeeks = { ...prevWeeks };
      Object.keys(nextWeeks).forEach((weekId) => {
        const week = nextWeeks[weekId];
        if (week && week.schedule) {
          nextWeeks[weekId] = {
            ...week,
            schedule: week.schedule.filter((shift) => shift.roleName !== roleToDelete),
          };
        }
      });
      return nextWeeks;
    });
  };

  // Reset to original immersive demonstration dataset
  const handleRestoreDefaults = () => {
    if (confirm("這將會覆蓋您目前的設定與修改，重置回 FFXIV 預設營業店面（星芒酒吧）的示範數據。確定嗎？")) {
      setStaffList(DEFAULT_STAFF);
      setSlots(DEFAULT_SLOTS);
      setRoles([...FFXIV_RP_ROLES]);
      setAllWeeksData({
        this_week: { availabilities: DEFAULT_AVAILABILITY, schedule: [] },
        next_week: { availabilities: DEFAULT_AVAILABILITY, schedule: [] },
        two_weeks_after: { availabilities: DEFAULT_AVAILABILITY, schedule: [] }
      });
      setSelectedWeek("this_week");
      setActiveTab("schedule");
    }
  };

  const handleClearAll = () => {
    if (confirm("確定要清空所有資料（店員名冊、營業時段、意願設定）以重新開始建立您專屬的店家嗎？")) {
      setStaffList([]);
      setSlots([]);
      setRoles([]);
      setAllWeeksData({
        this_week: { availabilities: [], schedule: [] },
        next_week: { availabilities: [], schedule: [] },
        two_weeks_after: { availabilities: [], schedule: [] }
      });
      setSelectedWeek("this_week");
      setActiveTab("staff");
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#F5F2ED] text-[#4A3D33] transition-colors duration-200">
      {/* Upper Navigation Strip Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#D8D2C2]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand Brandings */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center bg-[#8B7355]/5 border border-[#8B7355]/15 rounded-xl p-1 shadow-2xs">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer celestial rings */}
                <circle cx="50" cy="50" r="44" stroke="#8B7355" strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
                <circle cx="50" cy="50" r="38" stroke="#8B7355" strokeWidth="1" opacity="0.4" />
                <circle cx="50" cy="50" r="32" stroke="#8B7355" strokeWidth="2.5" />
                
                {/* Diagonal orbit line */}
                <path d="M15 85 C 30 70, 70 30, 85 15" stroke="#8B7355" strokeWidth="2" strokeLinecap="round" />
                <path d="M25 85 C 35 60, 60 35, 85 25" stroke="#8B7355" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

                {/* Sparkling Astrolabe center stars */}
                <path d="M50 12 L54 36 L78 40 L54 44 L50 68 L46 44 L22 40 L46 36 Z" fill="#8B7355" />
                <path d="M50 20 L52 38 L68 40 L52 42 L50 60 L48 42 L32 40 L48 38 Z" fill="#E8D8C8" />
                
                {/* Cute small satellite stars */}
                <circle cx="28" cy="28" r="3" fill="#8B7355" />
                <circle cx="72" cy="72" r="3" fill="#8B7355" />
                <circle cx="76" cy="28" r="2.5" fill="#8B7355" opacity="0.6" />
                <circle cx="24" cy="72" r="2.5" fill="#8B7355" opacity="0.6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[#4A3D33] flex items-center gap-2 flex-wrap">
                <span>FFXIV TC RP店排班助手｜ShiftCore</span>
                <span className="bg-[#8B7355]/10 text-[#8B7355] font-bold px-2 py-0.5 rounded-lg text-xs font-sans">
                  RP
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-[#A19882] font-bold tracking-widest uppercase">
                Final Fantasy XIV RP Shop Management
              </p>
            </div>
          </div>

          {/* Action Operations */}
          <div className="flex items-center gap-3">
            {currentRealTime && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#8B7355] bg-[#8B7355]/5 border border-[#8B7355]/15 py-1 px-2.5 rounded-lg select-none">
                <Clock className="w-3.5 h-3.5 text-[#8B7355]/80 animate-pulse" />
                <span>{currentRealTime}</span>
              </div>
            )}
            <button
              onClick={() => setShowTutorial(true)}
              className="py-1 px-3 text-[10px] flex items-center gap-1 font-bold rounded-lg border border-[#8B7355]/30 bg-[#8B7355]/5 hover:bg-[#8B7355]/10 text-[#8B7355] transition"
              title="查看使用教學與引導"
            >
              <BookOpen className="w-3.5 h-3.5 animate-bounce" /> 使用教學
            </button>
            <button
              onClick={handleRestoreDefaults}
              className="py-1 px-3 text-[10px] items-center gap-1 font-bold rounded-lg border border-[#D8D2C2] bg-white hover:bg-[#FAF9F6] text-[#8B7355] hover:text-[#705D45] transition hidden lg:flex"
              title="載入預設示範數據"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 載入示範數據
            </button>
            <button
              onClick={handleClearAll}
              className="py-1 px-3 text-[10px] font-bold rounded-lg border border-[#D8D2C2] bg-white hover:bg-red-50 text-[#A19882] hover:text-red-600 transition hidden lg:inline"
              title="清除所有本地資料以自建店家"
            >
              全新起步
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-[#A19882] hover:text-[#4A3D33] hover:bg-[#FAF9F6] transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#D4AF37]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="w-full flex border-b border-[#D8D2C2] overflow-x-auto no-scrollbar scroll-smooth">
          {(
            [
              { id: "schedule", label: "綜合排班班表", icon: CalendarDays },
              { id: "availability", label: "夥伴排班意願 & AI 導入", icon: ClipboardList },
              { id: "staff", label: "店員夥伴管理", icon: Users },
              { id: "slots", label: "營業時段 & 編制設定", icon: Clock }
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-5 text-xs font-bold whitespace-nowrap border-b-2 flex items-center gap-2 transition-all relative ${
                  isActive
                    ? "border-[#8B7355] text-[#8B7355]"
                    : "border-transparent text-[#A19882] hover:text-[#4A3D33]"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Weekly Scheduler Scope Selector banner */}
        <div className="bg-[#FAF9F6] border border-[#D8D2C2] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs select-none">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-[9px] font-extrabold uppercase bg-[#8B7355]/10 text-[#8B7355] px-2 py-0.5 rounded-md inline-block tracking-wider">
              📅 預排時光沙漏 • WEEK PLANNER
            </div>
            <h4 className="text-xs font-serif font-bold text-[#4A3D33] flex items-center justify-center sm:justify-start gap-1.5 animate-pulse">
              <span>目前規劃週次：</span>
              <span className="text-[#8B7355] underline decoration-[#8B7355]/40 underline-offset-4 font-bold">
                {selectedWeek === "this_week" ? "【本週班表】" : selectedWeek === "next_week" ? "【下週預排】" : "【下下週預排】"}
                {getWeekRangeLabel(selectedWeek)}
              </span>
            </h4>
          </div>
          <div className="flex items-center gap-2">
            {(
              [
                { id: "this_week", label: "🗓️ 本週排班" },
                { id: "next_week", label: "⏩ 下週預排" },
                { id: "two_weeks_after", label: "⏭️ 下下週預排" }
              ] as const
            ).map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWeek(w.id)}
                className={`py-1.5 px-3 text-[11px] font-bold rounded-xl border transition cursor-pointer select-none active:scale-95 ${
                  selectedWeek === w.id
                    ? "bg-[#8B7355] text-white border-transparent shadow-sm"
                    : "bg-white text-[#8B7355] border-[#D8D2C2] hover:bg-[#FAF9F6]"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Tab Renderer with Motion React Animations */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "schedule" && (
                <ScheduleBoard
                  staffList={staffList}
                  slots={slots}
                  availabilities={availabilities}
                  schedule={schedule}
                  onUpdateSchedule={setSchedule}
                  selectedWeek={selectedWeek}
                />
              )}
              {activeTab === "availability" && (
                <AvailabilityGrid
                  staffList={staffList}
                  slots={slots}
                  availabilities={availabilities}
                  onChangePreference={handleChangePreference}
                  onBatchUpdate={handleBatchUpdateAvailabilities}
                  selectedWeek={selectedWeek}
                  roles={roles}
                />
              )}
              {activeTab === "staff" && (
                <RosterManager
                  staffList={staffList}
                  onAddStaff={handleAddStaff}
                  onUpdateStaff={handleUpdateStaff}
                  onDeleteStaff={handleDeleteStaff}
                  roles={roles}
                  onAddRole={handleAddRole}
                  onRenameRole={handleRenameRole}
                  onDeleteRole={handleDeleteRole}
                />
              )}
              {activeTab === "slots" && (
                <SlotConfigurator
                  slots={slots}
                  onAddSlot={handleAddSlot}
                  onUpdateSlot={handleUpdateSlot}
                  onDeleteSlot={handleDeleteSlot}
                  roles={roles}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer System Credits */}
      <footer className="py-12 bg-[#FAF9F6] border-t border-[#D8D2C2] text-center text-3xs text-[#A19882] font-semibold">
        <div className="w-full max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 FF14 曉月排班助手 & 最佳排班演算面板. Inspired by Sharlayan Bureau of Logistical Distribution</p>
          <p>
            排定演算法支持店員最大排班上限限制、公平分配以及職能專長衝突檢測。本工具與《最終幻想XIV》官方廣場及 Square Enix 無關。
          </p>
        </div>
      </footer>

      {/* Tutorial Interactive Modal Guide */}
      <AnimatePresence>
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#FAF9F6] dark:bg-[#1C1814] border-2 border-[#8B7355] dark:border-[#D4AF37]/50 text-[#4A3D33] dark:text-[#E8D8C8] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col font-sans relative"
              id="tutorial_modal_popup"
            >
              {/* Top border decor */}
              <div className="absolute top-1 left-1 right-1 bottom-1 border border-[#8B7355]/30 dark:border-[#D4AF37]/20 rounded-xl pointer-events-none"></div>

              {/* Header section with astrolabe icon and title */}
              <div className="p-6 pb-4 border-b border-[#D8D2C2] dark:border-[#4A3D33]/60 bg-white dark:bg-[#25201A] flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-[#8B7355]/10 rounded-xl border border-[#8B7355]/20">
                    <BookOpen className="w-5 h-5 text-[#8B7355] dark:text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-serif font-black tracking-wide text-[#4A3D33] dark:text-[#E8D8C8]">
                      ✦ 曉月智能排班助手使用教學 ✦
                    </h3>
                    <p className="text-[10px] text-[#8B7355] dark:text-[#D4AF37] font-bold tracking-widest uppercase">
                      ShiftCore Quick Start Guide
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseTutorial}
                  className="p-1.5 rounded-lg hover:bg-[#FAF9F6] dark:hover:bg-[#322A22] text-[#A19882] hover:text-[#4A3D33] dark:hover:text-[#E8D8C8] transition cursor-pointer"
                  title="關閉教學"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Stepper Pills */}
              <div className="px-6 py-3 bg-[#FAF8F3] dark:bg-[#1E1915] border-b border-[#D8D2C2]/40 flex justify-between items-center relative z-10 text-2xs">
                <span className="font-serif font-black text-[#8B7355] dark:text-[#D4AF37]">
                  第 {tutorialStep + 1} 步 / 共 4 步
                </span>
                <div className="flex items-center gap-1.5 md:gap-3">
                  {[0, 1, 2, 3].map((stepIdx) => {
                    const stepLabels = ["店員職務", "時段編制", "意願填報", "智能排班"];
                    const isActive = stepIdx === tutorialStep;
                    const isPassed = stepIdx < tutorialStep;
                    return (
                      <button
                        key={stepIdx}
                        onClick={() => setTutorialStep(stepIdx)}
                        className={`px-2.5 py-1 rounded-full text-3xs font-bold transition flex items-center gap-1 ${
                          isActive
                            ? "bg-[#4A3D33] dark:bg-[#D4AF37] text-white dark:text-[#1C1814]"
                            : isPassed
                            ? "bg-[#8B7355]/25 text-[#4A3D33] dark:text-[#B3936B] line-through decoration-transparent"
                            : "bg-white dark:bg-[#2A241E] text-[#A19882] border border-[#D8D2C2] dark:border-[#4A3D33]"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] bg-black/10 dark:bg-white/10 font-mono font-bold">
                          {stepIdx + 1}
                        </span>
                        <span className="hidden sm:inline">{stepLabels[stepIdx]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[380px] bg-white dark:bg-[#1E1915] relative z-10 text-xs text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed space-y-4">
                {tutorialStep === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#D8D2C2]/50 pb-2">
                      <span className="bg-[#8B7355] text-white rounded px-2 py-0.5 text-3xs font-bold font-mono">STEP 1</span>
                      <h4 className="text-sm font-serif font-bold text-[#4A3D33] dark:text-[#E8D8C8]">
                        店員夥伴角色名冊 & 職務自訂 (店長專用)
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➊</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">新增 / 自訂店務角色</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            我們在「店員夥伴管理」面板下右側特別新增了<strong>【職務角色自訂】</strong>，店長們可以新增專屬客製化職務（例如：「舞者 / Dancer」、「公關 / Butler」、「保安 / Staff」 等），並且在該面板點擊雙擊名稱進行**更改名稱**，或者點擊圖示進行**直接刪除**！
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➋</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">登記夥伴名冊與可任職務</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            在表單輸入夥伴的名字、勾選夥伴所能勝任的所有職務角色，並設定該夥伴<strong>【每週最大排班天數】</strong>（例如：雅修特拉雖然能做 Host 跟調酒，但她一週只想上一天班，最大班數即可設為 1）。演算法會絕對遵守這項設定，絕不使任何員工過勞！
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tutorialStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#D8D2C2]/50 pb-2">
                      <span className="bg-[#8B7355] text-white rounded px-2 py-0.5 text-3xs font-bold font-mono">STEP 2</span>
                      <h4 className="text-sm font-serif font-bold text-[#4A3D33] dark:text-[#E8D8C8]">
                        營業時段建立與人力編制需求
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➊</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">自由規劃開業時間點</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            切換至「營業時段 & 編制設定」分頁，店長可以建立任意開業時段（例如「週五 21:00 - 23:00」、「週六 20:00 - 22:30」）。
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➋</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">微調各時段的人力編制</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            針對每一個建立好的時間點調整人力配额。例如在「週六」派發「調酒 x 1」、「接待人員 x 3」、「DJ音樂 x 1」。智能排班主機將依照此目標人數，完美配對符合對應專長職能的夥伴。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tutorialStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#D8D2C2]/50 pb-2">
                      <span className="bg-[#8B7355] text-white rounded px-2 py-0.5 text-3xs font-bold font-mono">STEP 3</span>
                      <h4 className="text-sm font-serif font-bold text-[#4A3D33] dark:text-[#E8D8C8]">
                        夥伴排班意願 & 創新的 AI 純文字導入
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➊</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">互動意願棋盤手動填寫</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            在「夥伴排班意願 & AI 導入」中，可以以極佳的觸控與點擊手動為每位夥伴填寫意願，以這三種狀態循環切換：🟢 意願極佳、🟡 備用/可能、🔴 不行/不利。
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➋</div>
                        <div>
                          <strong className="text-emerald-600 dark:text-emerald-400 block font-bold mb-0.5">✦ AI 意願一鍵整批導入 (店長殺手級救星！)</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            夥伴通常在 Discord 或 LINE 群組丟下一句排班文字（例如：「桑克雷德：六可、日不可、五可能」），傳統店長只能人工緩慢對照點选。
                            現在您只需<strong>一併複製大家丟出來的所有發言</strong>，貼入<strong>【AI 一鍵解析助理】</strong>输入框中，AI 演算法不論其排版混亂，均會自適應一秒解析，快速完成整批意願儲存！
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tutorialStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#D8D2C2]/50 pb-2">
                      <span className="bg-[#8B7355] text-white rounded px-2 py-0.5 text-3xs font-bold font-mono">STEP 4</span>
                      <h4 className="text-sm font-serif font-bold text-[#4A3D33] dark:text-[#E8D8C8]">
                        一鍵生成班表、海報與公報匯出
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➊</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">一鍵智能自適應配對</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            回到「綜合排班班表」分頁，點擊「一鍵智能自適應排班」！演算法核心將自主考量夥伴意願高低、符合之職能專長、其每週上限不超載、與夥伴排班公平性等。如果有無法妥妥配齊的職缺，系統會自動在下方警報 logs 提示，方便您快速了解缺編。
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➋</div>
                        <div>
                          <strong className="text-[#4A3D33] dark:text-[#E8D8C8] block font-bold mb-0.5">手動下拉選選微調 ＆ 自訂店名</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            班表上的任何一格都支援下拉式調整。下方在「自訂店名」輸入您親愛的 FFXIV 店名，系統宣傳海報及 Discord 文本就會完全自適應套用！
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 items-start bg-[#FAF9F6] dark:bg-[#25201A] p-3 rounded-xl border border-[#D8D2C2]/50">
                        <div className="w-5 h-5 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-[#8B7355] font-serif font-bold scale-90 shrink-0 mt-0.5">➌</div>
                        <div>
                          <strong className="text-amber-605 dark:text-amber-400 block font-bold mb-0.5">精美海報圖片下載 & 一鍵拷貝 Discord 文案</strong>
                          <p className="text-[#6D5F52] dark:text-[#C5B5A5] leading-relaxed">
                            右側海報看版具有 FFXIV 典雅高逼格的寫真質感底色與密封印章，包含精確實時世界時間（捕光捕捉）。店長可一鍵拷貝為您排版好的 Discord 文字公告、甚至點擊「經典復古海報圖片下載」大圖片，直接丟宣傳群，宣傳效果直接拉滿！
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Nav Actions Bar */}
              <div className="px-6 py-4 border-t border-[#D8D2C2] dark:border-[#4A3D33]/60 bg-[#FAF8F3] dark:bg-[#1E1915] flex items-center justify-between relative z-10">
                <span className="text-[10px] md:text-2xs text-[#A19882] flex items-center gap-1 font-bold">
                  <span>✓ 永久儲存：</span>
                  <span className="text-[#8B7355] dark:text-[#D4AF37]">資料保存在這台瀏覽器，請安心填寫！</span>
                </span>
                
                <div className="flex items-center gap-2">
                  {tutorialStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setTutorialStep((prev) => prev - 1)}
                      className="px-3 py-1.5 text-xs text-[#6D5F52] hover:text-[#4A3D33] font-bold rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      上一步
                    </button>
                  )}
                  {tutorialStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setTutorialStep((prev) => prev + 1)}
                      className="px-4 py-1.5 text-xs text-white bg-[#8B7355] hover:bg-[#705D45] font-bold rounded-lg transition cursor-pointer shadow-xs"
                    >
                      下一步
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseTutorial}
                      className="px-5 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      開始體驗我們的助手 ✦
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
