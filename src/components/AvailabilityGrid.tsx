import React, { useState, useRef } from "react";
import { Staff, ShiftSlot, StaffAvailability, AvailabilityStatus } from "../types";
import { Copy, Clipboard, Sparkles, Check, RefreshCw, AlertCircle, HelpCircle, FileText, Upload, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface AvailabilityGridProps {
  staffList: Staff[];
  slots: ShiftSlot[];
  availabilities: StaffAvailability[];
  onChangePreference: (staffId: string, slotId: string, status: AvailabilityStatus) => void;
  onBatchUpdate: (updatedAvail: StaffAvailability[], updatedStaff?: Staff[]) => void;
  selectedWeek: string;
  roles: string[];
}

export default function AvailabilityGrid({
  staffList,
  slots,
  availabilities,
  onChangePreference,
  onBatchUpdate,
  selectedWeek,
  roles,
}: AvailabilityGridProps) {
  const [tsvInput, setTsvInput] = useState("");
  const [tsvError, setTsvError] = useState<string | null>(null);

  // File upload & processing states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRowsPreview, setParsedRowsPreview] = useState<{
    staffName: string;
    matchedStaff: Staff | null;
    preferences: { [slotId: string]: { status: AvailabilityStatus; label: string } };
  }[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");

  // Helper to fetch status
  const getPreference = (staffId: string, slotId: string): AvailabilityStatus => {
    const record = availabilities.find((a) => a.staffId === staffId);
    return record?.preferences[slotId] || "unavailable";
  };

  // Toggle Cycle preferences
  const cyclePreference = (staffId: string, slotId: string) => {
    const current = getPreference(staffId, slotId);
    let next: AvailabilityStatus = "unavailable";
    if (current === "available") next = "maybe";
    else if (current === "maybe") next = "unavailable";
    else if (current === "unavailable") next = "available";

    onChangePreference(staffId, slotId, next);
  };

  // Helper definitions for status UI
  const getStatusBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case "available":
        return "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100 dark:shadow-none";
      case "maybe":
        return "bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-100 dark:shadow-none";
      case "unavailable":
        return "bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400";
    }
  };

  const getStatusLabel = (status: AvailabilityStatus) => {
    switch (status) {
      case "available":
        return "🟢 可排班";
      case "maybe":
        return "🟡 備用/調劑";
      case "unavailable":
        return "🔴 不可排";
    }
  };

  // Parsing pasted Excel (TSV) block
  const handleTsvParse = () => {
    setTsvError(null);
    if (!tsvInput.trim()) {
      setTsvError("請先貼入 Excel 複製或 Tab 分隔的文字資料。");
      return;
    }

    try {
      const rows = tsvInput.trim().split(/\r?\n/).map((row) => row.split("\t"));
      if (rows.length === 0 || rows[0].length === 0) {
        throw new Error("格式不正確。");
      }

      // Check if first row are slots or we just parse row-by-row mapping Name -> Slots
      // Simple Excel format:
      // Column 1: Staff Name
      // Then each subsequent column represents a Slot (we match in order of active Slots, or keyword match)
      const updatedAvailabilities: StaffAvailability[] = [...availabilities];

      let successCount = 0;

      rows.forEach((row) => {
        const staffNamePart = row[0]?.trim();
        if (!staffNamePart) return;

        // Try to match with our existing staff (Fuzzy match)
        const matchedStaff = staffList.find(
          (s) =>
            s.name.toLowerCase().includes(staffNamePart.toLowerCase()) ||
            staffNamePart.toLowerCase().includes(s.name.toLowerCase())
        );

        if (matchedStaff) {
          // Find preferences object or initialized it
          let availIndex = updatedAvailabilities.findIndex((a) => a.staffId === matchedStaff.id);
          if (availIndex === -1) {
            updatedAvailabilities.push({ staffId: matchedStaff.id, preferences: {} });
            availIndex = updatedAvailabilities.length - 1;
          }

          // Loop remaining columns and match them to our active slots in order
          for (let col = 1; col < row.length; col++) {
            const val = row[col]?.trim();
            const slotTarget = slots[col - 1]; // map to slot index in order
            if (!slotTarget) break; // more values than slots defined

            let prefStatus: AvailabilityStatus = "unavailable";
            if (/可|OK|Yes|y|1|對/i.test(val)) {
              prefStatus = "available";
            } else if (/備用|可能|彈性|maybe|m|\?/i.test(val)) {
              prefStatus = "maybe";
            } else if (/否|不可|不行|no|n|0|請假/i.test(val)) {
              prefStatus = "unavailable";
            } else if (val === "") {
              prefStatus = "unavailable";
            }

            updatedAvailabilities[availIndex].preferences[slotTarget.id] = prefStatus;
          }
          successCount++;
        }
      });

      if (successCount === 0) {
        setTsvError("找不到能匹配的店員名稱。請確認 Excel 名字與店員管理內的名字相符。");
      } else {
        onBatchUpdate(updatedAvailabilities);
        setTsvInput("");
        alert(`成功解析並更新了 ${successCount} 位店員的排班意願！`);
      }
    } catch (e) {
      setTsvError("解析失敗，請確認是否為 Excel 複製出來的表格格式。");
    }
  };

  // File drag-and-drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const parseFile = (file: File) => {
    setFileError(null);
    setParsedRowsPreview(null);
    
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv") && !name.endsWith(".tsv") && !name.endsWith(".txt")) {
      setFileError("不支援此檔案格式。請上傳 Excel (.xlsx, .xls) 或 CSV, TSV 檔案。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (rawRows.length === 0) {
          throw new Error("試算表內容為空。");
        }

        const headerRow = rawRows[0] ? rawRows[0].map((v: any) => String(v || "").trim()) : [];
        
        const indexToSlotIdMap: { [colIndex: number]: string } = {};
        let usesHeaderMapping = false;

        for (let col = 1; col < headerRow.length; col++) {
          const headerVal = headerRow[col];
          if (!headerVal) continue;

          const matchedSlot = slots.find(slot => {
            const cleanHeader = headerVal.toLowerCase();
            const cleanDay = slot.day.toLowerCase();
            const cleanTime = slot.time.toLowerCase();
            return cleanHeader.includes(cleanDay) || cleanDay.includes(cleanHeader) || cleanHeader.includes(cleanTime);
          });

          if (matchedSlot) {
            indexToSlotIdMap[col] = matchedSlot.id;
            usesHeaderMapping = true;
          }
        }

        const previewList: {
          staffName: string;
          matchedStaff: Staff | null;
          preferences: { [slotId: string]: { status: AvailabilityStatus; label: string } };
        }[] = [];

        for (let r = 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          const staffNamePart = String(row[0] || "").trim();
          if (!staffNamePart) continue;

          const matchedStaff = staffList.find(
            (s) =>
              s.name.toLowerCase().includes(staffNamePart.toLowerCase()) ||
              staffNamePart.toLowerCase().includes(s.name.toLowerCase())
          );

          const preferences: { [slotId: string]: { status: AvailabilityStatus; label: string } } = {};

          for (let col = 1; col < row.length; col++) {
            const val = String(row[col] || "").trim();
            
            let slotTarget = null;
            if (usesHeaderMapping && indexToSlotIdMap[col]) {
              slotTarget = slots.find(s => s.id === indexToSlotIdMap[col]);
            } else {
              slotTarget = slots[col - 1];
            }

            if (!slotTarget) continue;

            let prefStatus: AvailabilityStatus = "unavailable";
            let label = "❌ 不可排";
            if (/可|OK|Yes|y|1|對/i.test(val)) {
              prefStatus = "available";
              label = "🟢 可排班";
            } else if (/備用|可能|彈性|maybe|m|\?/i.test(val)) {
              prefStatus = "maybe";
              label = "🟡 備用/彈性";
            }

            preferences[slotTarget.id] = { status: prefStatus, label };
          }

          previewList.push({
            staffName: staffNamePart,
            matchedStaff: matchedStaff || null,
            preferences,
          });
        }

        if (previewList.length === 0) {
          throw new Error("無法解析出任何夥伴意願。第一欄請包含夥伴名稱。");
        }

        setParsedRowsPreview(previewList);
        setSelectedFile(file);
      } catch (err: any) {
        setFileError(err.message || "解析試算表檔案時發生錯誤。請確認格式正確。");
      }
    };

    reader.onerror = () => {
      setFileError("讀取檔案失敗。");
    };

    reader.readAsArrayBuffer(file);
  };

  const applyFileImport = () => {
    if (!parsedRowsPreview) return;
    
    const updatedStaffList: Staff[] = [...staffList];
    const updatedAvailabilities: StaffAvailability[] = [...availabilities];
    let matchedCount = 0;
    let newCount = 0;

    parsedRowsPreview.forEach((previewRow) => {
      let targetStaff = previewRow.matchedStaff;
      
      if (!targetStaff) {
        targetStaff = {
          id: `staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: previewRow.staffName,
          roles: ["Host / 陪聊 / 迎賓"],
          maxShifts: 2,
        };
        updatedStaffList.push(targetStaff);
        newCount++;
      }

      let availIndex = updatedAvailabilities.findIndex((a) => a.staffId === targetStaff!.id);
      if (availIndex === -1) {
        updatedAvailabilities.push({ staffId: targetStaff.id, preferences: {}, notes: {} });
        availIndex = updatedAvailabilities.length - 1;
      }

      Object.entries(previewRow.preferences).forEach(([slotId, info]) => {
        updatedAvailabilities[availIndex].preferences[slotId] = (info as any).status;
      });
      matchedCount++;
    });

    onBatchUpdate(updatedAvailabilities, updatedStaffList);
    setSelectedFile(null);
    setParsedRowsPreview(null);
    
    let msg = `🎉 成功匯入 ${matchedCount} 位夥伴的排班意願！`;
    if (newCount > 0) {
      msg += `（其中自動新加入了 ${newCount} 位新夥伴，預設角色為 Host）`;
    }
    alert(msg);
  };

  // Generate and download Excel (.xlsx) file template dynamically
  const downloadExcelTemplate = () => {
    // Columns: "店員名字", then current slots configured in the system
    const headers = ["店員名字", ...slots.map((s) => `${s.day} (${s.time})`)];

    // Populate rows with current registered staff if available, so they have a personalized worksheet
    const rows = staffList.map((st) => {
      const rowData = [st.name];
      slots.forEach((_, idx) => {
        // Distribute some default values for illustration (e.g. alternating mostly "可", and some "否" or "備用")
        rowData.push(idx % 3 === 0 ? "可" : idx % 3 === 1 ? "備用" : "否");
      });
      return rowData;
    });

    // Fallback if staff list is currently empty, add illustrative RP characters
    if (rows.length === 0) {
      const defaultNames = ["雅修特拉 (Y'shtola)", "桑克瑞德 (Thancred)", "于里昂熱 (Urianger)", "阿爾菲諾 (Alphinaud)"];
      defaultNames.forEach((name) => {
        const rowData = [name];
        slots.forEach((_, idx) => {
          rowData.push(idx % 2 === 0 ? "可" : idx % 3 === 2 ? "備用" : "否");
        });
        rows.push(rowData);
      });
    }

    try {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Auto-set clean column widths
      const colWidths = [
        { wch: 22 }, // Staff list col
        ...slots.map(() => ({ wch: 18 }))
      ];
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "店員意願調查表");

      // Trigger automatic file download
      const weekSuffix = selectedWeek === "this_week" ? "本週" : selectedWeek === "next_week" ? "下週" : "下下週";
      XLSX.writeFile(workbook, `FFXIV_RP_店員班次意願調查表_下載範本_${weekSuffix}.xlsx`);
    } catch (err) {
      alert("⚠️ 無法下載範本，請確認您已正確設定開業時段！");
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] text-[#4A3D33]">
        <h3 className="font-serif font-bold text-[#8B7355] text-sm flex items-center gap-1.5 mb-1.5">
          <Clipboard className="w-5 h-5 text-[#8B7355]" />
          冒險者意願收集 & 大批導入指引
        </h3>
        <p className="text-xs text-[#6D5F52] leading-relaxed font-semibold">
          班表規定的核心在於收集店員夥伴的本週意願。本助手提供兩種高效輸入模式：
          <br />
          1. <strong>表格點擊變更：</strong>直接在下方矩陣的格點上點擊，即可快速循環輪替意願狀態。
          <br />
          2. <strong>試算表整批複製貼上：</strong>直接複製 Excel 或 Google 試算表範圍 (Ctrl+C)，在下方框中貼上，或拖放檔案下載的範本上傳，即可一秒整批對齊！
        </p>
      </div>

      {/* Grid of Preference */}
      <div className="bg-[#FAF9F6] rounded-2xl border border-[#D8D2C2] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#D8D2C2] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-serif font-bold text-[#4A3D33]">
              🗓️ 夥伴本季排班意願互動矩陣表
            </h3>
            <p className="text-3xs text-[#A19882] font-semibold mt-1">
              滑鼠點擊以下個別儲存格即可巡迴切換狀態：🟢 「可排班」➔ 🟡 「備用/彈性」➔ 🔴 「不可排」
            </p>
          </div>
          <div className="flex items-center gap-4 text-3xs font-bold text-[#6D5F52] bg-white px-3 py-1.5 rounded-lg border border-[#D8D2C2]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>可排班</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#D4AF37] inline-block"></span>備用(協調)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FAF9F6] border border-[#D8D2C2] inline-block"></span>不可排</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {staffList.length === 0 || slots.length === 0 ? (
            <div className="p-12 text-center text-[#A19882]">
              <AlertCircle className="w-10 h-10 mx-auto text-[#D8D2C2] mb-2" />
              <p className="text-xs">
                請確認您已在<strong>「店員管理」</strong>中建立夥伴名單，且在
                <strong>「營業時段」</strong>中至少設定了一個開業時段。
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-[#E7E0D3] border-b border-[#D8D2C2] text-[#4A3D33] font-bold">
                  <th className="px-5 py-3 font-serif font-bold w-1/4 min-w-[150px]">夥伴店員名稱</th>
                  {slots.map((slot) => (
                    <th key={slot.id} className="px-5 py-3 text-center min-w-[150px]">
                      <div className="font-serif font-bold">{slot.day}</div>
                      <div className="text-[10px] font-semibold text-[#8B7355]">{slot.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D2C2]/40 bg-white">
                {staffList.map((staff) => {
                  const sAvailObj = availabilities.find((a) => a.staffId === staff.id);
                  return (
                    <tr key={staff.id} className="hover:bg-[#FAF9F6]/50 transition">
                      {/* Name Column */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#4A3D33]">{staff.name}</div>
                        <div className="text-3xs text-[#A19882] font-semibold mt-0.5 max-w-[200px] truncate">
                          上限: {staff.maxShifts} | 職能: {staff.roles.map(r => r.split(" / ")[0]).join(", ")}
                        </div>
                      </td>

                      {/* Preference Columns */}
                      {slots.map((slot) => {
                        const status = getPreference(staff.id, slot.id);
                        const note = sAvailObj?.notes?.[slot.id];
                        
                        // Setup beautiful Natural style states
                        let btnStyle = "bg-[#F5F2ED] hover:bg-[#FAF9F6] text-[#A19882] border-[#D8D2C2]";
                        if (status === "available") {
                          btnStyle = "bg-[#8B7355] text-white hover:bg-[#705D45]";
                        } else if (status === "maybe") {
                          btnStyle = "bg-[#D4AF37] text-white hover:bg-[#C29E30]";
                        }

                        return (
                          <td key={slot.id} className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => cyclePreference(staff.id, slot.id)}
                              className={`w-full max-w-[140px] py-2 px-3 rounded-xl text-3xs font-bold select-none cursor-pointer border transition shadow-sm ${btnStyle}`}
                            >
                              <div className="font-bold">
                                {status === "available" ? "🟢 可排班" : status === "maybe" ? "🟡 備用/彈性" : "❌ 不可排"}
                              </div>
                              {note && (
                                <div className="text-[9px] opacity-90 mt-0.5 truncate max-w-[110px]" title={note}>
                                  💬 {note}
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Excel & CSV Multi-way Importer Panel */}
        <div id="staff-excel-csv-importer" className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#D8D2C2] shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#D8D2C2]/40 pb-2.5">
            <h4 className="text-xs font-serif font-bold text-[#4A3D33] flex items-center gap-1.5">
              <Clipboard className="w-4 h-4 text-[#8B7355]" /> Excel / CSV 試算表匯入工具
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadExcelTemplate}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#D8D2C2] text-[#8B7355] hover:bg-[#8B7355] hover:text-white bg-white hover:border-transparent transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="下載符合目前設置時段的 Excel 意願調查表，填妥後即可直接在此上傳！"
              >
                <Download className="w-3.5 h-3.5" /> 免費下載填寫範本 📥
              </button>
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-[#A19882] cursor-pointer" />
                <div className="absolute right-0 top-6 hidden group-hover:block bg-[#4A3D33] text-white p-3 rounded-lg text-[10px] w-64 shadow-lg z-20 leading-relaxed font-normal">
                  時段與名單格式說明：
                  <br />
                  首欄必須為店員名字，後續各列對應各時段。
                  <br />
                  內容包含「可、OK」視為可排班，「備、可能」視為彈性，空白或「否」為不可。
                  <br />
                  時段將依序對齊或若 header 包含時段字眼則自動比對！
                </div>
              </div>
            </div>
          </div>

          {/* Elegant cozy tabs */}
          <div className="flex border-b border-[#D8D2C2]/30 text-xs font-bold gap-4 pb-1">
            <button
              onClick={() => setActiveTab("file")}
              className={`pb-1.5 px-1 border-b-2 transition cursor-pointer ${
                activeTab === "file" 
                  ? "border-[#8B7355] text-[#8B7355]" 
                  : "border-transparent text-[#A19882] hover:text-[#4A3D33]"
              }`}
            >
              📁 檔案拖曳與選擇 (.xlsx / .csv)
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`pb-1.5 px-1 border-b-2 transition cursor-pointer ${
                activeTab === "paste" 
                  ? "border-[#8B7355] text-[#8B7355]" 
                  : "border-transparent text-[#A19882] hover:text-[#4A3D33]"
              }`}
            >
              📋 試算表剪貼簿貼上
            </button>
          </div>

          {activeTab === "file" ? (
            <div className="space-y-4">
              {/* Show Dropzone or File information */}
              {!selectedFile ? (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    dragActive 
                      ? "border-[#8B7355] bg-[#E7E0D3]/30" 
                      : "border-[#D8D2C2] bg-white hover:bg-[#FAF9F6]/80"
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="hidden" 
                  />
                  <Upload className="w-8 h-8 text-[#8B7355] hover:scale-105 transition" />
                  <p className="text-xs font-bold text-[#4A3D33]">拖曳 xlsx / csv 檔案至此，或點選開啟</p>
                  <p className="text-[10px] text-[#A19882] font-semibold">（支援 .xlsx, .xls, .csv, .tsv 等試算表規格）</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#D8D2C2] p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#D8D2C2]/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#8B7355]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#4A3D33] truncate max-w-[180px]">{selectedFile.name}</p>
                        <p className="text-[10px] text-[#A19882] font-medium">({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedFile(null); setParsedRowsPreview(null); }}
                      className="text-[10px] text-rose-500 font-bold border border-rose-200/50 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded cursor-pointer transition"
                    >
                      更換檔案
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-left select-none">
                    <p className="text-3xs text-[#8B7355] font-extrabold pb-0.5">🔍 偵測到以下店員意願資料：</p>
                    {parsedRowsPreview?.map((preview, idx) => (
                      <div key={idx} className="text-3xs leading-relaxed flex justify-between items-center border-b border-[#FAF9F6] pb-1">
                        <div>
                          <span className="font-bold text-[#4A3D33]">{preview.staffName}</span>
                          {preview.matchedStaff ? (
                            <span className="text-[#8B7355] font-bold ml-1.5">(現有店員)</span>
                          ) : (
                            <span className="text-[#D4AF37] font-bold ml-1.5">(新夥伴，將自動登錄)</span>
                          )}
                        </div>
                        <div className="text-right text-[#A19882] font-semibold">
                          可排 {(Object.values(preview.preferences) as any[]).filter(p => p.status === "available").length} / 備用 {(Object.values(preview.preferences) as any[]).filter(p => p.status === "maybe").length}
                        </div>
                      </div>
                    ))}
                  </div>

                  {fileError && (
                    <p className="text-3xs text-red-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 animate-bounce" /> {fileError}
                    </p>
                  )}

                  <button
                    onClick={applyFileImport}
                    className="w-full py-2.5 px-3 text-xs font-bold rounded-lg text-white bg-[#8B7355] hover:bg-[#705D45] transition flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" /> 匯入此試算表並套用
                  </button>
                </div>
              )}

              {fileError && !selectedFile && (
                <p className="text-3xs text-red-600 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> {fileError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-3xs text-[#6D5F52] leading-relaxed font-semibold">
                貼上從試算表複製 (Ctrl+C) 包含夥伴名字和意願項目的網格，將自動解析。時段將依目前的時段排列順序自動套用：
              </p>

              <textarea
                value={tsvInput}
                onChange={(e) => setTsvInput(e.target.value)}
                placeholder="雅修特拉	可	否	備用&#10;桑克瑞德	否	可	可&#10;于里昂熱	備用	可	否"
                rows={5}
                className="w-full p-3 text-xs font-mono rounded-lg bg-white border border-[#D8D2C2] focus:ring-1 focus:ring-[#8B7355] outline-none text-[#4A3D33] placeholder-slate-400"
              ></textarea>

              {tsvError && (
                <p className="text-3xs text-red-600 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> {tsvError}
                </p>
              )}

              <button
                onClick={handleTsvParse}
                disabled={slots.length === 0 || staffList.length === 0}
                className="w-full py-2.5 px-3 text-xs font-bold rounded-lg text-white bg-[#8B7355] hover:bg-[#705D45] transition flex justify-center items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" /> 載入並大批解析貼上之 Excel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
