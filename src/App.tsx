/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  STL,
  Member,
  Attendance,
  Transaction,
  SystemSettings,
  AuthSession,
} from './types';
import { testFirestoreConnection } from './firebase';
import {
  subscribeSettings,
  subscribeSTLs,
  subscribeMembers,
  subscribeAttendance,
  subscribeTransactions,
  cleanupDemoData,
} from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { STLAttendanceView } from './components/STLAttendanceView';
import { AdminDashboard } from './components/AdminDashboard';
import { MemberDetailModal } from './components/MemberDetailModal';
import {
  CalendarCheck,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Banknote,
  Menu,
  X,
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem('unity_attendance_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<string>(
    session?.role === 'ADMIN' ? 'admin_attendance' : 'attendance'
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'ADMIN' | 'STL'>('STL');
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);

  // Firestore real-time state
  const [settings, setSettings] = useState<SystemSettings>({
    absentPenaltyAmount: 50,
    platformName: 'Unity Earning E-Learning Platform',
  });
  const [stls, setStls] = useState<STL[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Inspected member modal
  const [inspectedMember, setInspectedMember] = useState<Member | null>(null);

  // Boot, test connection & remove any residual demo records
  useEffect(() => {
    testFirestoreConnection();
    cleanupDemoData();

    const unsubSettings = subscribeSettings((newSettings) => {
      setSettings(newSettings);
    });

    const unsubSTLs = subscribeSTLs((newList) => {
      setStls(newList);
      setIsLoading(false);
    });

    const unsubMembers = subscribeMembers((newList) => {
      setMembers(newList);
    });

    const unsubAttendance = subscribeAttendance((newList) => {
      setAttendance(newList);
    });

    const unsubTx = subscribeTransactions((newList) => {
      setTransactions(newList);
    });

    return () => {
      unsubSettings();
      unsubSTLs();
      unsubMembers();
      unsubAttendance();
      unsubTx();
    };
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    try {
      localStorage.setItem('unity_attendance_session', JSON.stringify(newSession));
    } catch (e) {
      console.warn(e);
    }
    showToast(`Signed in successfully as ${newSession.role === 'ADMIN' ? 'Administrator' : newSession.stl?.name}`);

    if (newSession.role === 'ADMIN') {
      setActiveView('admin_attendance');
    } else {
      setActiveView('attendance');
    }
  };

  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem('unity_attendance_session');
    } catch (e) {
      console.warn(e);
    }
    setActiveView('attendance');
    showToast('Signed out of the portal.');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenLogin = (role: 'ADMIN' | 'STL') => {
    setAuthModalRole(role);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-[#142B4A] flex flex-col font-sans selection:bg-[#2563EB] selection:text-white antialiased overflow-hidden h-screen">
      {/* Top Navbar - Only show when logged in */}
      {session && (
        <Navbar
          session={session}
          onOpenLogin={handleOpenLogin}
          onLogout={handleLogout}
          activeView={activeView}
          setActiveView={setActiveView}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 px-4 py-3 bg-white border border-[#10B981] text-[#047857] text-xs font-bold rounded-xl shadow-lg flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          role={authModalRole}
          stls={stls}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Inspected Member Detail Modal */}
      {inspectedMember && (
        <MemberDetailModal
          member={inspectedMember}
          stl={stls.find((s) => s.id === inspectedMember.stlId)}
          allAttendance={attendance}
          transactions={transactions}
          onClose={() => setInspectedMember(null)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-3 px-4">
            <div className="w-9 h-9 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-[#64748B] tracking-wide">Connecting to Live Cloud Database...</p>
          </div>
        ) : !session ? (
          /* Tightened Replica for Single Screen View */
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative h-full">
            {/* Top Wave Background */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#E0F2FE] to-transparent -z-10 opacity-60">
              <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path fill="#ffffff" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
              </svg>
            </div>

            {/* Executive Branded Top Header Banner */}
            <header className="px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-[#0F1E36] via-[#142B4A] to-[#1E3A8A] text-white border-b border-[#1E3A5F] shadow-[0_4px_20px_rgba(20,43,74,0.15)] flex items-center justify-between z-30 shrink-0 relative">
              {/* Left Brand Identity */}
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#10B981] flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                  <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base md:text-lg font-black text-white leading-tight tracking-tight truncate">
                      Unity Earning E-Learning Platform
                    </h1>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-[#34D399] bg-[#10B981]/20 border border-[#10B981]/40 px-2 py-0.5 rounded-full tracking-wider uppercase">
                      STL Attendance & Settlement Portal
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Quick Action or Interactive Menu */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Desktop quick login buttons */}
                <div className="hidden sm:flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleOpenLogin('STL')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#34D399]" />
                    <span>STL Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenLogin('ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Admin Login</span>
                  </button>
                </div>

                {/* Mobile Hamburger Button */}
                <button
                  type="button"
                  onClick={() => setLandingMenuOpen(!landingMenuOpen)}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 rounded-xl text-white transition shadow-2xs"
                  aria-label="Toggle navigation menu"
                >
                  {landingMenuOpen ? (
                    <X className="w-5 h-5 text-sky-300" />
                  ) : (
                    <Menu className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              {/* Mobile Dropdown Menu Card */}
              {landingMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-[#0F1E36]/98 backdrop-blur-md border-b border-[#1E3A5F] p-3.5 space-y-2 shadow-2xl animate-fade-in z-50">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Select Access Portal
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLandingMenuOpen(false);
                        handleOpenLogin('STL');
                      }}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-left text-white transition flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#34D399] flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black">STL Portal</div>
                        <div className="text-[9px] text-slate-300">Attendance</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLandingMenuOpen(false);
                        handleOpenLogin('ADMIN');
                      }}
                      className="p-2.5 rounded-xl bg-[#2563EB]/25 hover:bg-[#2563EB]/35 border border-blue-400/30 text-left text-white transition flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black">Admin Portal</div>
                        <div className="text-[9px] text-slate-300">Control Center</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </header>

            {/* Hero Section */}
            <div className="px-7 pt-4 pb-2 relative flex flex-col z-10 shrink-0">
              <div className="space-y-3 max-w-lg">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg">
                  <div className="w-4 h-4 bg-[#10B981] rounded-md flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-[#0369A1] uppercase tracking-wider">Enterprise Portal</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-[#142B4A] leading-[1.05] tracking-[calc(-0.04em)]">
                  Unity Earning<br />E-Learning Platform
                </h2>

                <p className="text-[11px] text-[#64748B] leading-relaxed font-medium max-w-[260px]">
                  Sub Team Leader (STL) meeting attendance, fine settlement, and real-time ledger management system.
                </p>
              </div>

              {/* Illustration Placeholder (Right side) */}
              <div className="absolute right-0 top-0 w-1/2 h-40 pointer-events-none opacity-40">
                <div className="relative w-full h-full">
                   <div className="absolute top-4 right-4 w-20 h-20 bg-blue-100 rounded-full blur-2xl"></div>
                   <div className="absolute top-8 right-2 w-28 h-28 border-4 border-blue-50 rounded-[40px] rotate-12 flex items-center justify-center">
                     <div className="w-20 h-20 bg-white/40 rounded-[30px] border-2 border-white/60"></div>
                   </div>
                </div>
              </div>
            </div>

            {/* Action Portals (Moved Higher) */}
            <div className="px-6 py-2 space-y-2.5 shrink-0 z-10">
              {/* STL Portal Button */}
              <button 
                onClick={() => handleOpenLogin('STL')}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-[#F0FDF4] to-white border border-[#DCFCE7] rounded-[28px] shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white border border-[#DCFCE7] rounded-[18px] flex items-center justify-center text-[#10B981]">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-black text-[#142B4A]">STL Portal</h4>
                    <p className="text-[9px] text-[#64748B] font-bold tracking-tight">Attendance & Sheets</p>
                  </div>
                </div>
                <div className="w-7 h-7 bg-[#DCFCE7] text-[#10B981] rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Admin Portal Button */}
              <button 
                onClick={() => handleOpenLogin('ADMIN')}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-[#EFF6FF] to-white border border-[#DBEAFE] rounded-[28px] shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white border border-[#DBEAFE] rounded-[18px] flex items-center justify-center text-[#2563EB]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-black text-[#142B4A]">Admin Portal</h4>
                    <p className="text-[9px] text-[#64748B] font-bold tracking-tight">System & Members</p>
                  </div>
                </div>
                <div className="w-7 h-7 bg-[#DBEAFE] text-[#2563EB] rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Empower Banner (Centered more effectively) */}
            <div className="px-6 py-1 shrink-0 z-10">
              <div className="w-full bg-[#1E3A8A] rounded-[28px] p-4 relative overflow-hidden text-white flex items-center justify-between shadow-md">
                <div className="flex-1 z-10 space-y-1.5 pr-12">
                  <div className="inline-flex items-center space-x-2 px-1.5 py-0.5 bg-white/10 border border-white/20 rounded-lg">
                    <span className="text-[7px] font-black uppercase tracking-[0.1em]">Trusted Platform</span>
                  </div>
                  <h4 className="text-[13px] font-black leading-tight tracking-tight">
                    Empowering Your Journey<br />with Unity Earning E-Learning Platform
                  </h4>
                  <p className="text-[9px] italic font-medium opacity-80">Learn • Grow • Earn</p>
                </div>

                <div className="absolute right-3 bottom-1.5 w-12 h-12 flex items-center justify-center opacity-60">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 text-white"><path d="M6 9V2h12v7"></path><path d="M12 22v-5"></path><path d="M10 22h4"></path><path d="M18 5h3v4c0 2-2 3-3 3"></path><path d="M6 5H3v4c0 2 2 3 3 3"></path><circle cx="12" cy="11" r="5"></circle></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Wave Decor (Ensures fit) */}
            <div className="mt-auto h-16 bg-gradient-to-t from-[#E0F2FE] to-transparent opacity-40 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path fill="#ffffff" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
              </svg>
            </div>
          </div>
        ) : session.role === 'STL' || activeView === 'attendance' ? (
          /* STL Attendance Interface */
          <div className="flex-1">
            <STLAttendanceView
              session={session}
              stls={stls}
              members={members}
              attendance={attendance}
              settings={settings}
              onOpenLogin={handleOpenLogin}
              onOpenMemberDetail={(m) => setInspectedMember(m)}
              onLogout={handleLogout}
            />
          </div>
        ) : session.role === 'ADMIN' ? (
          /* Admin Dedicated Slots Interface */
          <div className="flex-1">
            <AdminDashboard
              stls={stls}
              members={members}
              attendance={attendance}
              transactions={transactions}
              settings={settings}
              activeTab={
                activeView === 'admin_team_leaders'
                  ? 'team_leaders'
                  : activeView === 'admin_team_trainers'
                  ? 'team_trainers'
                  : activeView === 'admin_attendance'
                  ? 'attendance'
                  : activeView === 'admin_sheet'
                  ? 'sheet'
                  : activeView === 'admin_settings'
                  ? 'finances'
                  : 'stls'
              }
              setActiveTab={(tab) => {
                if (tab === 'team_leaders') setActiveView('admin_team_leaders');
                else if (tab === 'team_trainers') setActiveView('admin_team_trainers');
                else if (tab === 'attendance') setActiveView('admin_attendance');
                else if (tab === 'sheet') setActiveView('admin_sheet');
                else if (tab === 'finances') setActiveView('admin_settings');
                else setActiveView('admin_stls');
              }}
              onViewAttendanceForSTL={(stlId) => {
                setActiveView('attendance');
              }}
              onLogout={handleLogout}
            />
          </div>
        ) : null}
      </main>

      {/* Clean Fintech Footer - Only show when logged in */}
      {session && (
        <footer className="border-t border-[#E2E8F0] bg-white py-4 px-4 text-center text-xs text-[#64748B]">
          <p className="flex items-center justify-center gap-2">
            <span className="font-semibold text-[#142B4A]">Unity Earning E-Learning Platform</span>
            <span className="text-[#CBD5E1]">·</span>
            <span>STL Meeting Attendance & Financial Settlement Portal</span>
          </p>
        </footer>
      )}
    </div>

  );
}
