'use client';

import { useState, useCallback } from 'react';
import { DialogMessage } from '@/components/CustomDialog';

let globalDialogState: {
  isOpen: boolean;
  dialog: DialogMessage | null;
  showDialog: (dialog: DialogMessage) => void;
  closeDialog: () => void;
} | null = null;

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const createDialogState = () => {
  if (!globalDialogState) {
    globalDialogState = {
      isOpen: false,
      dialog: null,
      showDialog: (dialog: DialogMessage) => {
        globalDialogState!.isOpen = true;
        globalDialogState!.dialog = dialog;
        notifyListeners();
      },
      closeDialog: () => {
        globalDialogState!.isOpen = false;
        globalDialogState!.dialog = null;
        notifyListeners();
      },
    };
  }
  return globalDialogState;
};

export const useDialogStore = () => {
  const [, forceUpdate] = useState({});
  const state = createDialogState();

  const rerender = useCallback(() => {
    forceUpdate({});
  }, []);

  // Subscribe to changes
  if (!listeners.has(rerender)) {
    listeners.add(rerender);
  }

  return {
    isOpen: state.isOpen,
    dialog: state.dialog,
    showDialog: state.showDialog,
    closeDialog: state.closeDialog,
  };
};

// Hook personalizado para usar el diálogo más fácilmente
export const useDialog = () => {
  const { showDialog, closeDialog } = useDialogStore();

  const showSuccess = (title: string, message?: string, autoClose?: number) => {
    showDialog({
      type: 'success',
      title,
      message,
      autoClose: autoClose || 3000,
    });
  };

  const showError = (title: string, message?: string) => {
    showDialog({
      type: 'error',
      title,
      message,
    });
  };

  const showWarning = (title: string, message?: string) => {
    showDialog({
      type: 'warning',
      title,
      message,
    });
  };

  const showInfo = (title: string, message?: string) => {
    showDialog({
      type: 'info',
      title,
      message,
    });
  };

  const showConfirmation = (
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    showDialog({
      type: 'confirmation',
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
    });
  };

  // Función especial para logout con confirmación
  const showLogoutConfirmation = (onConfirm: () => void) => {
    showConfirmation(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar tu sesión? Perderás cualquier trabajo no guardado.',
      onConfirm,
      undefined,
      'Cerrar Sesión',
      'Cancelar'
    );
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmation,
    showLogoutConfirmation,
    closeDialog,
  };
};