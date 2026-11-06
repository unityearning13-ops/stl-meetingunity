import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Award,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Search,
  DollarSign,
  Wallet,
  Phone,
  CheckCircle2,
  History,
  FileSpreadsheet,
  CalendarCheck,
  Clock,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  Filter,
  LogOut,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  STL,
  Member,
  Attendance,
  Transaction,
  SystemSettings,
  MemberRole,
} from '../types';
import {
  deleteSTL,
  deleteMember,
  updateSystemSettings,
  clearAllSystemData,
} from '../services/firestoreService';
import { STLModal } from './STLModal';
import { MemberModal } from './MemberModal';
import { BalanceModal } from './BalanceModal';
import { MemberDetailModal } from './MemberDetailModal';
import { MonthlySheetView } from './MonthlySheetView';
import { AdminSTLAttendanceModal } from './AdminSTLAttendanceModal';
import { ConfirmModal } from './ConfirmModal';

interface AdminDashboardProps {
  stls: STL[];
  members: Member[];
  attendance: Attendance[];
  transactions: Transaction[];
  settings: SystemSettings;
  activeTab: 'stls' | 'team_leaders' | 'team_trainers' | 'attendance' | 'sheet' | 'finances';
  setActiveTab: (tab: 'stls' | 'team_leaders' | 'team_trainers' | 'attendance' | 'sheet' | 'finances') => void;
  onViewAttendanceForSTL: (stlId: string) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stls,
  members,
  attendance,
  transactions,
  settings,
  activeTab,
  setActiveTab,
  onViewAttendanceForSTL,
  onLogout,
}) => {
  // Modal states
  const [stlModalOpen, setStlModalOpen] = useState(false);
  const [stlToEdit, setStlToEdit] = useState<STL | null>(null);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [memberModalRole, setMemberModalRole] = useState<MemberRole>('TEAM_LEADER');

  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [memberForBalance, setMemberForBalance] = useState<Member | null>(null);

  const [inspectedMember, setInspectedMember] = useState<Member | null>(null);

  const [manageAttendanceSTL, setManageAttendanceSTL] = useState<STL | null>(null);
  const [manageAttendanceModalOpen, setManageAttendanceModalOpen] = useState(false);

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

  // Settings form
  const [penaltyInput, setPenaltyInput] = useState<number>(settings.absentPenaltyAmount || 50);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');
  const [stlFilter, setStlFilter] = useState('ALL');

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (stlId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [stlId]: !prev[stlId] }));
  };

  // Dedicated lists
  const teamLeadersList = useMemo(() => {
    return members.filter((m) => m.role === 'TEAM_LEADER');
  }, [members]);

  const teamTrainersList = useMemo(() => {
    return members.filter((m) => m.role === 'TEAM_TRAINER');
  }, [members]);

  // Overall financial summary metrics
  const financialMetrics = useMemo(() => {
    const totalBalance = members.reduce((sum, m) => sum + (m.balance || 0), 0);
    const today = new Date();
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthlyFines = attendance
      .filter((a) => a.date.startsWith(currentMonthPrefix) && a.status === 'ABSENT')
      .reduce((sum, a) => sum + (a.penaltyDeducted || 0), 0);
    return { totalBalance, monthlyFines };
  }, [members, attendance]);

  // Compute monthly stats for a member
  const getMemberStats = (memberId: string) => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthlyRecords = attendance.filter(
      (a) => a.memberId === memberId && a.date.startsWith(currentMonthStr)
    );
    const present = monthlyRecords.filter((a) => a.status === 'PRESENT').length;
    const absent = monthlyRecords.filter((a) => a.status === 'ABSENT').length;
    const leave = monthlyRecords.filter((a) => a.status === 'LEAVE').length;
    const totalFine = monthlyRecords
      .filter((a) => a.status === 'ABSENT')
      .reduce((sum, a) => sum + (a.penaltyDeducted || 0), 0);

    return { present, absent, leave, totalFine };
  };

  // Filtered Team Leaders
  const filteredTeamLeaders = useMemo(() => {
    return teamLeadersList.filter((m) => {
      if (stlFilter !== 'ALL' && m.stlId !== stlFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.phone.includes(q);
      }
      return true;
    });
  }, [teamLeadersList, stlFilter, searchQuery]);

  // Filtered Team Trainers
  const filteredTeamTrainers = useMemo(() => {
    return teamTrainersList.filter((m) => {
      if (stlFilter !== 'ALL' && m.stlId !== stlFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.phone.includes(q);
      }
      return true;
    });
  }, [teamTrainersList, stlFilter, searchQuery]);

  // Handle Delete STL with Custom Confirm Modal
  const handleDeleteSTL = (stl: STL) => {
    const assignedMembers = members.filter((m) => m.stlId === stl.id);
    let msg = `Are you sure you want to delete Sub Team Leader "${stl.name}"?`;
    if (assignedMembers.length > 0) {
      msg += `\n\nNote: ${assignedMembers.length} member(s) assigned under this STL will also be deleted.`;
    }

    setConfirmConfig({
      isOpen: true,
      title: `Delete STL "${stl.name}"`,
      message: msg,
      confirmText: 'Delete STL',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          await deleteSTL(
            stl.id,
            assignedMembers.map((m) => m.id)
          );
          closeConfirm();
        } catch (err) {
          console.error('Delete STL error:', err);
          closeConfirm();
        }
      },
    });
  };

  // Handle Delete Member with Custom Confirm Modal
  const handleDeleteMember = (m: Member) => {
    const cleanName = m.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();
    const roleLabel = m.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer';

    setConfirmConfig({
      isOpen: true,
      title: `Delete ${roleLabel} "${cleanName}"`,
      message: `Are you sure you want to delete "${cleanName}"?\n\nThis will permanently delete their profile and associated attendance logs.`,
      confirmText: 'Delete Member',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          await deleteMember(m.id);
          closeConfirm();
        } catch (err) {
          console.error('Delete member error:', err);
          closeConfirm();
        }
      },
    });
  };

  // Master Clear All System Data Handler with Custom Confirm Modal
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const handleMasterClearAllData = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Master System Reset (All Clear)',
      message:
        'CRITICAL WARNING: Are you sure you want to perform a MASTER RESET?\n\nThis will permanently delete ALL attendance records, clear transaction logs, and reset all member wallet balances to 0 BDT.\n\nThis action CANNOT be undone!',
      confirmText: 'Reset All System Data',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
          setIsResettingData(true);
          await clearAllSystemData();
          setResetSuccessMsg(
            'All system attendance records and member wallet balances have been completely reset to zero BDT.'
          );
          setTimeout(() => setResetSuccessMsg(null), 7000);
          closeConfirm();
        } catch (err) {
          console.error(err);
          closeConfirm();
        } finally {
          setIsResettingData(false);
        }
      },
    });
  };

  // Handle Save Penalty Settings
  const handleSavePenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await updateSystemSettings({ absentPenaltyAmount: Number(penaltyInput) || 50 });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to update penalty settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 space-y-4 sm:space-y-6">
      {/* Modals */}
      {stlModalOpen && (
        <STLModal
          isOpen={stlModalOpen}
          stlToEdit={stlToEdit}
          onClose={() => {
            setStlModalOpen(false);
            setStlToEdit(null);
          }}
          onSaved={() => {}}
        />
      )}

      {memberModalOpen && (
        <MemberModal
          isOpen={memberModalOpen}
          memberToEdit={memberToEdit}
          targetRole={memberModalRole}
          stls={stls}
          onClose={() => {
            setMemberModalOpen(false);
            setMemberToEdit(null);
          }}
          onSaved={() => {}}
        />
      )}

      {balanceModalOpen && (
        <BalanceModal
          isOpen={balanceModalOpen}
          member={memberForBalance}
          onClose={() => {
            setBalanceModalOpen(false);
            setMemberForBalance(null);
          }}
          onSaved={() => {}}
        />
      )}

      {inspectedMember && (
        <MemberDetailModal
          member={inspectedMember}
          stl={stls.find((s) => s.id === inspectedMember.stlId)}
          allAttendance={attendance}
          transactions={transactions}
          onClose={() => setInspectedMember(null)}
        />
      )}

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

      {manageAttendanceModalOpen && (
        <AdminSTLAttendanceModal
          isOpen={manageAttendanceModalOpen}
          stl={manageAttendanceSTL}
          stls={stls}
          members={members}
          attendance={attendance}
          settings={settings}
          onClose={() => {
            setManageAttendanceModalOpen(false);
            setManageAttendanceSTL(null);
          }}
        />
      )}

      {/* Top Fintech KPI Header Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(20,43,74,0.04)]">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold">
            <span>Authorized STLs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#142B4A] mt-2 tabular-nums">
            {stls.length}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Sub Team Leaders active</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(20,43,74,0.04)]">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold">
            <span>Total Team Members</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#2563EB] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#142B4A] mt-2 tabular-nums">
            {members.length}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">
            {teamLeadersList.length} Leaders · {teamTrainersList.length} Trainers
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(20,43,74,0.04)]">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold">
            <span>Total Member Capital</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#10B981]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#047857] mt-2 tabular-nums font-mono">
            ৳{financialMetrics.totalBalance.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Combined wallet balance</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(20,43,74,0.04)]">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold">
            <span>Monthly Fines</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-2 tabular-nums font-mono">
            ৳{financialMetrics.monthlyFines.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Rate: ৳{settings.absentPenaltyAmount || 50} / absence</p>
        </div>
      </div>

      {/* Admin Dedicated Navigation Tabs (6 Slots) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => {
            setActiveTab('stls');
            setSearchQuery('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
            activeTab === 'stls'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          <span>STLs ({stls.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('team_leaders');
            setSearchQuery('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
            activeTab === 'team_leaders'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9]'
          }`}
        >
          <Users className="w-4 h-4 text-[#2563EB]" />
          <span>Team Leaders</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('team_trainers');
            setSearchQuery('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
            activeTab === 'team_trainers'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9]'
          }`}
        >
          <Award className="w-4 h-4 text-[#10B981]" />
          <span>Team Trainers</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('attendance');
            setSearchQuery('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
            activeTab === 'attendance'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9]'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-[#2563EB]" />
          <span>Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('sheet');
            setSearchQuery('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
            activeTab === 'sheet'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
          <span>Monthly Sheet</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('finances');
            setSearchQuery('');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px] ${
            activeTab === 'finances'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9]'
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#2563EB]" />
          <span>Fines & Wallets</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SLOT 1: STL ACCOUNTS SLOT                                */}
      {/* ======================================================== */}
      {activeTab === 'stls' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] p-4 sm:p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#142B4A] tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                Sub Team Leader (STL) Accounts
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Register authorized STL login credentials. Passwords can be viewed or changed anytime.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStlToEdit(null);
                setStlModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] text-white shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto min-h-[40px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#10B981]" />
              Create STL Account
            </button>
          </div>

          {stls.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl p-6">
              <ShieldCheck className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#142B4A]">No STL Accounts Registered</h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
                Click "Create STL Account" to add the first Sub Team Leader with name, phone number, and password.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStlToEdit(null);
                  setStlModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#142B4A] text-white transition"
              >
                + Create First STL
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stls.map((stl) => {
                const assignedTL = members.filter((m) => m.stlId === stl.id && m.role === 'TEAM_LEADER');
                const assignedTT = members.filter((m) => m.stlId === stl.id && m.role === 'TEAM_TRAINER');
                const isPassVisible = visiblePasswords[stl.id] || false;

                return (
                  <div
                    key={stl.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#CBD5E1] hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center font-bold text-sm">
                          {stl.name.charAt(0)}
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F4F6F9] text-[#142B4A] border border-[#E2E8F0]">
                          {assignedTL.length + assignedTT.length} Members
                        </span>
                      </div>

                      <h3 className="font-extrabold text-[#142B4A] text-base mt-3">{stl.name}</h3>

                      <div className="space-y-2 mt-3.5 text-xs">
                        <div className="flex items-center justify-between text-[#64748B] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                            Phone (ID):
                          </span>
                          <strong className="text-[#142B4A] font-mono">{stl.phone}</strong>
                        </div>

                        <div className="flex items-center justify-between text-[#64748B] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Lock className="w-3.5 h-3.5 text-[#2563EB]" />
                            Password:
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <strong className="text-[#142B4A] font-mono">
                              {isPassVisible ? stl.password : '••••••••'}
                            </strong>
                            <button
                              type="button"
                              onClick={() => togglePassword(stl.id)}
                              className="text-[#64748B] hover:text-[#142B4A] p-0.5"
                              title={isPassVisible ? 'Hide password' : 'Show password'}
                            >
                              {isPassVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-[11px] text-[#64748B]">
                        <span className="text-[#2563EB] font-bold">{assignedTL.length} Leaders</span>
                        <span>·</span>
                        <span className="text-[#047857] font-bold">{assignedTT.length} Trainers</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setManageAttendanceSTL(stl);
                          setManageAttendanceModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                        title="Edit or Delete Daily Attendance for this STL"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Daily Attendance (Edit/Delete)</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setStlToEdit(stl);
                            setStlModalOpen(true);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9] rounded-lg transition"
                          title="Edit Details / Change Password"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSTL(stl)}
                          className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete STL"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SLOT 2: TEAM LEADERS SLOT ONLY                           */}
      {/* ======================================================== */}
      {activeTab === 'team_leaders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] p-4 sm:p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#142B4A] tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2563EB]" />
                Team Leaders Management
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Register and track Team Leaders under designated Sub Team Leaders.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMemberModalRole('TEAM_LEADER');
                setMemberToEdit(null);
                setMemberModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto min-h-[40px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Team Leader
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          {teamLeadersList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leader name or phone..."
                  className="w-full pl-10 pr-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {stls.length > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-[#64748B]" />
                  <select
                    value={stlFilter}
                    onChange={(e) => setStlFilter(e.target.value)}
                    className="bg-white border border-[#E2E8F0] text-[#142B4A] text-xs font-bold rounded-xl px-3 py-2 focus:outline-none w-full sm:w-auto"
                  >
                    <option value="ALL">All STLs</option>
                    {stls.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {filteredTeamLeaders.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl p-6">
              <Users className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#142B4A]">No Team Leaders Registered</h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
                Add Team Leaders to assign them under an STL and track their attendance.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMemberModalRole('TEAM_LEADER');
                  setMemberToEdit(null);
                  setMemberModalOpen(true);
                }}
                disabled={stls.length === 0}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#2563EB] text-white shadow-sm transition disabled:opacity-50"
              >
                {stls.length === 0 ? 'Create an STL First' : '+ Add First Team Leader'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredTeamLeaders.map((member) => {
                const stl = stls.find((s) => s.id === member.stlId);
                const stats = getMemberStats(member.id);

                return (
                  <div
                    key={member.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 sm:p-5 shadow-xs hover:border-[#CBD5E1] hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-3.5">
                      <div
                        onClick={() => setInspectedMember(member)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-105 transition shrink-0"
                        title="View Attendance History"
                      >
                        {member.name.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            onClick={() => setInspectedMember(member)}
                            className="font-extrabold text-[#142B4A] text-sm hover:text-[#2563EB] cursor-pointer truncate"
                          >
                            {member.name}
                          </h4>
                          <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                            Leader
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 truncate">
                          STL: <strong className="text-[#142B4A]">{stl?.name || 'Unassigned'}</strong>
                        </p>
                        <p className="text-xs font-mono font-bold mt-1 text-[#047857] tabular-nums">
                          Wallet: ৳{member.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]">
                      <button
                        type="button"
                        onClick={() => setInspectedMember(member)}
                        className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Monthly Attendance History"
                      >
                        <History className="w-4 h-4 text-[#2563EB]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMemberForBalance(member);
                          setBalanceModalOpen(true);
                        }}
                        className="p-2 text-[#64748B] hover:text-[#047857] hover:bg-emerald-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Adjust Wallet Balance (Add/Deduct)"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMemberModalRole('TEAM_LEADER');
                          setMemberToEdit(member);
                          setMemberModalOpen(true);
                        }}
                        className="p-2 text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9] rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member)}
                        className="p-2 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SLOT 3: TEAM TRAINERS SLOT ONLY                          */}
      {/* ======================================================== */}
      {activeTab === 'team_trainers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] p-4 sm:p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#142B4A] tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-[#10B981]" />
                Team Trainers Management
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Register and track Team Trainers under designated Sub Team Leaders.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMemberModalRole('TEAM_TRAINER');
                setMemberToEdit(null);
                setMemberModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto min-h-[40px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Team Trainer
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          {teamTrainersList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trainer name or phone..."
                  className="w-full pl-10 pr-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              {stls.length > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-[#64748B]" />
                  <select
                    value={stlFilter}
                    onChange={(e) => setStlFilter(e.target.value)}
                    className="bg-white border border-[#E2E8F0] text-[#142B4A] text-xs font-bold rounded-xl px-3 py-2 focus:outline-none w-full sm:w-auto"
                  >
                    <option value="ALL">All STLs</option>
                    {stls.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {filteredTeamTrainers.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl p-6">
              <Award className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#142B4A]">No Team Trainers Registered</h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
                Add Team Trainers to assign them under an STL and track their attendance.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMemberModalRole('TEAM_TRAINER');
                  setMemberToEdit(null);
                  setMemberModalOpen(true);
                }}
                disabled={stls.length === 0}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#10B981] text-white shadow-sm transition disabled:opacity-50"
              >
                {stls.length === 0 ? 'Create an STL First' : '+ Add First Team Trainer'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredTeamTrainers.map((member) => {
                const stl = stls.find((s) => s.id === member.stlId);

                return (
                  <div
                    key={member.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 sm:p-5 shadow-xs hover:border-[#CBD5E1] hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-3.5">
                      <div
                        onClick={() => setInspectedMember(member)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-[#047857] border border-emerald-100 flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-105 transition shrink-0"
                        title="View Attendance History"
                      >
                        {member.name.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            onClick={() => setInspectedMember(member)}
                            className="font-extrabold text-[#142B4A] text-sm hover:text-[#047857] cursor-pointer truncate"
                          >
                            {member.name}
                          </h4>
                          <span className="text-[10px] font-bold text-[#047857] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            Trainer
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 truncate">
                          STL: <strong className="text-[#142B4A]">{stl?.name || 'Unassigned'}</strong>
                        </p>
                        <p className="text-xs font-mono font-bold mt-1 text-[#047857] tabular-nums">
                          Wallet: ৳{member.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]">
                      <button
                        type="button"
                        onClick={() => setInspectedMember(member)}
                        className="p-2 text-[#64748B] hover:text-[#047857] hover:bg-emerald-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Monthly Attendance History"
                      >
                        <History className="w-4 h-4 text-[#10B981]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMemberForBalance(member);
                          setBalanceModalOpen(true);
                        }}
                        className="p-2 text-[#64748B] hover:text-[#047857] hover:bg-emerald-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Adjust Wallet Balance (Add/Deduct)"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMemberModalRole('TEAM_TRAINER');
                          setMemberToEdit(member);
                          setMemberModalOpen(true);
                        }}
                        className="p-2 text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9] rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member)}
                        className="p-2 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SLOT 4: ADMIN ATTENDANCE SECTION (TEAM LEADERS & TRAINERS) */}
      {/* ======================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#142B4A] tracking-tight flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#2563EB]" />
                Admin Attendance Summary & Logs
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Overview of Team Leaders and Team Trainers attendance counts, fines, and detailed view logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const doc = new jsPDF();
                  const today = new Date();
                  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                  
                  const tableData: any[] = [];
                  const headers = [['SN', 'Designation', 'Member Name', 'P', 'A', 'L', 'Fine (BDT)']];

                  // Order: Team Leaders then Team Trainers
                  const allMembers = [
                    ...members.filter(m => m.role === 'TEAM_LEADER'),
                    ...members.filter(m => m.role === 'TEAM_TRAINER')
                  ];

                  allMembers.forEach((m, i) => {
                    const stats = getMemberStats(m.id);
                    tableData.push([
                      i + 1,
                      m.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer',
                      m.name,
                      stats.present,
                      stats.absent,
                      stats.leave,
                      stats.totalFine || 0
                    ]);
                  });

                  doc.setFontSize(13);
                  doc.text('Unity Earning E-Learning Platform', 14, 14);
                  doc.setFontSize(10);
                  doc.text(`Attendance Summary Report | Date: ${new Date().toLocaleDateString()} | Month: ${today.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 21);

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

                  doc.save(`Attendance_Report_${today.toISOString().split('T')[0]}.pdf`);
                }}
                className="px-4 py-2 bg-white border border-[#CBD5E1] text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                title="Download Attendance PDF Report"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF Report</span>
              </button>

              {stls.length > 1 && (
                <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-[#64748B]" />
                <select
                  value={stlFilter}
                  onChange={(e) => setStlFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#142B4A] text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="ALL">All STLs</option>
                  {stls.map((s) => (
                    <option key={s.id} value={s.id}>
                      STL: {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

          {/* Dedicated STL Daily Attendance Controller Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#142B4A]">
                  STL Daily Attendance Controller & Editor
                </h3>
                <p className="text-xs text-[#64748B]">
                  Select any Sub Team Leader to edit their submitted day attendance or delete the entire day's records &amp; refund fines.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setManageAttendanceSTL(stls[0] || null);
                setManageAttendanceModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
            >
              <CalendarCheck className="w-4 h-4 text-[#10B981]" />
              <span>Manage STL Day Attendance</span>
            </button>
          </div>

          {/* Sub-Section 1: Team Leaders Attendance Summary */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#2563EB] uppercase tracking-wider">
                Team Leaders Attendance ({filteredTeamLeaders.length})
              </h3>
            </div>

            {filteredTeamLeaders.length === 0 ? (
              <div className="text-center py-10 bg-white border border-[#E2E8F0] rounded-2xl p-6 text-[#64748B] text-xs">
                No Team Leaders found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTeamLeaders.map((member, idx) => {
                  const stats = getMemberStats(member.id);
                  const stl = stls.find((s) => s.id === member.stlId);
                  const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();

                  return (
                    <div
                      key={member.id}
                      className="bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#CBD5E1] transition"
                    >
                      <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] font-mono font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0 mt-0.5 sm:mt-0">
                          #{idx + 1}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#2563EB] text-white font-black text-[10px] tracking-wider shrink-0 shadow-2xs">
                              TL
                            </span>
                            <h4 className="font-extrabold text-[#142B4A] text-xs sm:text-sm bg-blue-50/90 px-2 py-0.5 rounded-lg border border-blue-200/90 truncate">
                              TL {cleanName}
                            </h4>
                            <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                              STL: {stl?.name || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                            <span className="text-[#047857] font-bold tabular-nums">{stats.present} Present</span>
                            <span>·</span>
                            <span className="text-rose-600 font-bold tabular-nums">{stats.absent} Absent</span>
                            <span>·</span>
                            <span className="text-amber-600 font-bold tabular-nums">{stats.leave} Leave</span>
                            <span>·</span>
                            <span className="text-rose-600 font-bold tabular-nums">Fine: ৳{stats.totalFine}</span>
                            <span>·</span>
                            <span className="text-[#047857] font-bold tabular-nums">Balance: ৳{member.balance}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setInspectedMember(member)}
                          className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                          className="p-2 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-Section 2: Team Trainers Attendance Summary */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#047857] uppercase tracking-wider">
                Team Trainers Attendance ({filteredTeamTrainers.length})
              </h3>
            </div>

            {filteredTeamTrainers.length === 0 ? (
              <div className="text-center py-10 bg-white border border-[#E2E8F0] rounded-2xl p-6 text-[#64748B] text-xs">
                No Team Trainers found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTeamTrainers.map((member, idx) => {
                  const stats = getMemberStats(member.id);
                  const stl = stls.find((s) => s.id === member.stlId);
                  const cleanName = member.name.replace(/^(TL|TT)[\s.:-]*/i, '').trim();

                  return (
                    <div
                      key={member.id}
                      className="bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#CBD5E1] transition"
                    >
                      <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#047857] font-mono font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0 mt-0.5 sm:mt-0">
                          #{idx + 1}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#10B981] text-white font-black text-[10px] tracking-wider shrink-0 shadow-2xs">
                              TT
                            </span>
                            <h4 className="font-extrabold text-[#142B4A] text-xs sm:text-sm bg-emerald-50/90 px-2 py-0.5 rounded-lg border border-emerald-200/90 truncate">
                              TT {cleanName}
                            </h4>
                            <span className="text-[10px] font-bold text-[#047857] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                              STL: {stl?.name || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                            <span className="text-[#047857] font-bold tabular-nums">{stats.present} Present</span>
                            <span>·</span>
                            <span className="text-rose-600 font-bold tabular-nums">{stats.absent} Absent</span>
                            <span>·</span>
                            <span className="text-amber-600 font-bold tabular-nums">{stats.leave} Leave</span>
                            <span>·</span>
                            <span className="text-rose-600 font-bold tabular-nums">Fine: ৳{stats.totalFine}</span>
                            <span>·</span>
                            <span className="text-[#047857] font-bold tabular-nums">Balance: ৳{member.balance}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setInspectedMember(member)}
                          className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                          className="p-2 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SLOT 5: ABSENT PENALTY & WALLET BALANCES                 */}
      {/* ======================================================== */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          {/* Penalty Setting Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#142B4A] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#2563EB]" />
              Absent Fine / Penalty Configuration
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Amount in BDT automatically deducted from a member's account whenever an STL marks them as Absent.
            </p>

            {settingsSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Fine setting successfully updated and synchronized across all devices!</span>
              </div>
            )}

            <form onSubmit={handleSavePenalty} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-60">
                <span className="absolute left-3.5 top-2.5 text-[#64748B] font-bold text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={penaltyInput}
                  onChange={(e) => setPenaltyInput(Number(e.target.value))}
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#142B4A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 font-bold text-xs text-white shadow-sm transition disabled:opacity-50 min-h-[40px] whitespace-nowrap"
              >
                {isSavingSettings ? 'Saving...' : 'Save Penalty Rate'}
              </button>
            </form>
          </div>

          {/* Member Wallets List for Fast Credit / Debit */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#142B4A] flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#10B981]" />
                  Member Wallets ({members.length})
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Admin can credit (add) or debit (deduct) funds with auditable transaction logs.
                </p>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-6">
                No members found. Add Team Leaders or Trainers first.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs hover:bg-white hover:border-[#CBD5E1] transition"
                  >
                    <div>
                      <span className="font-extrabold text-[#142B4A] block">{m.name}</span>
                      <span className="text-[11px] text-[#64748B]">
                        {m.role === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-[#047857] text-sm tabular-nums">
                        ৳{m.balance.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMemberForBalance(m);
                          setBalanceModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#F4F6F9] text-[#142B4A] border border-[#CBD5E1] rounded-lg text-xs font-bold transition whitespace-nowrap shadow-2xs"
                      >
                        Adjust ৳
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Master System Clear / Reset All Data Section */}
          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-300">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-900">
                  Master System Clear / Reset All Data
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Clear all historical attendance records, reset transaction history, and set all member wallet balances back to 0 BDT.
                </p>
              </div>
            </div>

            {resetSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#047857] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={handleMasterClearAllData}
                disabled={isResettingData}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 min-h-[40px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResettingData ? 'Resetting All System Data...' : 'Reset All System Data (All Clear)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SLOT 6: MONTHLY ATTENDANCE MATRIX (GOOGLE SHEET VIEW)    */}
      {/* ======================================================== */}
      {activeTab === 'sheet' && (
        <MonthlySheetView
          members={members}
          attendance={attendance}
          onInspectMember={(m) => setInspectedMember(m)}
          isAdmin={true}
        />
      )}
    </div>
  );
};
