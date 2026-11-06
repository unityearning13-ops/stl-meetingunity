import React, { forwardRef } from 'react';
import { Member, Attendance } from '../types';

interface AttendanceImageReportProps {
  members: Member[];
  attendance: Attendance[];
  month: string; // YYYY-MM
}

export const AttendanceImageReport = forwardRef<HTMLDivElement, AttendanceImageReportProps>(
  ({ members, attendance, month }, ref) => {
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const getMemberStats = (memberId: string) => {
      const monthlyRecords = attendance.filter((a) => a.date.startsWith(month) && a.memberId === memberId);
      const present = monthlyRecords.filter((a) => a.status === 'PRESENT').length;
      const absent = monthlyRecords.filter((a) => a.status === 'ABSENT').length;
      const leave = monthlyRecords.filter((a) => a.status === 'LEAVE').length;
      const totalFine = monthlyRecords
        .filter((a) => a.status === 'ABSENT')
        .reduce((sum, a) => sum + (a.penaltyDeducted || 0), 0);

      return { present, absent, leave, totalFine };
    };

    const teamLeaders = members.filter((m) => m.role === 'TEAM_LEADER');
    const teamTrainers = members.filter((m) => m.role === 'TEAM_TRAINER');

    const renderRow = (m: Member, idx: number) => {
      const stats = getMemberStats(m.id);
      return (
        <div key={m.id} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-[9px] font-mono text-gray-400 w-4">{idx + 1}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#142B4A] truncate">{m.name}</p>
              <p className="text-[8px] text-gray-400">ID: {m.phone}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 shrink-0 px-2">
            <div className="flex items-center space-x-2 text-[9px] font-bold">
              <span className="text-emerald-600">{stats.present}P</span>
              <span className="text-rose-500">{stats.absent}A</span>
              <span className="text-amber-500">{stats.leave}L</span>
            </div>
            <div className="w-14 text-right">
              <p className="text-[10px] font-black text-rose-600">৳{stats.totalFine}</p>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className="bg-white w-[375px] min-h-[667px] p-6 font-sans relative"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Header Decor */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>

        <div className="text-center space-y-1 mb-6">
          <h1 className="text-lg font-black tracking-tight text-[#142B4A]">Unity Earning E-Learning Platform</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
            STL Meeting Attendance Sheet
          </p>
          <div className="flex items-center justify-center space-x-2 pt-1">
            <span className="text-[8px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
              Month: {month}
            </span>
            <span className="text-[8px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
              Generated: {today}
            </span>
          </div>
        </div>

        {/* Team Leaders Section */}
        <div className="mb-6">
          <div className="bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center justify-between mb-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-blue-700">Team Leaders</h3>
            <span className="text-[9px] font-bold text-blue-700">{teamLeaders.length}</span>
          </div>
          <div className="space-y-0.5">
            {teamLeaders.length > 0 ? (
              teamLeaders.map((m, i) => renderRow(m, i))
            ) : (
              <p className="text-[9px] text-gray-400 text-center py-2">No leaders registered</p>
            )}
          </div>
        </div>

        {/* Team Trainers Section */}
        <div className="mb-8">
          <div className="bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center justify-between mb-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Team Trainers</h3>
            <span className="text-[9px] font-bold text-emerald-700">{teamTrainers.length}</span>
          </div>
          <div className="space-y-0.5">
            {teamTrainers.length > 0 ? (
              teamTrainers.map((m, i) => renderRow(m, i))
            ) : (
              <p className="text-[9px] text-gray-400 text-center py-2">No trainers registered</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 inset-x-6 border-t border-gray-100 pt-4 flex items-center justify-between">
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
            Unity Earning E-Learning Platform · Secure Report
          </p>
        </div>
      </div>
    );
  }
);
