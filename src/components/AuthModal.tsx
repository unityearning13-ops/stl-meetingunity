import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Lock, Phone, X, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { STL, AuthSession } from '../types';
import { ADMIN_PASSWORD } from '../services/firestoreService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'ADMIN' | 'STL';
  stls: STL[];
  onLoginSuccess: (session: AuthSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  role: initialRole,
  stls,
  onLoginSuccess,
}) => {
  const [activeRole, setActiveRole] = useState<'ADMIN' | 'STL'>(initialRole);
  const [adminPin, setAdminPin] = useState('');
  const [stlPhone, setStlPhone] = useState('');
  const [stlPassword, setStlPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setActiveRole(initialRole);
    setAdminPin('');
    setStlPhone('');
    setStlPassword('');
    setErrorMsg('');
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (adminPin.trim() === ADMIN_PASSWORD) {
      onLoginSuccess({ role: 'ADMIN' });
      onClose();
    } else {
      setErrorMsg('Invalid Security PIN. Access denied.');
    }
  };

  const handleSTLSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetSTL = stls.find(
      (s) =>
        s.phone.replace(/[\s-]/g, '') === stlPhone.trim().replace(/[\s-]/g, '') &&
        s.password === stlPassword.trim()
    );

    if (targetSTL) {
      onLoginSuccess({ role: 'STL', stl: targetSTL });
      onClose();
    } else {
      setErrorMsg('Invalid Phone Number or Password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B4A]/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden border border-[#E2E8F0]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#142B4A] hover:bg-[#F1F5F9] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Role Switcher */}
        <div className="flex p-1.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] mb-6">
          <button
            type="button"
            onClick={() => setActiveRole('STL')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeRole === 'STL'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#142B4A]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            STL LOGIN
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('ADMIN')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeRole === 'ADMIN'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#142B4A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ADMIN LOGIN
          </button>
        </div>

        {/* Dynamic Header */}
        <div className="text-center mb-6">
          <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 border ${
            activeRole === 'STL' ? 'bg-emerald-50 text-[#10B981] border-emerald-200' : 'bg-blue-50 text-[#2563EB] border-blue-200'
          }`}>
            {activeRole === 'STL' ? (
              <UserCheck className="w-7 h-7" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-xl font-black text-[#142B4A] tracking-tight">
            {activeRole === 'STL' ? 'STL Portal Sign In' : 'Admin Control Sign In'}
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            {activeRole === 'STL' ? 'Enter your registered STL credentials' : 'Enter administrator security PIN'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-600 text-xs font-bold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeRole === 'STL' ? (
          <form onSubmit={handleSTLSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#142B4A]">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="tel"
                  value={stlPhone}
                  onChange={(e) => setStlPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#142B4A]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="password"
                  value={stlPassword}
                  onChange={(e) => setStlPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-3 bg-[#10B981] hover:bg-emerald-600 active:scale-[0.98] rounded-xl text-xs font-bold text-white shadow-sm transition flex items-center justify-center gap-2 group"
            >
              <span>SIGN IN TO STL PORTAL</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-5">
            <div className="space-y-2 text-center">
              <label className="text-xs font-bold text-[#142B4A]">Security PIN</label>
              <div className="flex justify-center">
                <div className="relative w-full max-w-xs">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="password"
                    maxLength={6}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-base font-bold tracking-[0.3em] text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-center"
                    required
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-[0.98] rounded-xl text-xs font-bold text-white shadow-sm transition flex items-center justify-center gap-2 group"
            >
              <span>AUTHENTICATE ADMIN</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
