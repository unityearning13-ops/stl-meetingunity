import React, { useState, useEffect } from 'react';
import { X, User, Phone, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { STL } from '../types';
import { createSTL, updateSTL } from '../services/firestoreService';

interface STLModalProps {
  isOpen: boolean;
  stlToEdit?: STL | null;
  onClose: () => void;
  onSaved: () => void;
}

export const STLModal: React.FC<STLModalProps> = ({
  isOpen,
  stlToEdit,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (stlToEdit) {
      setName(stlToEdit.name);
      setPhone(stlToEdit.phone);
      setPassword(stlToEdit.password);
    } else {
      setName('');
      setPhone('');
      setPassword('');
    }
    setErrorMsg('');
  }, [stlToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter STL Name.');
      return;
    }

    // Auto-generate phone or password if left blank
    const finalPhone = phone.trim() || `017${Math.floor(10000000 + Math.random() * 90000000)}`;
    const finalPassword = password.trim() || 'stl1234';

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (stlToEdit) {
        await updateSTL(stlToEdit.id, {
          name: name.trim(),
          phone: finalPhone,
          password: finalPassword,
        });
      } else {
        await createSTL({
          name: name.trim(),
          phone: finalPhone,
          password: finalPassword,
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving STL:', err);
      setErrorMsg('Failed to save STL account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B4A]/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-[0_20px_50px_rgba(20,43,74,0.15)] max-w-md w-full overflow-hidden text-[#142B4A]">
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#142B4A] tracking-tight">
                {stlToEdit ? 'Edit Sub Team Leader' : 'Create New STL'}
              </h3>
              <p className="text-xs text-[#64748B]">
                Only name is required. Phone & password auto-generated if left blank.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#142B4A] rounded-xl hover:bg-[#E2E8F0] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[#DC2626] text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              STL Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Md. Shahinur Rahman"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              Phone Number (Optional - Auto generated if blank)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01711223344 (leave blank for auto)"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#142B4A]">
                Password (Optional - Auto generated if blank)
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for stl1234"
                className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#142B4A] p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-[#F4F6F9] hover:bg-[#E2E8F0] text-[#64748B] transition border border-[#CBD5E1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#142B4A] hover:bg-[#1E3A5F] text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 min-h-[40px]"
            >
              {isSubmitting ? 'Saving...' : stlToEdit ? 'Update STL' : 'Create STL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
