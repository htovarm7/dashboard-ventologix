"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SideBar from "@/components/sideBar";
import { Compressor } from "@/lib/types";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [compresores, setCompresores] = useState<Compressor[]>([]);
  const [selectedCompresor, setSelectedCompresor] = useState<Compressor | null>(
    null
  );
  const [rol, setRol] = useState<number | null>(null);
  const [secciones, setSecciones] = useState<string[]>([]);

  // Check if current route should hide sidebar
  const hideSidebar = pathname === "/reportesD" || pathname === "/reportesS";

  useEffect(() => {
    // Get user data from session storage
    const loadUserData = () => {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setCompresores(parsedData.compresores || []);
          setRol(parsedData.rol);
          setSecciones(parsedData.secciones || []);
        } catch (error) {
          console.error("Error parsing userData from sessionStorage:", error);
        }
      }
    };

    // Get selected compresor from session storage
    const loadSelectedCompresor = () => {
      const selectedCompresorData = sessionStorage.getItem("selectedCompresor");
      if (selectedCompresorData) {
        try {
          const selected = JSON.parse(selectedCompresorData);
          setSelectedCompresor(selected);
        } catch (error) {
          console.error(
            "Error parsing selectedCompresor from sessionStorage:",
            error
          );
        }
      }
    };

    loadUserData();
    loadSelectedCompresor();

    // Listen for storage changes to update when compresor selection changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompresor") {
        loadSelectedCompresor();
      } else if (e.key === "userData") {
        loadUserData();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events for same-window updates
    const handleCompresorChange = () => {
      loadSelectedCompresor();
    };

    window.addEventListener("compresorChanged", handleCompresorChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("compresorChanged", handleCompresorChange);
    };
  }, []);

  return (
    <>
      {!hideSidebar && (
        <SideBar
          compresores={compresores}
          selectedCompresor={selectedCompresor}
          rol={rol}
          secciones={secciones}
        />
      )}
      {children}
    </>
  );
}
