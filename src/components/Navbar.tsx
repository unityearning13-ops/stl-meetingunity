import React, { useState } from 'react';
import {
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  LogOut,
  CalendarCheck,
  Users,
  Award,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { AuthSession } from '../types';

interface NavbarProps {
  session: AuthSession | null;
  onOpenLogin: (role: 'ADMIN' | 'STL') => void;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  onOpenLogin,
  onLogout,
  activeView,
  setActiveView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] text-[#142B4A] shadow-[0_1px_3px_rgba(20,43,74,0.03)] transition-all">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Brand Wordmark & Emblem */}
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none shrink-0 group min-w-0"
            onClick={() => setActiveView(session?.role === 'ADMIN' ? 'admin_stls' : 'attendance')}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#142B4A] text-white flex items-center justify-center shadow-md shadow-[#142B4A]/15 group-hover:bg-[#1E3A5F] transition shrink-0">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#10B981]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-tight text-[#142B4A] text-xs sm:text-base leading-tight truncate max-w-[200px] xs:max-w-[270px] sm:max-w-none">
                Unity Earning E-Learning Platform
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#2563EB] font-bold tracking-wide uppercase truncate max-w-[200px] xs:max-w-[270px] sm:max-w-none">
                STL Attendance Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Slots (When Logged in as Admin) */}
          {session?.role === 'ADMIN' && (
            <nav className="hidden lg:flex items-center space-x-1 bg-[#F4F6F9] p-1 rounded-xl border border-[#E2E8F0] shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('admin_stls')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeView === 'admin_stls'
                    ? 'bg-white text-[#142B4A] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>STLs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('admin_team_leaders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeView === 'admin_team_leaders'
                    ? 'bg-white text-[#142B4A] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Team Leaders</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('admin_team_trainers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeView === 'admin_team_trainers'
                    ? 'bg-white text-[#142B4A] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Team Trainers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('admin_attendance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeView === 'admin_attendance'
                    ? 'bg-white text-[#142B4A] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('admin_sheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeView === 'admin_sheet'
                    ? 'bg-white text-[#142B4A] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Monthly Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('admin_settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeView === 'admin_settings'
                    ? 'bg-white text-[#142B4A] shadow-sm border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Fines & Wallets</span>
              </button>
            </nav>
          )}

          {/* Right Action / Profile Area */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {session ? (
              <div className="flex items-center space-x-3">
                {session.role === 'STL' && (
                  <div className="hidden sm:flex flex-col text-right pr-1">
                    <span className="text-xs font-bold text-[#142B4A] tracking-tight leading-tight">
                      {session.stl?.name}
                    </span>
                    <span className="text-[11px] text-[#64748B] font-mono leading-tight">
                      {session.stl?.phone}
                    </span>
                  </div>
                )}

                {/* Log Out button positioned cleanly on mobile & desktop */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shadow-2xs shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onOpenLogin('STL')}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-[#F8FAFC] text-[#142B4A] border border-[#CBD5E1] shadow-xs transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>STL Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogin('ADMIN')}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] text-white shadow-sm shadow-[#142B4A]/20 transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Admin Login</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9] rounded-xl transition lg:hidden border border-[#E2E8F0]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 py-4 space-y-3 shadow-lg animate-fade-in">
          {session ? (
            <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#142B4A]">
                  {session.role === 'ADMIN' ? 'Admin Portal' : session.stl?.name}
                </p>
                {session.role === 'STL' && (
                  <p className="text-[11px] text-[#64748B] font-mono">
                    {session.stl?.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-rose-50 border border-rose-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin('STL');
                }}
                className="py-2.5 px-3 text-xs font-bold rounded-xl bg-white text-[#142B4A] border border-[#CBD5E1] flex items-center justify-center gap-1.5 shadow-xs"
              >
                <UserCheck className="w-4 h-4 text-[#10B981]" />
                STL Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin('ADMIN');
                }}
                className="py-2.5 px-3 text-xs font-bold rounded-xl bg-[#142B4A] text-white shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                Admin Login
              </button>
            </div>
          )}

          {session?.role === 'ADMIN' && (
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveView('admin_stls');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[42px] ${
                  activeView === 'admin_stls'
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#142B4A] hover:bg-[#F4F6F9]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                STLs Slot
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('admin_team_leaders');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[42px] ${
                  activeView === 'admin_team_leaders'
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#142B4A] hover:bg-[#F4F6F9]'
                }`}
              >
                <Users className="w-4 h-4 text-[#2563EB]" />
                Team Leaders
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('admin_team_trainers');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[42px] ${
                  activeView === 'admin_team_trainers'
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#142B4A] hover:bg-[#F4F6F9]'
                }`}
              >
                <Award className="w-4 h-4 text-[#10B981]" />
                Team Trainers
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('admin_attendance');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[42px] ${
                  activeView === 'admin_attendance'
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#142B4A] hover:bg-[#F4F6F9]'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-[#2563EB]" />
                Attendance Summary
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('admin_sheet');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[42px] ${
                  activeView === 'admin_sheet'
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#142B4A] hover:bg-[#F4F6F9]'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                Monthly Sheet
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('admin_settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition min-h-[42px] ${
                  activeView === 'admin_settings'
                    ? 'bg-[#142B4A] text-white shadow-sm'
                    : 'text-[#142B4A] hover:bg-[#F4F6F9]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#2563EB]" />
                Fines & Wallets
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
