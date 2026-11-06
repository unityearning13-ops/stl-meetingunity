import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-600 border-rose-200',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-100 text-[#2563EB] border-blue-200',
          btnBg: 'bg-[#2563EB] hover:bg-blue-700 text-white',
          icon: <CheckCircle2 className="w-6 h-6 text-[#2563EB]" />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#142B4A]/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(20,43,74,0.2)] max-w-md w-full p-5 sm:p-6 text-[#142B4A] space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#142B4A] leading-tight">{title}</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Confirmation Required</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-[#64748B] hover:text-[#142B4A] hover:bg-[#F4F6F9] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Message */}
        <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] leading-relaxed whitespace-pre-line">
          {message}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F4F6F9] text-[#142B4A] font-bold text-xs transition disabled:opacity-50 min-h-[40px]"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50 min-h-[40px] ${styles.btnBg}`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
