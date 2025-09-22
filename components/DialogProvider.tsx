"use client";

import CustomDialog from "./CustomDialog";
import { useDialogStore } from "@/hooks/useDialog";

interface DialogProviderProps {
  children: React.ReactNode;
}

export default function DialogProvider({ children }: DialogProviderProps) {
  const { isOpen, dialog, closeDialog } = useDialogStore();

  return (
    <>
      {children}
      <CustomDialog isOpen={isOpen} dialog={dialog} onClose={closeDialog} />
    </>
  );
}
