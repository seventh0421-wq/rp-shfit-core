import React, { useState, useEffect, useRef } from "react";
import { Staff, ShiftSlot, ScheduledShift, FFXIV_RP_ROLES } from "../types";
import { autoSchedule } from "../utils/solver";
import { Play, Copy, Check, Users, ShieldAlert, Award, FileText, Sparkles, HelpCircle, Image, Download } from "lucide-react";
import { toPng } from "html-to-image";

// Day conversion map for RP slots
function getDayIndex(dayStr: string): number {
  const clean = dayStr.trim();
  if (clean.includes("一") || clean.toLowerCase().includes("mon") || clean.includes("1")) return 0;
  if (clean.includes("二") || clean.toLowerCase().includes("tue") || clean.includes("2")) return 1;
  if (clean.includes("三") || clean.toLowerCase().includes("wed") || clean.includes("3")) return 2;
  if (clean.includes("四") || clean.toLowerCase().includes("thu") || clean.includes("4")) return 3;
  if (clean.includes("五") || clean.toLowerCase().includes("fri") || clean.includes("5")) return 4;
  if (clean.includes("六") || clean.toLowerCase().includes("sat") || clean.includes("6")) return 5;
  if (clean.includes("日") || clean.toLowerCase().includes("sun") || clean.includes("0") || clean.includes("7") || clean.includes("天")) return 6;
  return 4; // Default to Friday
}

function getSlotDateLabel(slotDay: string, weekOffset: number): string {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday + weekOffset * 7);
  
  const idx = getDayIndex(slotDay);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + idx);
  
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

function getWeekLabelText(weekOffset: number): string {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday + weekOffset * 7);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const format = (date: Date) => {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  return `${format(monday)} - ${format(sunday)}`;
}

interface ScheduleBoardProps {
  staffList: Staff[];
  slots: ShiftSlot[];
  availabilities: any[];
  schedule: ScheduledShift[];
  onUpdateSchedule: (newSchedule: ScheduledShift[]) => void;
  selectedWeek: string;
}

