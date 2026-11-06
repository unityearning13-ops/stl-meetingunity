import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  FileSpreadsheet,
  RotateCcw,
  Users,
  Award,
  LogOut,
  Eye,
  X,
} from 'lucide-react';
import {
  STL,
  Member,
  Attendance,
  AttendanceStatus,
  SystemSettings,
  AuthSession,
} from '../types';
import {
  saveBatchAttendance,
  deleteDayAttendanceForSTL,
  AttendanceInput,
} from '../services/firestoreService';
import { MemberDetailModal } from './MemberDetailModal';
import { MonthlySheetView } from './MonthlySheetView';
import { ConfirmModal } from './ConfirmModal';

interface STLAttendanceViewProps {
  session: AuthSession | null;
  stls: STL[];
  members: Member[];
  attendance: Attendance[];
  settings: SystemSettings;
  onOpenLogin: (role: 'ADMIN' | 'STL') => void;
  onOpenMemberDetail: (member: Member) => void;
  onLogout?: () => void;
}

export const STLAttendanceView: React.FC<STLAttendanceViewProps> = ({
  session,
  stls,
  members,
  attendance,
  settings,
  onOpenLogin,
  onOpenMemberDetail,
  onLogout,
}) => {
  // Today's date in local YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedSTLId, setSelectedSTLId] = useState<string>('');
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingDay, setIsClearingDay] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [inspectedMember, setInspectedMember] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<'DAILY' | 'SHEET'>('DAILY');

  // 10-Second Pending Countdown & 10-Second Post-Save Cooldown
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
  };

  // Enforce STL mapping: If STL is logged in, strictly lock to session.stl.id
  useEffect(() => {
    if (session?.role === 'STL' && session.stl) {
      setSelectedSTLId(session.stl.id);
    } else if (session?.role === 'ADMIN') {
      if (!selectedSTLId && stls.length > 0) {
        setSelectedSTLId(stls[0].id);
      }
    } else {
      if (!selectedSTLId && stls.length > 0) {
        setSelectedSTLId(stls[0].id);
      }
    }
  }, [session, stls, selectedSTLId]);

  const activeSTL = useMemo(() => {
    return stls.find((s) => s.id === selectedSTLId) || null;
  }, [stls, selectedSTLId]);

  // Strictly filter only members mapped to this STL
  const stlMembers = useMemo(() => {
    if (!selectedSTLId) return [];
    return members.filter((m) => m.stlId === selectedSTLId);
  }, [members, selectedSTLId]);

  // Split into Team Leaders & Team Trainers
  const teamLeaders = useMemo(() => {
    return stlMembers.filter((m) => m.role === 'TEAM_LEADER');
  }, [stlMembers]);

  const teamTrainers = useMemo(() => {
    return stlMembers.filter((m) => m.role === 'TEAM_TRAINER');
  }, [stlMembers]);

  // Existing records for this date
  const dayRecordsMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendance.forEach((a) => {
      if (a.date === selectedDate && a.stlId === selectedSTLId) {
        map.set(a.memberId, a);
      }
    });
    return map;
  }, [attendance, selectedDate, selectedSTLId]);

  const isDayAlreadySaved = dayRecordsMap.size > 0;

  // Load existing attendance for this date into draft
  useEffect(() => {
    const newDraft: Record<string, AttendanceStatus> = {};

    stlMembers.forEach((member) => {
      const match = dayRecordsMap.get(member.id);
      if (match) {
        newDraft[member.id] = match.status;
      } else {
        newDraft[member.id] = 'PRESENT';
      }
    });

    setAttendanceDraft(newDraft);
    setSaveSuccessMsg(null);
  }, [selectedDate, selectedSTLId, stlMembers, dayRecordsMap]);

  // Calculate monthly attendance stats for a member
  const getMonthlyStats = (memberId: string) => {
    const monthPrefix = selectedDate.substring(0, 7);
    const monthlyRecords = attendance.filter(
      (a) => a.memberId === memberId && a.date.startsWith(monthPrefix)
    );
    const present = monthlyRecords.filter((a) => a.status === 'PRESENT').length;
    const absent = monthlyRecords.filter((a) => a.status === 'ABSENT').length;
    const leave = monthlyRecords.filter((a) => a.status === 'LEAVE').length;
    const totalFine = monthlyRecords
      .filter((a) => a.status === 'ABSENT')
      .reduce((sum, a) => sum + (a.penaltyDeducted || 0), 0);

    return { present, absent, leave, totalFine };
  };

  const handleStatusChange = (memberId: string, status: AttendanceStatus) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const newDraft: Record<string, AttendanceStatus> = {};
    stlMembers.forEach((m) => {
      newDraft[m.id] = status;
    });
    setAttendanceDraft(newDraft);
  };

  const shiftDate = (daysDelta: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + daysDelta);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Countdown Timer Handler (10s window with Cancel option)
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => {
        if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      };
    } else if (countdown === 0) {
      setCountdown(null);
      executeSave();
    }
  }, [countdown]);

  // Cooldown Timer Handler (Must wait 10s before clicking Save again)
  useEffect(() => {
    if (cooldown === null) return;
    if (cooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => {
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      };
    } else if (cooldown === 0) {
      setCooldown(null);
    }
  }, [cooldown]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  // User clicks Save -> Starts 10-second pending countdown with Cancel option
  const handleInitiateSave = () => {
    if (!selectedSTLId || stlMembers.length === 0 || isSaving || cooldown !== null) return;
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(10);
  };

  // User clicks Cancel within 10 seconds -> Aborts save!
  const handleCancelSave = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);
    setSaveSuccessMsg('Attendance save was cancelled.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // User clicks Save Now to confirm immediately without waiting remaining seconds
  const handleConfirmSaveNow = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);
    executeSave();
  };

  // Execute Batch Attendance Save to Database
  const executeSave = async () => {
    if (!selectedSTLId || stlMembers.length === 0) return;

    try {
      setIsSaving(true);
      const inputs: AttendanceInput[] = stlMembers.map((m) => ({
        memberId: m.id,
        status: attendanceDraft[m.id] || 'PRESENT',
      }));

      const result = await saveBatchAttendance(
        selectedDate,
        selectedSTLId,
        inputs,
        settings.absentPenaltyAmount || 50,
        members,
        attendance
      );

      setSaveSuccessMsg(`Attendance record saved successfully! (${result.savedCount} members recorded)`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      // Start 10-second cooldown before another save is permitted
      setCooldown(10);
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear / Reset an entire day's attendance for this STL with Custom Confirm Modal
  const handleClearDayAttendance = () => {
    if (!selectedSTLId || !isDayAlreadySaved) return;

    setConfirmConfig({
      isOpen: true,
      title: `Reset Day Attendance (${selectedDate})`,
      message: `Are you sure you want to delete and reset all attendance for ${selectedDate} under this STL?\n\nAny deducted absent fines will be refunded automatically to member wallets.`,
      confirmText: 'Reset Day Attendance',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          setIsClearingDay(true);
          const res = await deleteDayAttendanceForSTL(
            selectedDate,
            selectedSTLId,
            members,
            attendance
          );
          setSaveSuccessMsg(
            `Attendance for ${selectedDate} cleared (${res.deletedCount} cleared, ${res.refundedCount} fines refunded).`
          );
          setTimeout(() => setSaveSuccessMsg(null), 5000);
          closeConfirm();
        } catch (err) {
          console.error(err);
          closeConfirm();
        } finally {
          setIsClearingDay(false);
        }
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-36 space-y-4 sm:space-y-5">
      {/* Custom Confirm Dialog Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={confirmConfig.isLoading}
        onConfirm={confirmConfig.onConfirm}
        onClose={closeConfirm}
      />

      {/* Inspected member detail modal */}
      {inspectedMember && (
        <MemberDetailModal
          member={inspectedMember}
          stl={activeSTL || undefined}
          allAttendance={attendance}
          transactions={[]}
          onClose={() => setInspectedMember(null)}
        />
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_4px_20px_rgba(20,43,74,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
        {/* Left: STL Info and Mapped Team Counts */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Meeting Attendance Session
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-[#142B4A] tracking-tight">
            {activeSTL ? activeSTL.name : 'Attendance Portal'}
          </h2>

          <p className="text-xs text-[#64748B]">
            {activeSTL ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span>Phone:</span>
                <strong className="text-[#142B4A] font-mono">{activeSTL.phone}</strong>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-[#2563EB] font-bold">{teamLeaders.length} Team Leaders</span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-[#047857] font-bold">{teamTrainers.length} Team Trainers</span>
              </span>
            ) : (
              'Select an STL to record attendance'
            )}
          </p>
        </div>

        {/* Right: View Mode Toggle & Admin STL Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
          {/* Admin STL switcher */}
          {session?.role === 'ADMIN' && stls.length > 1 && (
            <select
              value={selectedSTLId}
              onChange={(e) => setSelectedSTLId(e.target.value)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#142B4A] text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-full sm:w-auto min-h-[40px]"
            >
              {stls.map((s) => (
                <option key={s.id} value={s.id}>
                  STL: {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Mode Switch: Daily vs Monthly Sheet (Google Sheet) */}
          <div className="flex items-center space-x-1 bg-[#F4F6F9] p-1 rounded-2xl border border-[#CBD5E1] text-xs shadow-inner w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('DAILY')}
              className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[40px] sm:min-h-[36px] ${
                viewMode === 'DAILY'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#142B4A]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Marking</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('SHEET')}
              className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[40px] sm:min-h-[36px] ${
                viewMode === 'SHEET'
                  ? 'bg-[#10B981] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#142B4A]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Monthly Sheet</span>
            </button>
          </div>

          {session?.role === 'STL' && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap min-h-[40px] w-full sm:w-auto"
              title="Log out of STL account"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 1: MONTHLY GOOGLE SHEET VIEW                        */}
      {/* ======================================================== */}
      {viewMode === 'SHEET' ? (
        <MonthlySheetView
          members={stlMembers}
          attendance={attendance}
          activeSTL={activeSTL}
          onInspectMember={(m) => setInspectedMember(m)}
          isAdmin={session?.role === 'ADMIN'}
        />
      ) : (
        /* ======================================================== */
        /* MODE 2: DAILY ATTENDANCE MARKING VIEW                    */
        /* ======================================================== */
        <div className="space-y-4 sm:space-y-5">
          {/* Date Selector & Action Toolbar */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_10px_rgba(20,43,74,0.03)]">
            {/* Date navigation */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-[#142B4A] hidden xs:inline">Meeting Date:</span>
              <div className="flex items-center space-x-1.5 bg-[#F4F6F9] p-1 rounded-xl border border-[#CBD5E1] flex-1 sm:flex-none justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 text-[#64748B] hover:text-[#142B4A] rounded-lg hover:bg-white transition"
                  title="Previous Date"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1.5 px-1.5 sm:px-2">
                  <Calendar className="w-4 h-4 text-[#2563EB]" />
                  <input
                    type="date"
                    min="2024-01-01"
                    max="2030-12-31"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-bold text-[#142B4A] focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="p-1.5 text-[#64748B] hover:text-[#142B4A] rounded-lg hover:bg-white transition"
                  title="Next Date"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate(getTodayString())}
                className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition min-h-[38px] ${
                  selectedDate === getTodayString()
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#142B4A] bg-[#F4F6F9] hover:bg-white border border-[#CBD5E1]'
                }`}
              >
                Today
              </button>
            </div>

            {/* Quick Actions: Mark All Present & Reset Day's Attendance */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-[#047857] border border-emerald-200 hover:bg-emerald-100 transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm min-h-[38px]"
              >
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Mark All Present</span>
              </button>

              {/* Reset Day's Attendance button (Admin Only) */}
              {session?.role === 'ADMIN' && isDayAlreadySaved && (
                <button
                  type="button"
                  onClick={handleClearDayAttendance}
                  disabled={isClearingDay}
                  className="px-3.5 py-2 sm:py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-[#DC2626] border border-rose-200 hover:bg-rose-100 transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm min-h-[38px]"
                  title="Delete all attendance for this date and refund any fines"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {stlMembers.length === 0 && (
            <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
              <UserCheck className="w-12 h-12 text-[#94A3B8] mx-auto mb-2" />
              <h3 className="text-base font-bold text-[#142B4A]">No Members Mapped Under This STL</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                Admin can add Team Leaders and Team Trainers under this STL from the Admin Control Center.
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 1: TEAM LEADERS (TOP)                            */}
          {/* ======================================================== */}
          {teamLeaders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 px-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Team Leaders Section ({teamLeaders.length})
                  </h3>
                </div>
                <span className="text-[11px] text-[#64748B] hidden sm:inline">Click clock icon to view full monthly logs</span>
              </div>

              <div className="space-y-2.5">
                {teamLeaders.map((member, idx) => {
                  const status = attendanceDraft[member.id] || 'PRESENT';
                  const stats = getMonthlyStats(member.id);
                  const savedRecord = dayRecordsMap.get(member.id);
                  const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();

                  return (
                    <div
                      key={member.id}
                      className="bg-white border border-[#E2E8F0] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-xs hover:border-[#CBD5E1] transition space-y-2"
                    >
                      {/* Top Row: Serial #, TL Prefix + Highlighted Name, Wallet Balance */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-[#F4F6F9] text-[#142B4A] font-mono font-bold text-[10px] flex items-center justify-center border border-[#E2E8F0] shrink-0">
                            #{idx + 1}
                          </span>

                          {/* TL Prefix Before Name + Highlighting */}
                          <div
                            onClick={() => setInspectedMember(member)}
                            className="flex items-center gap-1.5 min-w-0 cursor-pointer group"
                            title="Click to view details"
                          >
                            <span className="px-1.5 py-0.5 rounded-md bg-[#2563EB] text-white font-black text-[10px] tracking-wider shrink-0 shadow-2xs">
                              TL
                            </span>
                            <h4 className="font-extrabold text-[#142B4A] text-xs sm:text-sm tracking-tight group-hover:text-[#2563EB] transition truncate bg-blue-50/90 px-2 py-0.5 rounded-lg border border-blue-200/90">
                              TL {cleanName}
                            </h4>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Attendance Stats (Sleek) */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-[#64748B] bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#142B4A]">Monthly Overview</span>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-[#047857] font-bold">{stats.present} P</span>
                          <span className="text-rose-600 font-bold">{stats.absent} A</span>
                          <span className="text-amber-600 font-bold">{stats.leave} L</span>
                          {stats.totalFine > 0 && (
                            <span className="text-rose-700 font-extrabold ml-1">
                              Fine {stats.totalFine}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: 3 Status Buttons + View Details (English Only) */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                        {/* 3 Status Toggle Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 flex-1">
                          {/* PRESENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'PRESENT')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                              status === 'PRESENT'
                                ? 'bg-[#10B981] text-white shadow-sm ring-2 ring-[#10B981]/40'
                                : 'bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Present</span>
                          </button>

                          {/* ABSENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'ABSENT')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                              status === 'ABSENT'
                                ? 'bg-[#DC2626] text-white shadow-sm ring-2 ring-rose-400/40'
                                : 'bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Absent</span>
                          </button>

                          {/* LEAVE */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'LEAVE')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                              status === 'LEAVE'
                                ? 'bg-[#D97706] text-white shadow-sm ring-2 ring-amber-400/40'
                                : 'bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Leave</span>
                          </button>
                        </div>

                        {/* View Details Button - English Only */}
                        <button
                          type="button"
                          onClick={() => setInspectedMember(member)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#142B4A] bg-[#F8FAFC] hover:bg-blue-50 hover:text-[#2563EB] border border-[#CBD5E1] transition flex items-center justify-center gap-1.5 min-h-[38px] active:bg-blue-100 shadow-2xs whitespace-nowrap shrink-0"
                          title="View detailed attendance logs and timestamps"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: TEAM TRAINERS (BOTTOM)                        */}
          {/* ======================================================== */}
          {teamTrainers.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 px-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#047857] uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#10B981]" />
                    Team Trainers Section ({teamTrainers.length})
                  </h3>
                </div>
                <span className="text-[11px] text-[#64748B] hidden sm:inline">Click View Details for logs</span>
              </div>

              <div className="space-y-2.5">
                {teamTrainers.map((member, idx) => {
                  const status = attendanceDraft[member.id] || 'PRESENT';
                  const stats = getMonthlyStats(member.id);
                  const savedRecord = dayRecordsMap.get(member.id);
                  const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();

                  return (
                    <div
                      key={member.id}
                      className="bg-white border border-[#E2E8F0] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-xs hover:border-[#CBD5E1] transition space-y-2"
                    >
                      {/* Top Row: Serial #, TT Prefix + Highlighted Name, Wallet Balance */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-[#F4F6F9] text-[#142B4A] font-mono font-bold text-[10px] flex items-center justify-center border border-[#E2E8F0] shrink-0">
                            #{idx + 1}
                          </span>

                          {/* TT Prefix Before Name + Highlighting */}
                          <div
                            onClick={() => setInspectedMember(member)}
                            className="flex items-center gap-1.5 min-w-0 cursor-pointer group"
                            title="Click to view details"
                          >
                            <span className="px-1.5 py-0.5 rounded-md bg-[#10B981] text-white font-black text-[10px] tracking-wider shrink-0 shadow-2xs">
                              TT
                            </span>
                            <h4 className="font-extrabold text-[#142B4A] text-xs sm:text-sm tracking-tight group-hover:text-[#047857] transition truncate bg-emerald-50/90 px-2 py-0.5 rounded-lg border border-emerald-200/90">
                              TT {cleanName}
                            </h4>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Attendance Stats (Sleek) */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-[#64748B] bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[11px] font-bold text-[#142B4A]">Monthly Overview</span>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-[#047857] font-bold">{stats.present} P</span>
                          <span className="text-rose-600 font-bold">{stats.absent} A</span>
                          <span className="text-amber-600 font-bold">{stats.leave} L</span>
                          {stats.totalFine > 0 && (
                            <span className="text-rose-700 font-extrabold ml-1">
                              Fine {stats.totalFine}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: 3 Status Buttons + View Details (English Only) */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                        {/* 3 Status Toggle Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 flex-1">
                          {/* PRESENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'PRESENT')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                              status === 'PRESENT'
                                ? 'bg-[#10B981] text-white shadow-sm ring-2 ring-[#10B981]/40'
                                : 'bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Present</span>
                          </button>

                          {/* ABSENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'ABSENT')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                              status === 'ABSENT'
                                ? 'bg-[#DC2626] text-white shadow-sm ring-2 ring-rose-400/40'
                                : 'bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Absent</span>
                          </button>

                          {/* LEAVE */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(member.id, 'LEAVE')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                              status === 'LEAVE'
                                ? 'bg-[#D97706] text-white shadow-sm ring-2 ring-amber-400/40'
                                : 'bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] hover:bg-white'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Leave</span>
                          </button>
                        </div>

                        {/* View Details Button - English Only */}
                        <button
                          type="button"
                          onClick={() => setInspectedMember(member)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#142B4A] bg-[#F8FAFC] hover:bg-emerald-50 hover:text-[#047857] border border-[#CBD5E1] transition flex items-center justify-center gap-1.5 min-h-[38px] active:bg-emerald-100 shadow-2xs whitespace-nowrap shrink-0"
                          title="View detailed attendance logs and timestamps"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* UNIFIED BOTTOM SAVE BAR - WITH 10S COUNTDOWN & CANCEL     */}
          {/* ======================================================== */}
          {stlMembers.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#CBD5E1] p-3 sm:p-4 shadow-[0_-4px_25px_rgba(20,43,74,0.08)]">
              <div className="max-w-6xl mx-auto flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
                {/* Meeting Date Display Right Beside Save Button */}
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-[#142B4A] shadow-2xs shrink-0">
                  <Calendar className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span className="font-mono text-xs sm:text-sm font-extrabold tracking-tight">{selectedDate}</span>
                </div>

                {/* State 1: 10-Second Pending Countdown (Shows Cancel Button + Save Now) */}
                {countdown !== null ? (
                  <div className="flex items-center gap-2 animate-fade-in shrink-0">
                    {/* Cancel Button - Aborts save */}
                    <button
                      type="button"
                      onClick={handleCancelSave}
                      className="px-4 sm:px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-1.5 min-h-[40px] shrink-0"
                      title="Cancel save within 10 seconds"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>

                    {/* Save Now / Confirm Countdown Button */}
                    <button
                      type="button"
                      onClick={handleConfirmSaveNow}
                      className="px-5 sm:px-7 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 active:scale-[0.98] font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 min-h-[40px] shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      <span>Saving in {countdown}s (Save Now)</span>
                    </button>
                  </div>
                ) : cooldown !== null ? (
                  /* State 2: 10-Second Post-Save Cooldown */
                  <button
                    type="button"
                    disabled
                    className="px-6 sm:px-8 py-2.5 rounded-xl bg-[#64748B]/20 border border-[#CBD5E1] font-bold text-xs sm:text-sm text-[#475569] flex items-center justify-center gap-2 min-h-[40px] shrink-0 cursor-not-allowed shadow-inner"
                  >
                    <Clock className="w-4 h-4 text-[#64748B] animate-spin" />
                    <span>Saved! Next save in {cooldown}s</span>
                  </button>
                ) : (
                  /* State 3: Normal Ready to Save */
                  <button
                    type="button"
                    onClick={handleInitiateSave}
                    disabled={isSaving}
                    className="px-7 sm:px-9 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-[0.98] font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[40px] shrink-0"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-[#10B981]" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
