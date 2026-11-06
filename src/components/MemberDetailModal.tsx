import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Phone,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Member, Attendance, STL, Transaction } from '../types';

interface MemberDetailModalProps {
  member: Member | null;
  stl?: STL;
  allAttendance: Attendance[];
  transactions: Transaction[];
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  stl,
  allAttendance,
  transactions,
  onClose,
}) => {
  if (!member) return null;

  // Selected Month (Default to current YYYY-MM)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();
  const prefix = member.role === 'TEAM_LEADER' ? 'TL' : 'TT';

  // Filter attendance for this member and selected month
  const memberAttendance = allAttendance.filter(
    (a) => a.memberId === member.id && a.date.startsWith(selectedMonth)
  );

  // Sort dates descending (newest first)
  memberAttendance.sort((a, b) => b.date.localeCompare(a.date));

  // Compute month statistics
  const presentRecords = memberAttendance.filter((a) => a.status === 'PRESENT');
  const absentRecords = memberAttendance.filter((a) => a.status === 'ABSENT');
  const leaveRecords = memberAttendance.filter((a) => a.status === 'LEAVE');

  const totalFines = absentRecords.reduce((sum, a) => sum + (a.penaltyDeducted || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#142B4A]/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(20,43,74,0.12)] max-w-2xl w-full max-h-[90vh] flex flex-col text-[#142B4A] overflow-hidden">
        {/* Modal Header (Sleek) */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                member.role === 'TEAM_LEADER'
                  ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                  : 'bg-emerald-50 text-[#047857] border border-emerald-200'
              }`}
            >
              {prefix}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white shrink-0 ${
                    member.role === 'TEAM_LEADER' ? 'bg-[#2563EB]' : 'bg-[#10B981]'
                  }`}
                >
                  {prefix}
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#142B4A] tracking-tight truncate">
                  {prefix} {cleanName}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    member.role === 'TEAM_LEADER'
                      ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                      : 'bg-emerald-50 text-[#047857] border border-emerald-200'
                  }`}
                >
                  {member.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#64748B] mt-0.5">
                {stl && (
                  <span className="flex items-center gap-1 text-[#64748B] text-[11px] truncate">
                    <Shield className="w-3 h-3 text-[#2563EB] shrink-0" />
                    <span>STL: <strong className="text-[#142B4A] font-bold">{stl.name}</strong></span>
                  </span>
                )}
              </div>
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

        {/* Month Selector & Quick Stats Bar (Sleek) */}
        <div className="p-3 sm:p-4 bg-white border-b border-[#E2E8F0] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
              <label htmlFor="monthSelect" className="text-xs font-bold text-[#142B4A]">
                Month:
              </label>
              <input
                id="monthSelect"
                type="month"
                min="2024-01"
                max="2030-12"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs text-[#142B4A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-bold cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-2 bg-[#F8FAFC] px-3 py-1 rounded-lg border border-[#E2E8F0] text-xs">
              <span className="text-[#64748B]">Wallet:</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  member.balance >= 0 ? 'text-[#047857]' : 'text-rose-600'
                }`}
              >
                ৳{member.balance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 4 Sleek Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 sm:p-2.5 bg-[#F8FAFC] border border-emerald-100 rounded-xl">
              <div className="flex items-center justify-between text-[#047857] text-[11px] font-bold">
                <span>Present</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <div className="mt-0.5 text-base sm:text-lg font-black text-[#142B4A] tabular-nums">
                {presentRecords.length} <span className="text-[10px] font-normal text-[#64748B]">Days</span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-[#F8FAFC] border border-rose-100 rounded-xl">
              <div className="flex items-center justify-between text-rose-600 text-[11px] font-bold">
                <span>Absent</span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="mt-0.5 text-base sm:text-lg font-black text-rose-600 tabular-nums">
                {absentRecords.length} <span className="text-[10px] font-normal text-rose-600/80">Days</span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-[#F8FAFC] border border-amber-100 rounded-xl">
              <div className="flex items-center justify-between text-amber-600 text-[11px] font-bold">
                <span>Leave</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="mt-0.5 text-base sm:text-lg font-black text-[#142B4A] tabular-nums">
                {leaveRecords.length} <span className="text-[10px] font-normal text-[#64748B]">Days</span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-[#F8FAFC] border border-rose-100 rounded-xl">
              <div className="flex items-center justify-between text-rose-600 text-[11px] font-bold">
                <span>Total Fine</span>
                <DollarSign className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="mt-0.5 text-base sm:text-lg font-black text-rose-600 font-mono tabular-nums">
                ৳{totalFines.toLocaleString()}
              </div>
            </div>
          </div>
        </div>


        {/* Detailed Timeline Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Daily Attendance Records ({memberAttendance.length} Days Marked)
            </h4>
          </div>

          {memberAttendance.length === 0 ? (
            <div className="text-center py-10 px-4 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
              <Calendar className="w-7 h-7 text-[#94A3B8] mx-auto mb-1.5" />
              <p className="text-xs font-bold text-[#142B4A]">No records found for this month</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Attendance has not yet been recorded for {selectedMonth}.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {memberAttendance.map((rec) => {
                const dateObj = new Date(rec.date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const fullDate = dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                const timeString = rec.markedAt
                  ? new Date(rec.markedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'Time not recorded';

                const isAbsent = rec.status === 'ABSENT';

                return (
                  <div
                    key={rec.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      isAbsent
                        ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-11 text-center py-1 px-1 rounded-lg border shadow-2xs shrink-0 ${
                          isAbsent
                            ? 'bg-rose-100 border-rose-300 text-rose-800'
                            : 'bg-white border-[#E2E8F0] text-[#142B4A]'
                        }`}
                      >
                        <span className="block text-[9px] uppercase font-bold text-[#64748B]">
                          {dayName}
                        </span>
                        <span className="block text-xs font-black font-mono">
                          {rec.date.split('-')[2]}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#142B4A] truncate">{fullDate}</p>
                        <p className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#2563EB] shrink-0" />
                          <span>Meeting time: <strong className="text-[#142B4A] font-mono">{timeString}</strong></span>
                          {rec.notes && <span className="text-amber-600 ml-1 font-semibold">({rec.notes})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {rec.status === 'PRESENT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                          Present
                        </span>
                      )}
                      {rec.status === 'ABSENT' && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Absent
                          </span>
                          {rec.penaltyDeducted > 0 && (
                            <span className="block text-[10px] font-extrabold text-rose-600 mt-0.5 font-mono tabular-nums">
                              -৳{rec.penaltyDeducted}
                            </span>
                          )}
                        </div>
                      )}
                      {rec.status === 'LEAVE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Leave
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Member Fine Ledger History */}
          {transactions.filter((tx) => tx.memberId === member.id).length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-[#2563EB]" />
                Wallet Transaction Logs
              </h4>
              <div className="space-y-1.5">
                {transactions
                  .filter((tx) => tx.memberId === member.id)
                  .map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#142B4A]">{tx.reason}</span>
                        <span className="text-[10px] text-[#64748B] block font-mono mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString()} · Balance: ৳{tx.previousBalance} → ৳{tx.newBalance}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          tx.type === 'PENALTY' || tx.type === 'ADMIN_DEBIT'
                            ? 'text-rose-600'
                            : 'text-[#047857]'
                        }`}
                      >
                        {tx.type === 'PENALTY' || tx.type === 'ADMIN_DEBIT' ? '-' : '+'}৳{tx.amount}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Sleek) */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] text-white shadow-xs transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
