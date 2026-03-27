"use client";

import { useEffect, useRef } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
} from "lucide-react";

export interface DialogMessage {
  id?: string;
  type: "success" | "error" | "warning" | "info" | "confirmation";
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  autoClose?: number; // milliseconds
}

interface CustomDialogProps {
  isOpen: boolean;
  dialog: DialogMessage | null;
  onClose: () => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  confirmation: HelpCircle,
};

const colorMap = {
  success: {
    bg: "bg-white",
    border: "border-green-300",
    iconBg: "bg-green-100",
    icon: "text-green-600",
    button: "bg-green-600 hover:bg-green-700 text-white",
    accent: "border-t-green-500",
  },
  error: {
    bg: "bg-white",
    border: "border-red-300",
    iconBg: "bg-red-100",
    icon: "text-red-600",
    button: "bg-red-600 hover:bg-red-700 text-white",
    accent: "border-t-red-500",
  },
  warning: {
    bg: "bg-white",
    border: "border-orange-300",
    iconBg: "bg-orange-100",
    icon: "text-orange-600",
    button: "bg-orange-600 hover:bg-orange-700 text-white",
    accent: "border-t-orange-500",
  },
  info: {
    bg: "bg-white",
    border: "border-blue-300",
    iconBg: "bg-blue-100",
    icon: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    accent: "border-t-blue-500",
  },
  confirmation: {
    bg: "bg-white",
    border: "border-indigo-300",
    iconBg: "bg-indigo-100",
    icon: "text-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    accent: "border-t-indigo-500",
  },
};

export default function CustomDialog({
  isOpen,
  dialog,
  onClose,
}: CustomDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dialog?.autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, dialog.autoClose);

      return () => clearTimeout(timer);
    }
  }, [isOpen, dialog?.autoClose, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    dialog?.onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    dialog?.onCancel?.();
    onClose();
  };

  if (!isOpen || !dialog) return null;

  const Icon = iconMap[dialog.type];
  const colors = colorMap[dialog.type];
  const isConfirmation = dialog.type === "confirmation";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`
          relative mx-4 w-full max-w-lg transform overflow-hidden rounded-2xl border-t-4 ${colors.accent}
          ${colors.bg} ${colors.border} border shadow-2xl
        `}
        style={{
          animation: isOpen ? "dialogSlideIn 0.3s ease-out" : undefined,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={22} />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Icon */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-full ${colors.iconBg}`}>
              <Icon size={32} className={colors.icon} strokeWidth={2.5} />
            </div>

            {/* Text content */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                {dialog.title}
              </h3>
              {dialog.message && (
                <p className="mt-3 text-base text-gray-600 leading-relaxed whitespace-pre-line">
                  {dialog.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-8 pb-8 flex justify-center gap-3">
          {isConfirmation ? (
            <>
              <button
                onClick={handleCancel}
                className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-base font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
              >
                {dialog.cancelText || "Cancelar"}
              </button>
              <button
                onClick={handleConfirm}
                className={`rounded-xl px-6 py-2.5 text-base font-semibold transition-all active:scale-95 shadow-md hover:shadow-lg ${colors.button}`}
              >
                {dialog.confirmText || "Confirmar"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`rounded-xl px-8 py-2.5 text-base font-semibold transition-all active:scale-95 shadow-md hover:shadow-lg ${colors.button}`}
            >
              Entendido
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes dialogSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-30px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