export default function ScheduleBoard({
  staffList,
  slots,
  availabilities,
  schedule,
  onUpdateSchedule,
  selectedWeek,
}: ScheduleBoardProps) {
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [shopName, setShopName] = useState<string>(() => {
    return localStorage.getItem("ffxiv_roster_shop_name") || "星芒酒吧 (Astraea Bar)";
  });

  useEffect(() => {
    localStorage.setItem("ffxiv_roster_shop_name", shopName);
  }, [shopName]);

  const [realTime, setRealTime] = useState("");
  const [selectedPosterDay, setSelectedPosterDay] = useState<string>("all");
  const [posterOrientation, setPosterOrientation] = useState<"vertical" | "horizontal">("horizontal");
  
  // CSS transform trace for export preview scale (C. 讓預覽不溢出 / 不裁切，等比自適應縮放)
  const [posterScale, setPosterScale] = useState<number>(0.44);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      const width = containerRef.current?.offsetWidth || 372;
      // 橫式海報寬度設計為 840px
      setPosterScale(width / 840);
    };
    handleResize();

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  // Customizable footer text & poster theme selection state
  const [posterFooterText, setPosterFooterText] = useState<string>(() => {
    return localStorage.getItem("ffxiv_roster_poster_footer") || "敬邀光臨入座";
  });
  
  const [posterThemeId, setPosterThemeId] = useState<string>(() => {
    return localStorage.getItem("ffxiv_roster_poster_theme") || "parchment";
  });

  useEffect(() => {
    localStorage.setItem("ffxiv_roster_poster_footer", posterFooterText);
  }, [posterFooterText]);

  useEffect(() => {
    localStorage.setItem("ffxiv_roster_poster_theme", posterThemeId);
  }, [posterThemeId]);

  // Color options definitions
  const POSTER_THEMES = [
    {
      id: "parchment",
      name: "古樸紙質 (原創經典)",
      bg: "#FAF9F6",
      border: "rgba(139, 115, 85, 0.4)",
      borderMuted: "rgba(139, 115, 85, 0.15)",
      titleBg: "#8B7355",
      textPrimary: "#4A3D33",
      textMuted: "#6D5F52",
      slotBg: "#4A3D33",
      slotText: "#FFFFFF",
      timeText: "#8B7355",
      cardBg: "#FFFFFF",
      cardBorder: "#D8D2C2",
      roleLabel: "#6D5F52",
      staffText: "#4A3D33",
      footerBorder: "rgba(216, 210, 194, 0.4)",
    },
    {
      id: "midnight",
      name: "靜謐星空 (極光深藍)",
      bg: "#0B132B",
      border: "rgba(91, 192, 190, 0.45)",
      borderMuted: "rgba(91, 192, 190, 0.15)",
      titleBg: "#3A506B",
      textPrimary: "#F4FAFF",
      textMuted: "#87B3C7",
      slotBg: "#1C2541",
      slotText: "#5BC0BE",
      timeText: "#5BC0BE",
      cardBg: "#1C2541",
      cardBorder: "#3A506B",
      roleLabel: "#87B3C7",
      staffText: "#F4FAFF",
      footerBorder: "rgba(58, 80, 107, 0.4)",
    },
    {
      id: "sakura",
      name: "悠櫻花見 (優雅粉櫻)",
      bg: "#FFF0F2",
      border: "rgba(219, 112, 147, 0.45)",
      borderMuted: "rgba(219, 112, 147, 0.15)",
      titleBg: "#C71585",
      textPrimary: "#5C133A",
      textMuted: "#9C5D7D",
      slotBg: "#AA336A",
      slotText: "#FFFFFF",
      timeText: "#C71585",
      cardBg: "#FFFFFF",
      cardBorder: "#F3C1D3",
      roleLabel: "#9C5D7D",
      staffText: "#5C133A",
      footerBorder: "rgba(243, 193, 211, 0.4)",
    },
    {
      id: "forest",
      name: "翡翠森境 (溫潤深綠)",
      bg: "#F2F7F2",
      border: "rgba(46, 117, 89, 0.45)",
      borderMuted: "rgba(46, 117, 89, 0.15)",
      titleBg: "#2E7559",
      textPrimary: "#1B3F31",
      textMuted: "#46705D",
      slotBg: "#1B3F31",
      slotText: "#96DEB4",
      timeText: "#2E7559",
      cardBg: "#FFFFFF",
      cardBorder: "#C0DBD0",
      roleLabel: "#46705D",
      staffText: "#1B3F31",
      footerBorder: "rgba(192, 219, 208, 0.4)",
    },
    {
      id: "gothic",
      name: "黑檀古典 (華麗紅黑)",
      bg: "#120E0E",
      border: "rgba(186, 12, 47, 0.5)",
      borderMuted: "rgba(186, 12, 47, 0.2)",
      titleBg: "#221A1A",
      textPrimary: "#ECE2E2",
      textMuted: "#B89F9F",
      slotBg: "#BA0C2F",
      slotText: "#FFFFFF",
      timeText: "#BA0C2F",
      cardBg: "#221A1A",
      cardBorder: "#4A1521",
      roleLabel: "#B89F9F",
      staffText: "#ECE2E2",
      footerBorder: "rgba(186, 12, 47, 0.3)",
    }
  ];

  const currentTheme = POSTER_THEMES.find((t) => t.id === posterThemeId) || POSTER_THEMES[0];
  
  const weekOffset = selectedWeek === "this_week" ? 0 : selectedWeek === "next_week" ? 1 : selectedWeek === "two_weeks_after" ? 2 : 0;
  
  const posterRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Live real time ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setRealTime(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExportImage = () => {
    if (!posterRef.current) return;
    setIsGeneratingImage(true);

    const el = posterRef.current;
    
    // Find scrollable parent container and temporarily reset its scrollTop to 0 to prevent cropping
    const scrollContainer = el.parentElement;
    const originalScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    // Give a brief delay for the container scroll position to render, then capture
    setTimeout(() => {
      toPng(el, {
        cacheBust: true,
        backgroundColor: currentTheme.bg,
        pixelRatio: 3, // Use high-quality 3x native resolution scaling without buggy transform style hacks
      })
        .then((dataUrl) => {
          const link = document.createElement("a");
          const suffix = selectedPosterDay === "all" ? "全週大字海報" : `${selectedPosterDay}_單日海報`;
          const orientSuffix = "橫式";
          link.download = `${shopName}_${suffix}_${orientSuffix}.png`;
          link.href = dataUrl;
          link.click();
          
          // Restore original scroll position
          if (scrollContainer) {
            scrollContainer.scrollTop = originalScrollTop;
          }
          setIsGeneratingImage(false);
        })
        .catch((err) => {
          console.error("Oops, something went wrong during image export!", err);
          alert("海報圖片下載失敗，請重試！");
          
          // Restore original scroll position
          if (scrollContainer) {
            scrollContainer.scrollTop = originalScrollTop;
          }
          setIsGeneratingImage(false);
        });
    }, 100);
  };

  // Run Solver
  const handleAutoSchedule = () => {
    if (staffList.length === 0 || slots.length === 0) {
      alert("請確認已建立店員資料與時段編制。");
      return;
    }

    const result = autoSchedule(staffList, slots, availabilities);
    onUpdateSchedule(result.schedule);
    setDiagnostics(result.diagnostics);
  };

  // Re-run solver initially or when dependencies change if empty
  useEffect(() => {
    if (schedule.length === 0 && staffList.length > 0 && slots.length > 0) {
      const result = autoSchedule(staffList, slots, availabilities);
      onUpdateSchedule(result.schedule);
      setDiagnostics(result.diagnostics);
    }
  }, [selectedWeek]);

  // Calculate actual shift counts for the stats panel
  const staffShiftStats = staffList.map((staff) => {
    const assigned = schedule.filter((s) => s.staffId === staff.id).length;
    return {
      ...staff,
      assignedCount: assigned,
      isOverlimit: assigned > staff.maxShifts,
    };
  });

  // Handle manually changing staff in a shift with roleIndex
  const handleManualAssignment = (slotId: string, roleName: string, roleIndex: number, staffId: string) => {
    const otherShifts = schedule.filter((s) => !(s.slotId === slotId && s.roleName === roleName));
    const currentMatches = schedule.filter((s) => s.slotId === slotId && s.roleName === roleName);
    
    const newMatches: ScheduledShift[] = [];
    const maxIndex = Math.max(currentMatches.length - 1, roleIndex);
    
    for (let i = 0; i <= maxIndex; i++) {
      let existing = currentMatches.find((s) => s.roleIndex === i);
      if (!existing && currentMatches[i]) {
        existing = currentMatches[i];
      }
      
      if (i === roleIndex) {
        if (staffId !== "unassigned") {
          newMatches.push({
            slotId,
            roleName,
            staffId,
            roleIndex: i,
          });
        }
      } else if (existing && existing.staffId !== "unassigned") {
        newMatches.push({
          slotId,
          roleName,
          staffId: existing.staffId,
          roleIndex: i,
        });
      }
    }
    
    onUpdateSchedule([...otherShifts, ...newMatches]);
  };

  // Look up who is assigned to a slot & role with roleIndex
  const getAssignedStaffId = (slotId: string, roleName: string, roleIndex?: number): string => {
    const matches = schedule.filter((s) => s.slotId === slotId && s.roleName === roleName);
    if (matches.length === 0) return "unassigned";
    
    if (roleIndex !== undefined) {
      const indexMatch = matches.find((s) => s.roleIndex === roleIndex);
      if (indexMatch) return indexMatch.staffId;
      
      if (matches[roleIndex]) {
        return matches[roleIndex].staffId;
      }
    }
    
    return matches[0].staffId;
  };

  // Generate copyable Discord formatted text
  const generateDiscordCopyText = () => {
    const weekTitle = selectedWeek === "this_week" ? "本週" : selectedWeek === "next_week" ? "下週" : "下下週";
    let text = `✨ **${shopName} ${weekTitle} RP 營業排班公告** ✨\n`;
    text += `📅 營運時間：${getWeekLabelText(weekOffset)}\n`;
    text += `===================================\n\n`;

    slots.forEach((slot) => {
      text += `📅 **${slot.day} (${getSlotDateLabel(slot.day, weekOffset)}) ${slot.time}**\n`;
      
      // Group assignments by role for this slot
      const roleGroups: Record<string, string[]> = {};
      slot.rolesRequired.forEach((req) => {
        roleGroups[req.roleName] = [];
      });

      schedule
        .filter((s) => s.slotId === slot.id)
        .forEach((s) => {
          const staff = staffList.find((st) => st.id === s.staffId);
          if (staff) {
            if (!roleGroups[s.roleName]) {
              roleGroups[s.roleName] = [];
            }
            roleGroups[s.roleName].push(staff.name);
          }
        });

      // Format roles
      Object.entries(roleGroups).forEach(([roleName, names]) => {
        const standardName = roleName.split(" / ")[0];
        if (names.length > 0) {
          text += `- ${standardName}：${names.join("、")}\n`;
        } else {
          text += `- ${standardName}：⚠️ *待協調/代班*\n`;
        }
      });
      text += `\n`;
    });

    text += `===================================\n`;
    text += `歡迎冒險者們到店入座！我們不見不散喔 💖 (FFXIV RP)`;
    return text;
  };

  const handleCopyDiscord = () => {
    const text = generateDiscordCopyText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uniqueDaysInSlots = Array.from(new Set(slots.map((s) => s.day))).sort((a, b) => {
    return getDayIndex(a) - getDayIndex(b);
  });

  const displayedSlots = selectedPosterDay === "all"
    ? slots
    : slots.filter((slot) => slot.day === selectedPosterDay);

  // 計算在各時段中，各職務需要的最高槽位數 (B. 用於動態排版對齊的格線表格)
  const maxCountMap: Record<string, number> = {};
  slots.forEach((slot) => {
    slot.rolesRequired.forEach((req) => {
      let count = req.count;
      if (req.isUnlimited) {
        // 如果是無上限，槽位上限為目前已配班的人數 + 1 (多留一個空位給手動配置)
        const matches = schedule.filter((s) => s.slotId === slot.id && s.roleName === req.roleName);
        count = matches.length + 1;
      }
      if (!maxCountMap[req.roleName] || count > maxCountMap[req.roleName]) {
        maxCountMap[req.roleName] = count;
      }
    });
  });

  // 取得排序後的職能清單
  const activeRoleNames = Object.keys(maxCountMap).sort((a, b) => {
    const idxA = FFXIV_RP_ROLES.indexOf(a as any);
    const idxB = FFXIV_RP_ROLES.indexOf(b as any);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // 動態展平為對齊用的 rows [[職能, index]]
  const tableRows: { roleName: string; index: number; label: string }[] = [];
  activeRoleNames.forEach((roleName) => {
    const maxCount = maxCountMap[roleName];
    for (let i = 0; i < maxCount; i++) {
      const baseName = roleName.split(" / ")[0];
      const label = i === 0 ? baseName : `${baseName} #${i + 1}`;
      tableRows.push({
        roleName,
        index: i,
        label,
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Prime Action Card */}
      <div className="bg-[#FAF9F6] rounded-2xl border border-[#D8D2C2] shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-lg font-serif font-black text-[#4A3D33] flex items-center justify-center md:justify-start gap-1.5">
            <Sparkles className="w-5 h-5 text-[#8B7355] animate-pulse" /> 曉月智能自動排班主機
          </h3>
          <p className="text-base text-[#6D5F52] font-serif font-medium leading-relaxed">
            排班演算法將依據：<strong>1. 夥伴意願等級</strong>、<strong>2. 角色專長職能</strong>、<strong>3. 每週最大班數限制</strong>、<strong>4. 公平排假調節</strong> 進行最佳全自動配對。
          </p>
        </div>
        <button
          onClick={handleAutoSchedule}
          className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#4A3D33] hover:bg-[#3D322A] text-white font-bold text-xs transition flex justify-center items-center gap-2 cursor-pointer shadow-md"
        >
          <Play className="w-4 h-4 text-[#D4AF37]" /> 一鍵智能自適應排班
        </button>
      </div>

      {/* A. 主內容用兩欄 grid (小於 980px 時自動疊為單欄) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* 左欄 (自適應寬, flex:1): 綜合排班班表 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center bg-[#FAF9F6] p-4 rounded-xl border border-[#D8D2C2] text-sm font-serif font-bold text-[#6D5F52]">
            <span className="text-[#4A3D33] font-serif font-black">📋 綜合排班班表與手動微調</span>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> 意願極佳</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#D4AF37]"></span> 備用/彈性</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400"></span> 不利/不便</span>
            </div>
          </div>

          {/* B. 排班班表改成對齊的表格/grid */}
          <div className="bg-white rounded-2xl border border-[#D8D2C2] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-[#4A3D33]">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#D8D2C2] select-none">
                    <th className="py-4 px-4 font-serif font-black text-[#6D5F52] text-xs">編制職務</th>
                    {slots.map((slot) => (
                      <th key={slot.id} className="py-4 px-4 min-w-[210px]">
                        <div className="flex flex-col gap-1">
                          <span className="inline-block self-start px-2.5 py-0.5 rounded text-4xs font-serif font-black bg-[#8B7355] text-white">
                            {slot.day} ({getSlotDateLabel(slot.day, weekOffset)})
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#6D5F52]">
                            {slot.time}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2C2]/40 bg-white">
                  {tableRows.map((row) => (
                    <tr key={`${row.roleName}-${row.index}`} className="hover:bg-[#FAF9F6]/20 transition-colors">
                      <td className="py-3.5 px-4 font-serif font-black text-[#4A3D33] whitespace-nowrap bg-[#FAF9F6]/10 border-r border-[#D8D2C2]/20 text-2xs">
                        {row.label}
                      </td>
                      {slots.map((slot) => {
                        const req = slot.rolesRequired.find((r) => r.roleName === row.roleName);
                        let hasReq = false;
                        let isUnlimited = false;

                        if (req) {
                          if (req.isUnlimited) {
                            isUnlimited = true;
                            const matches = schedule.filter((s) => s.slotId === slot.id && s.roleName === row.roleName);
                            if (row.index < matches.length + 1) {
                              hasReq = true;
                            }
                          } else {
                            if (row.index < req.count) {
                              hasReq = true;
                            }
                          }
                        }

                        if (!hasReq) {
                          return (
                            <td key={slot.id} className="p-2.5">
                              {/* 虛線佔位框 (確保各列左右對齊) */}
                              <div className="flex items-center justify-center h-[38px] rounded-lg border border-dashed border-[#D8D2C2]/50 text-[#A19882] text-3xs italic bg-[#FAF9F6]/10 select-none">
                                本日無此編制
                              </div>
                            </td>
                          );
                        }

                        // 有配置此職稱與編號
                        const assignedStaffId = getAssignedStaffId(slot.id, row.roleName, row.index);
                        const currentStaff = staffList.find((s) => s.id === assignedStaffId);
                        const eligibleStaff = staffList.filter((s) => s.roles.includes(row.roleName));

                        // 判斷當前已指派同仁的意願
                        let statusColor = "bg-[#D8D2C2]";
                        if (currentStaff) {
                          const availRecord = availabilities.find((a) => a.staffId === currentStaff.id);
                          const status = availRecord?.preferences[slot.id] || "unavailable";
                          if (status === "available") statusColor = "bg-emerald-500 font-bold";
                          if (status === "maybe") statusColor = "bg-[#D4AF37] font-bold";
                          if (status === "unavailable") statusColor = "bg-rose-500 font-bold";
                        }

                        return (
                          <td key={slot.id} className="p-2.5">
                            <div className="flex items-center gap-1.5 w-full">
                              {currentStaff && (
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`} />
                              )}
                              <select
                                value={assignedStaffId}
                                onChange={(e) =>
                                  handleManualAssignment(slot.id, row.roleName, row.index, e.target.value)
                                }
                                className="w-full px-2 py-1.5 rounded-lg text-3xs border font-serif font-black bg-[#FAF9F6] border-[#D8D2C2] text-[#4A3D33] focus:outline-none focus:ring-1 focus:ring-[#8B7355] transition cursor-pointer"
                              >
                                <option value="unassigned">⚠️ [ 待店員認領 ]</option>
                                {eligibleStaff.map((staff) => {
                                  const availRecord = availabilities.find((a) => a.staffId === staff.id);
                                  const status = availRecord?.preferences[slot.id] || "unavailable";
                                  const isAssignedSomewhereElseInSlot = schedule.some(
                                    (s) =>
                                      s.slotId === slot.id &&
                                      s.staffId === staff.id &&
                                      (s.roleName !== row.roleName || s.roleIndex !== row.index)
                                  );

                                  let flagText = "🔴 不行";
                                  if (status === "available") flagText = "🟢 可配班";
                                  if (status === "maybe") flagText = "🟡 備用/可能";
                                  if (isAssignedSomewhereElseInSlot) {
                                    flagText = "🚫 已有班";
                                  }

                                  return (
                                    <option
                                      key={staff.id}
                                      value={staff.id}
                                      disabled={isAssignedSomewhereElseInSlot}
                                    >
                                      {flagText} | {staff.name}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostics warning logs if any */}
          {diagnostics.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-250 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-serif font-bold text-[#8B7355] flex items-center gap-1.5 border-b border-[#D8D2C2]/40 pb-2">
                <ShieldAlert className="w-4.5 h-4.5 text-[#8B7355]" /> ⚠️ 排班緊繃與缺額警告
              </h4>
              <p className="text-3xs text-[#6D5F52] font-semibold leading-relaxed">
                如果店員意願與每週最大班數上限有衝突，或者特定職缺（例如特定時段 DJ ）沒有配備對應專長的人，班表會留下空白以便您隨時手動微調安排：
              </p>
              <ul className="text-2xs space-y-1.5 pt-1 divide-y divide-[#D8D2C2]/30 leading-relaxed text-[#5c4a35] font-semibold">
                {diagnostics.map((diag, index) => {
                  const s = slots.find((sl) => sl.id === diag.slotId);
                  return (
                    <li key={index} className="pt-1.5 first:pt-0">
                      <strong>【{s ? `${s.day} ${s.time}` : "未知時段"}】</strong>的「
                      <strong>{diag.roleName.split(" / ")[0]}</strong>
                      」職務空缺：
                      <span className="italic block pl-2 mt-0.5 text-slate-500 font-normal">{diag.reason}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* 右欄 (固定約 320px) - 只放置「週班數統計」+「Discord 宣傳公告」卡 */}
        <div className="lg:col-span-1 w-full lg:max-w-[320px] flex-shrink-0 space-y-6">
          {/* Schedule stats */}
          <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-4">
            <h4 className="text-xs font-serif font-bold text-[#4A3D33] flex items-center gap-1.5 border-b border-[#D8D2C2]/40 pb-2.5">
              <Users className="w-4 h-4 text-[#8B7355]" /> 店員夥伴每週班數統計
            </h4>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {staffShiftStats.map((st) => {
                const ratio = st.assignedCount / st.maxShifts;
                let colorClass = "bg-[#8B7355]";
                if (st.isOverlimit) colorClass = "bg-rose-500";
                else if (ratio === 1) colorClass = "bg-[#D4AF37]"; // Gold
                else if (st.assignedCount === 0) colorClass = "bg-[#D8D2C2]";

                return (
                  <div key={st.id} className="text-2xs space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[#4A3D33]">{st.name}</span>
                      <span className={`font-semibold ${st.isOverlimit ? "text-rose-505" : "text-[#8B7355]"}`}>
                        {st.assignedCount} / {st.maxShifts} 班
                      </span>
                    </div>
                    {/* Progress indicator bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#E7E0D3] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      ></div>
                    </div>
                    {st.isOverlimit && (
                      <span className="text-[9px] text-rose-500 font-bold block animate-pulse">
                        ⚠️ 已超出該夥伴意願上限！
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Copy Paste Output Panel */}
          <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-4 font-sans">
            <h4 className="text-xs font-serif font-bold text-[#4A3D33] flex items-center gap-1.5 border-b border-[#D8D2C2]/40 pb-2.5">
              <FileText className="w-4 h-4 text-[#8B7355]" /> 匯出 Discord 宣傳公告
            </h4>

            <div>
              <label className="block text-3xs font-bold text-[#A19882] mb-1 uppercase tracking-widest">
                自訂 RP 店家店名
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="例如: Astral Bar"
                className="w-full px-2.5 py-1.5 text-2xs rounded-lg border border-[#D8D2C2] bg-white text-[#4A3D33] font-semibold focus:ring-1 focus:ring-[#8B7355] outline-none animate-none"
              />
            </div>

            <div className="p-3 rounded-lg border border-[#D8D2C2] bg-[#F5F2ED]">
              <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap select-all max-h-40 overflow-y-auto text-[#4A3D33]">
                {generateDiscordCopyText()}
              </pre>
            </div>

            <button
              onClick={handleCopyDiscord}
              disabled={schedule.length === 0}
              className="w-full py-2.5 px-3 text-xs font-bold rounded-lg text-white bg-[#8B7355] hover:bg-[#705D45] transition flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> 已複製到剪貼簿！
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#FAF9F6]" /> 一鍵複製 Discord 宣傳排班
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* C. 海報匯出獨立成「整頁滿寬」的一張卡，放在主內容下方 */}
      <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-5 font-sans">
        <h4 className="text-xs font-serif font-bold text-[#4A3D33] flex items-center justify-between border-b border-[#D8D2C2]/40 pb-3">
          <span className="flex items-center gap-2 text-sm font-serif font-black">
            <Image className="w-4 h-4 text-[#8B7355]" /> 🖼️ 匯出精美排班海報
          </span>
        </h4>
        
        {/* 內部用兩欄佈局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左欄(flex:1 / lg:col-span-7): 第一步、第二步、第三步由上往下堆疊，最後放下載按鈕 */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <p className="text-3xs text-[#6D5F52] leading-relaxed font-semibold">
                將右方精美風格的海報圖卡下載存入您的裝置。本圖卡自動去除控制按鈕，非常適合張貼於 Discord、遊戲社群、或店鋪公告！
              </p>

              {/* Day & Layout Selector */}
              <div className="space-y-3 bg-[#E7E0D3]/30 p-4 rounded-xl border border-[#D8D2C2]/40">
                {/* 第一步 */}
                <div className="space-y-1.5">
                  <span className="block text-3xs font-black text-[#8B7355] uppercase tracking-widest leading-none">
                    第一步：選擇匯出日期範圍
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedPosterDay("all")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-3xs font-extrabold transition-all cursor-pointer ${
                        selectedPosterDay === "all"
                          ? "bg-[#8B7355] text-white shadow-xs"
                          : "bg-white/60 text-[#6D5F52] hover:bg-white"
                      }`}
                    >
                      全部 (全週排班海報)
                    </button>
                    {uniqueDaysInSlots.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedPosterDay(d)}
                        className={`py-1.5 px-3.5 rounded-lg text-3xs font-extrabold transition-all cursor-pointer ${
                          selectedPosterDay === d
                            ? "bg-[#8B7355] text-white shadow-xs"
                            : "bg-white/60 text-[#6D5F52] hover:bg-white"
                        }`}
                      >
                        僅 {d} 海報
                      </button>
                    ))}
                  </div>
                </div>

                {/* 第二步 */}
                <div className="space-y-1.5 border-t border-[#D8D2C2]/30 pt-3">
                  <span className="block text-3xs font-black text-[#8B7355] uppercase tracking-widest leading-none">
                    第二步：選擇海報主題色系
                  </span>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {POSTER_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setPosterThemeId(theme.id)}
                        className={`py-1.5 px-2 rounded-lg text-3xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          posterThemeId === theme.id
                            ? "bg-[#8B7355] text-white border-transparent shadow-xs"
                            : "bg-white text-[#6D5F52] hover:bg-white/90 border-[#D8D2C2]/40"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: theme.bg }}></span>
                        <span className="truncate">{theme.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 第三步 */}
                <div className="space-y-1.5 border-t border-[#D8D2C2]/30 pt-3">
                  <span className="block text-3xs font-black text-[#8B7355] uppercase tracking-widest leading-none">
                    第三步：自訂海報底部文案 (宣傳標語)
                  </span>
                  <input
                    type="text"
                    value={posterFooterText}
                    onChange={(e) => setPosterFooterText(e.target.value)}
                    placeholder="例如：敬邀光臨入座、店鋪試營運中！"
                    className="w-full px-2.5 py-1.5 text-2xs rounded-lg border border-[#D8D2C2] bg-white text-[#4A3D33] font-bold focus:ring-1 focus:ring-[#8B7355] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 下載按鈕 */}
            <button
              onClick={handleExportImage}
              disabled={schedule.length === 0 || isGeneratingImage}
              className="w-full mt-4 py-3 px-4 text-xs font-bold rounded-xl text-white bg-[#8B7355] hover:bg-[#705D45] transition flex justify-center items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              {isGeneratingImage 
                ? "海報圖片產生中..." 
                : `下載精美海報影像 [${selectedPosterDay === "all" ? "完整班表" : selectedPosterDay}] (PNG) 📸`}
            </button>
          </div>

          {/* 右欄(固定約 400px): 即時縮放不溢出版面預覽系統 */}
          <div className="lg:col-span-5 w-full max-w-[400px] mx-auto select-none space-y-2">
            <span className="block text-3xs font-black text-[#8B7355] uppercase tracking-widest leading-none">
              即時海報預覽
            </span>
            
            {/* 預覽容器 (固定長寬比 3/4 + overflow:hidden 框住) */}
            <div 
              ref={containerRef}
              className="w-full aspect-[3/4] border border-[#D8D2C2] bg-white rounded-xl shadow-inner relative overflow-hidden flex items-start justify-start"
            >
              {/* 利用 CSS transform: scale 動態等比非模糊式縮放，絕對不爆版不溢出 */}
              <div
                style={{
                  transform: `scale(${posterScale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "840px",
                }}
              >
                {/* 原始 840px 寬度的 Capture 原型 DOM */}
                <div
                  ref={posterRef}
                  className="pt-6 px-6 pb-12 font-sans relative flex flex-col justify-between shrink-0"
                  style={{
                    width: "840px",
                    height: "auto",
                    minHeight: "450px",
                    backgroundColor: currentTheme.bg,
                    color: currentTheme.textPrimary,
                  }}
                >
                  {/* Decorative borders */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 bottom-2.5 border pointer-events-none rounded-lg" style={{ borderColor: currentTheme.border }}></div>
                  <div className="absolute top-3.5 left-3.5 right-3.5 bottom-3.5 border pointer-events-none rounded-lg" style={{ borderColor: currentTheme.borderMuted }}></div>
                  
                  {/* Content top section wrapper */}
                  <div className="space-y-6 z-10 relative flex-grow flex flex-col justify-start pb-4">
                    {/* Real Time Overlay on capturing */}
                    <div className="flex justify-between items-center text-[9px] font-mono select-none border-b pb-1" style={{ borderColor: currentTheme.borderMuted, color: currentTheme.textMuted }}>
                      <span>REAL TIME / 現實時間</span>
                      <span className="font-bold" style={{ color: currentTheme.timeText }}>{realTime || "讀取中..."}</span>
                    </div>

                    {/* Header */}
                    <div className="text-center space-y-1 select-none">
                      <div className="inline-block text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-1 shadow-2xs" style={{ backgroundColor: currentTheme.titleBg }}>
                        ✦ FFXIV RP ROSTER ✦
                      </div>
                      <h2 className="text-2xl font-serif font-black tracking-wide break-words uppercase" style={{ color: currentTheme.textPrimary }}>
                        {shopName}
                      </h2>
                      <p className="text-xs font-serif font-bold italic" style={{ color: currentTheme.timeText }}>
                        {selectedPosterDay === "all" ? (
                          selectedWeek === "this_week" ? "~ 本週營業班表 ~" : selectedWeek === "next_week" ? "~ 下週營運預排 ~" : "~ 下下週營運預排 ~"
                        ) : (
                          `~ ${selectedPosterDay} 營業班表 ~`
                        )}
                      </p>
                      <p className="text-[10px] font-mono font-bold tracking-tight" style={{ color: currentTheme.textMuted }}>
                        {selectedPosterDay === "all" ? (
                          `(${getWeekLabelText(weekOffset)})`
                        ) : (
                          `(${getSlotDateLabel(selectedPosterDay, weekOffset)})`
                        )}
                      </p>
                      <div className="w-20 h-0.5 mx-auto mt-2" style={{ backgroundColor: currentTheme.titleBg }}></div>
                    </div>

                    {/* Slots details (conditionally responsive Grid layout for Horizontal) */}
                    <div className="grid grid-cols-2 gap-4 pt-1 text-left">
                      {displayedSlots.length === 0 ? (
                        <p className="col-span-2 text-center text-xs py-4 italic font-serif" style={{ color: currentTheme.textMuted }}>尚未設定任何營業時段</p>
                      ) : (
                        displayedSlots.map((slot) => {
                          // Gather layout requirements list
                          const flatReqList = slot.rolesRequired.flatMap((req) => {
                            if (req.isUnlimited) {
                              const matches = schedule.filter((m) => m.slotId === slot.id && m.roleName === req.roleName);
                              if (matches.length === 0) return [];
                              return matches.map((m, idx) => ({ roleName: req.roleName, index: m.roleIndex ?? idx }));
                            } else {
                              const list = [];
                              for (let i = 0; i < req.count; i++) {
                                list.push({ roleName: req.roleName, index: i });
                              }
                              return list;
                            }
                          });

                          // Consolidate identical roles so duplicate items don't crop up (職務不重複，並合成人名)
                          const roleGroups: { roleName: string; staffNames: string[] }[] = [];

                          flatReqList.forEach(({ roleName, index }) => {
                            const assignedId = getAssignedStaffId(slot.id, roleName, index);
                            const currentStaff = staffList.find((st) => st.id === assignedId);
                            const staffName = currentStaff ? currentStaff.name : "🕒 待定";

                            const existingGroup = roleGroups.find((g) => g.roleName === roleName);
                            if (existingGroup) {
                              existingGroup.staffNames.push(staffName);
                            } else {
                              roleGroups.push({ roleName, staffNames: [staffName] });
                            }
                          });
                          
                          return (
                            <div key={slot.id} className="border rounded-xl p-4 space-y-3 shadow-2xs flex flex-col justify-between" style={{ backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder }}>
                              <div>
                                {/* Slot banner */}
                                <div className="flex justify-between items-center border-b pb-2 mb-2.5 select-none" style={{ borderColor: currentTheme.borderMuted }}>
                                  <span className="text-xs font-serif font-bold px-2.5 py-0.5 rounded" style={{ backgroundColor: currentTheme.slotBg, color: currentTheme.slotText }}>
                                    {slot.day} ({getSlotDateLabel(slot.day, weekOffset)})
                                  </span>
                                  <span className="text-xs font-serif font-extrabold" style={{ color: currentTheme.timeText }}>
                                    {slot.time}
                                  </span>
                                </div>

                                {/* Staff and consolidated roles list */}
                                <div className="space-y-1.5">
                                  {roleGroups.length === 0 ? (
                                    <p className="text-xs italic font-serif" style={{ color: currentTheme.textMuted }}>無特定編制需求</p>
                                  ) : (
                                    roleGroups.map(({ roleName, staffNames }, gIdx) => {
                                      const displayName = staffNames.join("、");
                                      const hasAnyStaff = staffNames.some(name => name !== "🕒 待定");

                                      return (
                                        <div key={gIdx} className="flex justify-between items-center text-sm py-1 border-b last:border-0 select-none gap-2" style={{ borderColor: currentTheme.borderMuted }}>
                                          <span className="font-serif font-medium shrink-0" style={{ color: currentTheme.roleLabel }}>
                                            • {roleName.split(" / ")[0]}
                                          </span>
                                          <span className={`text-right rounded font-serif font-extrabold text-sm break-all ${hasAnyStaff ? "" : "text-amber-700 bg-amber-50 px-1 py-0.5"}`} style={{ color: hasAnyStaff ? currentTheme.staffText : undefined }}>
                                            {displayName}
                                          </span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Footer seal */}
                  <div className="text-center pt-3 pb-2 border-t z-10 relative select-none space-y-1 mt-auto" style={{ borderColor: currentTheme.footerBorder }}>
                    <p className="text-sm font-serif font-black leading-none tracking-widest" style={{ color: currentTheme.textMuted }}>
                      {posterFooterText || "敬邀光臨入座"}
                    </p>
                    <p className="text-[9px] font-sans leading-none tracking-tight block" style={{ color: currentTheme.textMuted, opacity: 0.7 }}>
                      FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
