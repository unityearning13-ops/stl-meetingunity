import React, { useState } from 'react';
import { X, PlusCircle, MinusCircle, Wallet, AlertCircle, FileText } from 'lucide-react';
import { Member } from '../types';
import { adjustMemberBalance } from '../services/firestoreService';

interface BalanceModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}

export const BalanceModal: React.FC<BalanceModalProps> = ({
  isOpen,
  member,
  onClose,
  onSaved,
}) => {
  const [type, setType] = useState<'ADMIN_CREDIT' | 'ADMIN_DEBIT'>('ADMIN_CREDIT');
  const [amount, setAmount] = useState<number>(100);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMsg('Please specify a positive amount.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please enter a note / reason for this balance adjustment.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      await adjustMemberBalance(member.id, amount, type, reason.trim());

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error adjusting balance:', err);
      setErrorMsg('Failed to update balance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedNewBalance =
    type === 'ADMIN_CREDIT'
      ? member.balance + (Number(amount) || 0)
      : member.balance - (Number(amount) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142B4A]/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-[0_20px_50px_rgba(20,43,74,0.15)] max-w-md w-full overflow-hidden text-[#142B4A]">
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#047857] border border-emerald-200 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#142B4A] tracking-tight">Adjust Member Balance</h3>
              <p className="text-xs text-[#64748B]">
                Wallet balance management for {member.name}
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[#DC2626] text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current balance card */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#64748B] block font-semibold">Current Balance</span>
              <span className="text-base font-extrabold text-[#142B4A] font-mono tabular-nums">
                ৳{member.balance.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#64748B] block font-semibold">After Adjustment</span>
              <span
                className={`text-base font-extrabold font-mono tabular-nums ${
                  calculatedNewBalance >= 0 ? 'text-[#047857]' : 'text-[#DC2626]'
                }`}
              >
                ৳{calculatedNewBalance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Credit vs Debit Action Toggle */}
          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('ADMIN_CREDIT')}
                className={`py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition min-h-[42px] ${
                  type === 'ADMIN_CREDIT'
                    ? 'bg-emerald-50 text-[#047857] border-emerald-300 ring-2 ring-[#10B981]/30 shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1] hover:bg-white'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#10B981]" />
                Add Money (Credit)
              </button>

              <button
                type="button"
                onClick={() => setType('ADMIN_DEBIT')}
                className={`py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition min-h-[42px] ${
                  type === 'ADMIN_DEBIT'
                    ? 'bg-rose-50 text-[#DC2626] border-rose-300 ring-2 ring-rose-400/30 shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1] hover:bg-white'
                }`}
              >
                <MinusCircle className="w-4 h-4 text-[#DC2626]" />
                Deduct Money (Debit)
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              Amount <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[#64748B] font-bold text-sm">৳</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="e.g. 200"
                required
                className="w-full pl-8 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#142B4A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono font-bold"
              />
            </div>
          </div>

          {/* Reason note */}
          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">
              Adjustment Reason / Note <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Meeting incentive, Fine refund, Balance correction"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#142B4A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
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
              className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 min-h-[40px] ${
                type === 'ADMIN_CREDIT'
                  ? 'bg-[#10B981] hover:bg-emerald-600'
                  : 'bg-[#DC2626] hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? 'Updating...' : type === 'ADMIN_CREDIT' ? 'Confirm Credit' : 'Confirm Debit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
