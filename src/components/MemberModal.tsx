import React, { useState, useEffect } from 'react';
import { X, User, Shield } from 'lucide-react';
import { Member, STL, MemberRole } from '../types';
import { createMember, updateMember } from '../services/firestoreService';

interface MemberModalProps {
  isOpen: boolean;
  memberToEdit?: Member | null;
  targetRole: MemberRole; // Fixed role based on current slot
  stls: STL[];
  onClose: () => void;
  onSaved: () => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  memberToEdit,
  targetRole,
  stls,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stlId, setStlId] = useState(stls[0]?.id || '');
  const [balance, setBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const roleLabel = targetRole === 'TEAM_LEADER' ? 'Team Leader' : 'Team Trainer';

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setPhone(memberToEdit.phone);
      setStlId(memberToEdit.stlId);
      setBalance(memberToEdit.balance);
    } else {
      setName('');
      setPhone('');
      setStlId(stls[0]?.id || '');
      setBalance(0);
    }
    setErrorMsg('');
  }, [memberToEdit, targetRole, stls, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !stlId) {
      setErrorMsg(`Please enter ${roleLabel} name and select an STL mapping.`);
      return;
    }

    const finalPhone = phone.trim();

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (memberToEdit) {
        await updateMember(memberToEdit.id, {
          name: name.trim(),
          phone: finalPhone,
          role: targetRole,
          stlId,
          balance: Number(balance) || 0,
        });
      } else {
        await createMember({
          name: name.trim(),
          phone: finalPhone,
          role: targetRole,
          stlId,
          balance: Number(balance) || 0,
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving member:', err);
      setErrorMsg('Failed to save details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B4A]/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-[0_20px_50px_rgba(20,43,74,0.15)] max-w-md w-full overflow-hidden text-[#142B4A]">
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                targetRole === 'TEAM_LEADER'
                  ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                  : 'bg-emerald-50 text-[#047857] border border-emerald-200'
              }`}
            >
              {targetRole === 'TEAM_LEADER' ? 'TL' : 'TT'}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#142B4A] tracking-tight">
                {memberToEdit ? `Edit ${roleLabel}` : `Add New ${roleLabel}`}
              </h3>
              <p className="text-xs text-[#64748B]">
                Only name & STL selection required.
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

          {/* Member Name */}
          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              {roleLabel} Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${targetRole === 'TEAM_LEADER' ? 'Hasan Mahmud' : 'Faruk Hossain'}`}
                required
                autoFocus
                className="w-full pl-10 pr-3.5 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-bold"
              />
            </div>
          </div>

          {/* Assigned STL */}
          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              Assign to Sub Team Leader (STL) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={stlId}
                onChange={(e) => setStlId(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#142B4A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-bold"
              >
                {stls.length === 0 ? (
                  <option value="">No STL found - Please create an STL first</option>
                ) : (
                  stls.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5">
              Only Name &amp; STL Mapping are needed. Contact ID &amp; wallet are initialized automatically.
            </p>
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
              disabled={isSubmitting || stls.length === 0}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 min-h-[40px] ${
                targetRole === 'TEAM_LEADER'
                  ? 'bg-[#2563EB] hover:bg-blue-700'
                  : 'bg-[#10B981] hover:bg-emerald-600'
              }`}
            >
              {isSubmitting ? 'Saving...' : memberToEdit ? 'Update Member' : `Add ${roleLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
