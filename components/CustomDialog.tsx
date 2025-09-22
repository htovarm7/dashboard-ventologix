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
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    button: "bg-green-600 hover:bg-green-700 text-white",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    button: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
    icon: "text-orange-600 dark:text-orange-400",
    button: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  confirmation: {
    bg: "bg-gray-50 dark:bg-gray-900/20",
    border: "border-gray-200 dark:border-gray-800",
    icon: "text-gray-600 dark:text-gray-400",
    button: "bg-gray-600 hover:bg-gray-700 text-white",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`
          relative mx-4 w-full max-w-md transform rounded-lg border bg-white p-6 shadow-xl transition-all dark:bg-gray-900
          ${colors.bg} ${colors.border}
        `}
        style={{
          animation: isOpen ? "slideIn 0.3s ease-out" : undefined,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 ${colors.icon}`}>
            <Icon size={24} />
          </div>

          {/* Text content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {dialog.title}
            </h3>
            {dialog.message && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {dialog.message}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {isConfirmation ? (
            <>
              <button
                onClick={handleCancel}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {dialog.cancelText || "Cancelar"}
              </button>
              <button
                onClick={handleConfirm}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${colors.button}`}
              >
                {dialog.confirmText || "Confirmar"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${colors.button}`}
            >
              Entendido
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
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
