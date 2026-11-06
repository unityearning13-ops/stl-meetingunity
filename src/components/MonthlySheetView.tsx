import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  DollarSign,
  Download,
  Eye,
  FileText,
} from 'lucide-react';
import { Member, Attendance, STL } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlySheetViewProps {
  members: Member[];
  attendance: Attendance[];
  activeSTL?: STL | null;
  onInspectMember: (member: Member) => void;
  isAdmin?: boolean;
}

export const MonthlySheetView: React.FC<MonthlySheetViewProps> = ({
  members,
  attendance,
  activeSTL,
  onInspectMember,
  isAdmin = false,
}) => {
  // Selected Month (Default to current YYYY-MM)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEAM_LEADER' | 'TEAM_TRAINER'>('ALL');

  // Parse Year and Month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Total days in this month
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  // Filter members by role
  const displayMembers = useMemo(() => {
    let list = members;
    if (roleFilter !== 'ALL') {
      list = list.filter((m) => m.role === roleFilter);
    }
    // Sort team leaders first, then trainers
    return [...list].sort((a, b) => {
      if (a.role === b.role) return a.name.localeCompare(b.name);
      return a.role === 'TEAM_LEADER' ? -1 : 1;
    });
  }, [members, roleFilter]);

  // Navigate months
  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  // Map attendance for quick cell lookup: key = `${date}_${memberId}`
  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendance.forEach((a) => {
      if (a.date.startsWith(selectedMonth)) {
        map.set(`${a.date}_${a.memberId}`, a);
      }
    });
    return map;
  }, [attendance, selectedMonth]);

  // Month stats for each member
  const memberMonthlyStats = useMemo(() => {
    const stats = new Map<
      string,
      { present: number; absent: number; leave: number; totalFine: number }
    >();

    members.forEach((m) => {
      let present = 0;
      let absent = 0;
      let leave = 0;
      let totalFine = 0;

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateKey = `${selectedMonth}-${dayStr}_${m.id}`;
        const record = attendanceMap.get(dateKey);
        if (record) {
          if (record.status === 'PRESENT') present++;
          else if (record.status === 'ABSENT') {
            absent++;
            totalFine += record.penaltyDeducted || 0;
          } else if (record.status === 'LEAVE') leave++;
        }
      }

      stats.set(m.id, { present, absent, leave, totalFine });
    });

    return stats;
  }, [members, attendanceMap, selectedMonth, totalDaysInMonth]);

  // Month overall summary
  const overallStats = useMemo(() => {
    let totalP = 0;
    let totalA = 0;
    let totalL = 0;
    let totalFines = 0;

    memberMonthlyStats.forEach((st) => {
      totalP += st.present;
      totalA += st.absent;
      totalL += st.leave;
      totalFines += st.totalFine;
    });

    const totalMarked = totalP + totalA + totalL;
    const rate = totalMarked > 0 ? Math.round((totalP / totalMarked) * 100) : 0;

    return { totalP, totalA, totalL, totalFines, rate };
  }, [memberMonthlyStats]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = `Member Name,Role,Phone,Present Days,Absent Days,Leave Days,Total Fines (BDT),Current Balance (BDT)\n`;
    displayMembers.forEach((m) => {
      const st = memberMonthlyStats.get(m.id) || { present: 0, absent: 0, leave: 0, totalFine: 0 };
      csv += `"${m.name}","${m.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer'}","${m.phone}",${st.present},${st.absent},${st.leave},${st.totalFine},${m.balance}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Sheet_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData: any[] = [];
    
    // Header Row: SN, Type, Name, P, A, L, Fine
    const headers = [['SN', 'Designation', 'Member Name', 'P', 'A', 'L', 'Fine (BDT)']];

    // Combine and order: Leaders then Trainers (already filtered/sorted in displayMembers)
    displayMembers.forEach((m, i) => {
      const st = memberMonthlyStats.get(m.id) || { present: 0, absent: 0, leave: 0, totalFine: 0 };
      tableData.push([
        i + 1,
        m.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer',
        m.name,
        st.present,
        st.absent,
        st.leave,
        st.totalFine || 0
      ]);
    });

    doc.setFontSize(13);
    doc.text('Unity Earning E-Learning Platform', 14, 14);
    doc.setFontSize(10);
    doc.text(`Monthly Attendance Report | Month: ${selectedMonth} | Exported: ${new Date().toLocaleDateString()}`, 14, 21);

    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [20, 43, 74], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { halign: 'center' }
      }
    });

    doc.save(`Attendance_Report_${selectedMonth}.pdf`);
  };


  const teamLeaders = useMemo(() => displayMembers.filter(m => m.role === 'TEAM_LEADER'), [displayMembers]);
  const teamTrainers = useMemo(() => displayMembers.filter(m => m.role === 'TEAM_TRAINER'), [displayMembers]);

  const renderMemberRow = (member: Member, idx: number) => {
    const st = memberMonthlyStats.get(member.id) || {
      present: 0,
      absent: 0,
      leave: 0,
      totalFine: 0,
    };
    
    return (
      <div key={member.id} className="py-2 px-3 hover:bg-[#F8FAFC] transition group flex items-center justify-between gap-2 border-b border-[#F1F5F9] last:border-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <span className="text-[9px] font-mono text-[#94A3B8] w-4">{idx + 1}</span>
          <div className="min-w-0">
            <h4 className="font-normal text-[#142B4A] text-xs truncate">
              {member.name}
            </h4>
            <p className="text-[8px] text-[#64748B] font-medium tracking-tighter">ID: {member.phone}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-3 text-[10px] font-normal">
            <div className="flex flex-col items-center">
              <span className="text-[#047857]">{st.present}</span>
              <span className="text-[7px] text-[#94A3B8]">P</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-rose-600">{st.absent}</span>
              <span className="text-[7px] text-[#94A3B8]">A</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-amber-600">{st.leave}</span>
              <span className="text-[7px] text-[#94A3B8]">L</span>
            </div>
          </div>

          <div className="flex flex-col items-end min-w-[45px]">
            <span className="text-[10px] font-medium text-rose-600 tabular-nums">৳{st.totalFine}</span>
            <button
              type="button"
              onClick={() => onInspectMember(member)}
              className="text-[#2563EB] hover:text-blue-700 flex items-center gap-0.5 mt-0.5"
            >
              <Eye className="w-2.5 h-2.5" />
              <span className="text-[8px] font-bold uppercase">View</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <h2 className="text-sm font-bold text-[#142B4A] tracking-tight flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
              Monthly Report
            </h2>
          </div>
          <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
            {activeSTL ? `STL: ${activeSTL.name}` : 'All Members Attendance'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#F4F6F9] p-0.5 rounded-xl border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1 text-[#64748B] hover:text-[#142B4A]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-[#142B4A] focus:outline-none cursor-pointer px-1"
            />
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1 text-[#64748B] hover:text-[#142B4A]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center bg-[#F4F6F9] p-0.5 rounded-xl border border-[#CBD5E1] text-[9px] font-bold">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-2 py-1 rounded-lg transition ${roleFilter === 'ALL' ? 'bg-[#142B4A] text-white' : 'text-[#64748B]'}`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('TEAM_LEADER')}
              className={`px-2 py-1 rounded-lg transition ${roleFilter === 'TEAM_LEADER' ? 'bg-[#2563EB] text-white' : 'text-[#64748B]'}`}
            >
              LEADERS
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('TEAM_TRAINER')}
              className={`px-2 py-1 rounded-lg transition ${roleFilter === 'TEAM_TRAINER' ? 'bg-[#10B981] text-white' : 'text-[#64748B]'}`}
            >
              TRAINERS
            </button>
          </div>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-1.5 rounded-xl bg-white border border-[#CBD5E1] text-[#2563EB] hover:bg-blue-50 transition"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="p-1.5 rounded-xl bg-white border border-[#CBD5E1] text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 px-2"
                title="Export PDF Report"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold">PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team Leaders Section */}
        {(roleFilter === 'ALL' || roleFilter === 'TEAM_LEADER') && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Team Leaders
              </h3>
              <span className="text-[9px] text-[#64748B] font-bold">{teamLeaders.length}</span>
            </div>
            <div className="flex-1">
              {teamLeaders.length === 0 ? (
                <p className="text-[10px] text-[#94A3B8] text-center py-8 font-medium tracking-tight">No leaders found</p>
              ) : (
                teamLeaders.map((m, i) => renderMemberRow(m, i))
              )}
            </div>
          </div>
        )}

        {/* Team Trainers Section */}
        {(roleFilter === 'ALL' || roleFilter === 'TEAM_TRAINER') && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Team Trainers
              </h3>
              <span className="text-[9px] text-[#64748B] font-bold">{teamTrainers.length}</span>
            </div>
            <div className="flex-1">
              {teamTrainers.length === 0 ? (
                <p className="text-[10px] text-[#94A3B8] text-center py-8 font-medium tracking-tight">No trainers found</p>
              ) : (
                teamTrainers.map((m, i) => renderMemberRow(m, i))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


