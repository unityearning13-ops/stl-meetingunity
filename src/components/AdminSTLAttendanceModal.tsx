import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Users,
} from 'lucide-react';
import { STL, Member, Attendance, AttendanceStatus, SystemSettings } from '../types';
import { saveBatchAttendance, deleteDayAttendanceForSTL } from '../services/firestoreService';
import { ConfirmModal } from './ConfirmModal';

interface AdminSTLAttendanceModalProps {
  isOpen: boolean;
  stl: STL | null;
  stls: STL[];
  members: Member[];
  attendance: Attendance[];
  settings: SystemSettings;
  onClose: () => void;
}

export const AdminSTLAttendanceModal: React.FC<AdminSTLAttendanceModalProps> = ({
  isOpen,
  stl,
  stls,
  members,
  attendance,
  settings,
  onClose,
}) => {
  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedSTLId, setSelectedSTLId] = useState<string>(stl?.id || stls[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 10-Second Pending Countdown & Cooldown
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

  useEffect(() => {
    if (stl) {
      setSelectedSTLId(stl.id);
    } else if (stls.length > 0 && !selectedSTLId) {
      setSelectedSTLId(stls[0].id);
    }
  }, [stl, stls]);

  const activeSTL = useMemo(() => {
    return stls.find((s) => s.id === selectedSTLId) || null;
  }, [stls, selectedSTLId]);

  // Members under this STL
  const stlMembers = useMemo(() => {
    if (!selectedSTLId) return [];
    return members.filter((m) => m.stlId === selectedSTLId);
  }, [members, selectedSTLId]);

  const teamLeaders = useMemo(() => {
    return stlMembers.filter((m) => m.role === 'TEAM_LEADER');
  }, [stlMembers]);

  const teamTrainers = useMemo(() => {
    return stlMembers.filter((m) => m.role === 'TEAM_TRAINER');
  }, [stlMembers]);

  // Check saved records for selected date and STL
  const dayRecordsMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    if (!selectedSTLId || !selectedDate) return map;

    for (const record of attendance) {
      if (record.stlId === selectedSTLId && record.date === selectedDate) {
        map.set(record.memberId, record);
      }
    }
    return map;
  }, [attendance, selectedSTLId, selectedDate]);

  const isDayAlreadySaved = dayRecordsMap.size > 0;

  // Initialize draft when date or STL changes
  useEffect(() => {
    const nextDraft: Record<string, AttendanceStatus> = {};
    for (const member of stlMembers) {
      const existing = dayRecordsMap.get(member.id);
      nextDraft[member.id] = existing ? existing.status : 'PRESENT';
    }
    setAttendanceDraft(nextDraft);
    setAlertMsg(null);
  }, [selectedSTLId, selectedDate, dayRecordsMap, stlMembers]);

  if (!isOpen) return null;

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleStatusChange = (memberId: string, status: AttendanceStatus) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [memberId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const nextDraft: Record<string, AttendanceStatus> = {};
    for (const member of stlMembers) {
      nextDraft[member.id] = status;
    }
    setAttendanceDraft(nextDraft);
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

  const handleInitiateSave = () => {
    if (!selectedSTLId || stlMembers.length === 0 || isSaving || cooldown !== null) return;
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(10);
  };

  const handleCancelSave = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);
    setAlertMsg({ type: 'error', text: 'Attendance save was cancelled.' });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleConfirmSaveNow = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);
    executeSave();
  };

  // Save / Update Attendance
  const executeSave = async () => {
    if (!selectedSTLId || stlMembers.length === 0) return;

    try {
      setIsSaving(true);
      setAlertMsg(null);

      const inputs = stlMembers.map((m) => ({
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

      let msg = `Attendance saved for ${selectedDate}. (${result.savedCount} members recorded)`;
      if (result.penalizedCount > 0) {
        msg += ` (${result.penalizedCount} absent fines applied)`;
      }

      setAlertMsg({ type: 'success', text: msg });
      setTimeout(() => setAlertMsg(null), 5000);

      // Start 10-second cooldown
      setCooldown(10);
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'Failed to save attendance.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete full day's attendance submitted by this STL with Custom Confirm Modal
  const handleDeleteDayAttendance = () => {
    if (!selectedSTLId || !isDayAlreadySaved) return;

    setConfirmConfig({
      isOpen: true,
      title: `Delete Full Day Attendance (${selectedDate})`,
      message: `Are you sure you want to permanently delete all attendance records for ${selectedDate} under ${activeSTL?.name || 'this STL'}?\n\nAny deducted absent fines will be automatically refunded to member wallets.`,
      confirmText: 'Delete Full Day Attendance',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          setIsDeleting(true);
          setAlertMsg(null);

          const res = await deleteDayAttendanceForSTL(
            selectedDate,
            selectedSTLId,
            members,
            attendance
          );
          setAlertMsg({
            type: 'success',
            text: `Full day attendance for ${selectedDate} was deleted successfully. (${res.deletedCount} cleared, ${res.refundedCount} fines refunded).`,
          });
          setTimeout(() => setAlertMsg(null), 6000);
          closeConfirm();
        } catch (err) {
          console.error(err);
          setAlertMsg({ type: 'error', text: 'Failed to delete day attendance.' });
          closeConfirm();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#142B4A]/50 backdrop-blur-md animate-fade-in">
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

      <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(20,43,74,0.18)] max-w-3xl w-full max-h-[92vh] flex flex-col text-[#142B4A] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center font-bold text-sm shrink-0">
              STL
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#142B4A]">
                STL Daily Attendance Management (Admin)
              </h3>
              <p className="text-xs text-[#64748B]">
                Edit attendance or delete the entire day submitted by any Sub Team Leader.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#142B4A] rounded-xl hover:bg-[#E2E8F0] transition shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STL Selector, Date Picker & Delete Action Bar */}
        <div className="p-3 sm:p-5 bg-white border-b border-[#E2E8F0] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* STL Picker */}
            <div className="flex items-center space-x-2">
              <label htmlFor="stlSelect" className="text-xs font-bold text-[#142B4A] shrink-0">
                Sub Team Leader:
              </label>
              <select
                id="stlSelect"
                value={selectedSTLId}
                onChange={(e) => setSelectedSTLId(e.target.value)}
                className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#142B4A] text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {stls.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center space-x-1.5 bg-[#F4F6F9] p-1 rounded-xl border border-[#CBD5E1]">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-1 text-[#64748B] hover:text-[#142B4A] rounded-lg hover:bg-white transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                <input
                  type="date"
                  min="2024-01-01"
                  max="2030-12-31"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#142B4A] focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-1 text-[#64748B] hover:text-[#142B4A] rounded-lg hover:bg-white transition"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getTodayString())}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition ${
                  selectedDate === getTodayString()
                    ? 'bg-[#142B4A] text-white'
                    : 'text-[#64748B] hover:text-[#142B4A]'
                }`}
              >
                Today
              </button>
            </div>
          </div>

          {/* Submission Status & Delete Full Day Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
            <div className="flex items-center space-x-2">
              {isDayAlreadySaved ? (
                <span className="flex items-center gap-1.5 text-[#047857] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>
                    Attendance is submitted for <strong>{selectedDate}</strong> ({dayRecordsMap.size} records)
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>No attendance submitted yet for {selectedDate}</span>
                </span>
              )}
            </div>

            {/* Admin Delete Full Day Button */}
            {isDayAlreadySaved && (
              <button
                type="button"
                onClick={handleDeleteDayAttendance}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                title="Delete all attendance records for this date and refund fines"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Full Day Attendance'}</span>
              </button>
            )}
          </div>

          {/* Alert Message */}
          {alertMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
                alertMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-[#047857]'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {alertMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{alertMsg.text}</span>
            </div>
          )}
        </div>

        {/* Member Attendance Editor List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {stlMembers.length === 0 ? (
            <div className="text-center py-12 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E2E8F0] p-6">
              <Users className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#142B4A]">No Team Members mapped under this STL</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Assign Team Leaders or Trainers to this STL to manage attendance.
              </p>
            </div>
          ) : (
            <>
              {/* Quick Action: Mark All Present */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-3 py-1 rounded-lg bg-emerald-50 text-[#047857] border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Mark All Present</span>
                </button>
              </div>

              {/* Team Leaders Section */}
              {teamLeaders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                    <h4 className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                      Team Leaders ({teamLeaders.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {teamLeaders.map((member) => {
                      const status = attendanceDraft[member.id] || 'PRESENT';
                      const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();

                      return (
                        <div
                          key={member.id}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#2563EB] text-white font-black text-[10px] tracking-wider shrink-0 shadow-2xs">
                              TL
                            </span>
                            <span className="font-extrabold text-xs sm:text-sm text-[#142B4A] bg-blue-50/90 px-2 py-0.5 rounded-lg border border-blue-200/90 truncate">
                              TL {cleanName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(member.id, 'PRESENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                status === 'PRESENT'
                                  ? 'bg-[#10B981] text-white shadow-xs'
                                  : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F4F6F9]'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(member.id, 'ABSENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                status === 'ABSENT'
                                  ? 'bg-[#DC2626] text-white shadow-xs'
                                  : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F4F6F9]'
                              }`}
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Absent</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(member.id, 'LEAVE')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                status === 'LEAVE'
                                  ? 'bg-[#D97706] text-white shadow-xs'
                                  : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F4F6F9]'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Leave</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Team Trainers Section */}
              {teamTrainers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                    <h4 className="text-xs font-bold text-[#047857] uppercase tracking-wider">
                      Team Trainers ({teamTrainers.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5">
                    {teamTrainers.map((member) => {
                      const status = attendanceDraft[member.id] || 'PRESENT';
                      const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();

                      return (
                        <div
                          key={member.id}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#10B981] text-white font-black text-[10px] tracking-wider shrink-0 shadow-2xs">
                              TT
                            </span>
                            <span className="font-extrabold text-xs sm:text-sm text-[#142B4A] bg-emerald-50/90 px-2 py-0.5 rounded-lg border border-emerald-200/90 truncate">
                              TT {cleanName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(member.id, 'PRESENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                status === 'PRESENT'
                                  ? 'bg-[#10B981] text-white shadow-xs'
                                  : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F4F6F9]'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(member.id, 'ABSENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                status === 'ABSENT'
                                  ? 'bg-[#DC2626] text-white shadow-xs'
                                  : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F4F6F9]'
                              }`}
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Absent</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(member.id, 'LEAVE')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                status === 'LEAVE'
                                  ? 'bg-[#D97706] text-white shadow-xs'
                                  : 'bg-white text-[#64748B] border border-[#CBD5E1] hover:bg-[#F4F6F9]'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Leave</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer: Meeting Date beside strictly "Save" button */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-[#64748B] hover:text-[#142B4A] hover:bg-[#E2E8F0] transition"
          >
            Close
          </button>

          <div className="flex items-center gap-2.5">
            {/* The Date Badge right beside Save */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-[#142B4A] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="font-mono text-xs font-bold">{selectedDate}</span>
            </div>

            {/* State 1: 10-Second Pending Countdown (Shows Cancel Button + Save Now) */}
            {countdown !== null ? (
              <div className="flex items-center gap-1.5 animate-fade-in shrink-0">
                <button
                  type="button"
                  onClick={handleCancelSave}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] font-bold text-xs text-white shadow-sm transition flex items-center justify-center gap-1 min-h-[38px] shrink-0"
                  title="Cancel save within 10 seconds"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSaveNow}
                  className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 active:scale-[0.98] font-bold text-xs text-white shadow-sm transition flex items-center justify-center gap-1.5 min-h-[38px] shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Saving in {countdown}s (Save Now)</span>
                </button>
              </div>
            ) : cooldown !== null ? (
              /* State 2: 10-Second Post-Save Cooldown */
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-[#64748B]/20 border border-[#CBD5E1] font-bold text-xs text-[#475569] flex items-center justify-center gap-1.5 min-h-[38px] shrink-0 cursor-not-allowed"
              >
                <Clock className="w-3.5 h-3.5 text-[#64748B] animate-spin" />
                <span>Saved! Wait {cooldown}s</span>
              </button>
            ) : (
              /* State 3: Normal Ready to Save */
              <button
                type="button"
                onClick={handleInitiateSave}
                disabled={isSaving || stlMembers.length === 0}
                className="px-6 py-2 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-[0.98] font-bold text-xs sm:text-sm text-white shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[38px]"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Save</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
