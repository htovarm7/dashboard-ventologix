"use client";

import React from "react";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminSettingsProps {
  isVisible: boolean;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ isVisible }) => {
  const router = useRouter();

  if (!isVisible) return null;

  const handleClick = () => {
    router.push("/admin-view");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed left-8 top-8 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
      title="Configuración de administrador"
    >
      <Settings size={36} />
    </button>
  );
};

export default AdminSettings;
