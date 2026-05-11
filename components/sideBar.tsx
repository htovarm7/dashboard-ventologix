"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Compressor } from "@/lib/types";
import { URL_API } from "@/lib/global";
import Image from "next/image";
import {
  Database,
  BookUser,
  UserPen,
  StickyNote,
  User,
  ShieldCheck,
  Layers,
  Cpu,
} from "lucide-react";

interface SideBarProps {
  compresores?: Compressor[];
  selectedCompresor?: Compressor | null;
  rol?: number | null;
  secciones?: string[];
}

interface NavigationChild {
  id: string;
  title: string;
  route: string;
  icon: React.ReactElement;
  badge?: string;
  disabled?: boolean;
}

interface NavigationItem {
  id: string;
  title: string;
  icon?: React.ReactElement;
  route?: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  setExpanded?: (expanded: boolean) => void;
  badge?: string;
  children?: NavigationChild[];
  isSectionLabel?: boolean;
}

const SideBar: React.FC<SideBarProps> = ({ rol, secciones = [] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth0();
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [newClientNumber, setNewClientNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState("");

  const handleLogout = () => {
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("selectedCompresor");
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const updateClientNumber = async () => {
    if (!newClientNumber || !user?.email) {
      setUpdateError("Por favor ingrese un número de cliente válido");
      return;
    }
    setIsUpdating(true);
    setUpdateError("");
    setUpdateMessage("");
    try {
      const response = await fetch(
        `${URL_API}/web/usuarios/update-client-number`,
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            nuevo_numero_cliente: parseInt(newClientNumber),
          }),
        },
      );
      if (!response.ok)
        throw new Error(`Error del servidor: ${response.status}`);
      setUpdateMessage("Número de cliente actualizado exitosamente");
      setNewClientNumber("");
      const storedUserData = sessionStorage.getItem("userData");
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        userData.numero_cliente = parseInt(newClientNumber);
        sessionStorage.setItem("userData", JSON.stringify(userData));
      }
      setTimeout(() => {
        setShowSuperAdminModal(false);
        setUpdateMessage("");
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error updating client number:", error);
      setUpdateError(
        "Error al actualizar el número de cliente. Inténtelo nuevamente.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuperAdminClick = () => {
    setShowSuperAdminModal(true);
    setUpdateError("");
    setUpdateMessage("");
    setNewClientNumber("");
  };

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && isExpanded && window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  const isVentologixStaff = rol === 0 || rol === 1 || rol === 2;

  const navigationItems: NavigationItem[] = [
    // ── General ─────────────────────────────────────────────
    {
      id: "section-general",
      title: "General",
      isSectionLabel: true,
    },
    {
      id: "home",
      title: "Inicio",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      route: "/home",
    },

    // ── Administración (rol 3) ────────────────────────────────
    ...(rol === 3
      ? [
          {
            id: "section-admin",
            title: "Administración",
            isSectionLabel: true,
          },
          {
            id: "admin view",
            title: "Panel de Administración de Ingenieros",
            icon: <UserPen className="w-5 h-5" />,
            route: "/admin-view",
          },
        ]
      : []),

    // ── Equipo Ventologix (rol 0) ─────────────────────────────
    ...(rol === 0
      ? [
          {
            id: "section-ventologix",
            title: "Ventologix",
            isSectionLabel: true,
          },
          {
            id: "ventologix-team",
            title: "Equipo Ventologix",
            icon: <User className="w-5 h-5" />,
            route: "/ventologix-team",
          },
        ]
      : []),

    // ── Clientes (roles 0, 1, 2) ──────────────────────────────
    ...(isVentologixStaff
      ? [
          {
            id: "section-clientes",
            title: "Clientes",
            isSectionLabel: true,
          },
          {
            id: "clients",
            title: "Gestionar Clientes",
            icon: <BookUser className="w-5 h-5" />,
            route: "/clients",
          },
          {
            id: "clients-auth",
            title: "Usuarios Autorizados",
            icon: <ShieldCheck className="w-5 h-5" />,
            route: "/clients/auth",
          },
          {
            id: "moduls",
            title: "Módulos de Cliente",
            icon: <Layers className="w-5 h-5" />,
            route: "/modules",
          },
        ]
      : []),

    // ── Infraestructura (roles 0, 1, 2) ──────────────────────
    ...(isVentologixStaff
      ? [
          {
            id: "section-infra",
            title: "Infraestructura",
            isSectionLabel: true,
          },
          {
            id: "compresors",
            title: "Compresores y VTOs",
            icon: <Database className="w-5 h-5" />,
            route: "/compresors-vto",
          },
          {
            id: "rtu-devices",
            title: "Dispositivos RTU",
            icon: <Cpu className="w-5 h-5" />,
            route: "/add-RTU",
          },
          {
            id: "notas-compresores",
            title: "Notas de Compresores",
            icon: <StickyNote className="w-5 h-5" />,
            route: "/notas-compresores",
          },
        ]
      : []),
  ];

  const handleNavigation = (route: string, disabled = false) => {
    if (disabled) return;
    router.push(route);
    if (window.innerWidth < 768) setIsExpanded(false);
  };

  const isActiveRoute = (route: string) => pathname === route;

  const getFilteredNavigationItems = (): NavigationItem[] => {
    return navigationItems.filter((item) => {
      if (item.isSectionLabel) return true;
      if (item.id === "home") return true;
      if (secciones.length === 0) return true;
      if (item.id === "consumption-kwh")
        return secciones.includes("ConsumoKwH");
      return true;
    });
  };

  const getFilteredBetaChildren = (): NavigationChild[] => {
    const betaItem = navigationItems.find((item) => item.id === "beta");
    if (!betaItem || !betaItem.children) return [];
    if (secciones.length === 0) return betaItem.children;
    return betaItem.children.filter((child) => {
      if (child.id === "prediction") return secciones.includes("Prediccion");
      if (child.id === "pressure-prediction")
        return secciones.includes("Presion");
      return true;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById("mobile-sidebar");
      const toggleButton = document.getElementById("sidebar-toggle");
      if (
        isExpanded &&
        window.innerWidth < 768 &&
        !sidebar?.contains(target) &&
        !toggleButton?.contains(target)
      ) {
        setIsExpanded(false);
      }
    };
    if (isExpanded && window.innerWidth < 768) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
          data-exclude-pdf="true"
        />
      )}

      <button
        id="sidebar-toggle"
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-900 text-white p-1.5 rounded-lg shadow-lg"
        onClick={() => setIsExpanded(!isExpanded)}
        data-exclude-pdf="true"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div
        className="fixed left-0 top-0 w-6 h-full z-40 bg-transparent hidden md:block"
        onMouseEnter={() => setIsExpanded(true)}
        data-exclude-pdf="true"
      />

      <div
        id="mobile-sidebar"
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? "w-72 shadow-xl" : "w-0 md:w-0"
        } overflow-hidden`}
        onMouseLeave={() => {
          if (window.innerWidth >= 768) setIsExpanded(false);
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-exclude-pdf="true"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                  <Image
                    src="/Ventologix_05.png"
                    alt="Logo"
                    width={22}
                    height={22}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Ventologix
                  </h2>
                  <p className="text-xs text-slate-400">Dashboard</p>
                </div>
              </div>
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                onClick={() => setIsExpanded(false)}
                aria-label="Cerrar menú"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3">
            <div className="px-3 space-y-0.5">
              {getFilteredNavigationItems().map((item) => {
                if (item.isSectionLabel) {
                  return (
                    <div key={item.id} className="pt-4 pb-1 px-2 first:pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        {item.title}
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={item.id}>
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                        item.route && isActiveRoute(item.route)
                          ? "bg-blue-600 text-white shadow-md"
                          : "hover:bg-slate-700 text-slate-300 hover:text-white"
                      }`}
                      onClick={() => {
                        if (item.isExpandable) {
                          item.setExpanded?.(!item.isExpanded);
                        } else if (item.route) {
                          handleNavigation(item.route);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                              item.badge === "BETA"
                                ? "bg-purple-600 text-white"
                                : item.badge === "NUEVO"
                                  ? "bg-green-600 text-white"
                                  : "bg-yellow-600 text-white"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.isExpandable && (
                        <svg
                          className="w-4 h-4 transition-transform duration-200"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              item.isExpanded
                                ? "M19 9l-7 7-7-7"
                                : "M9 5l7 7-7 7"
                            }
                          />
                        </svg>
                      )}
                    </div>

                    {item.isExpandable && item.children && (
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          item.isExpanded
                            ? "max-h-96 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="ml-4 mt-1 space-y-0.5">
                          {(item.id === "beta"
                            ? getFilteredBetaChildren()
                            : item.children
                          ).map((child) => (
                            <div
                              key={child.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 text-sm ${
                                isActiveRoute(child.route)
                                  ? "bg-blue-500 text-white"
                                  : child.disabled
                                    ? "text-slate-500 cursor-not-allowed"
                                    : "hover:bg-slate-600 text-slate-400 hover:text-white"
                              }`}
                              onClick={() => {
                                if (!child.disabled)
                                  handleNavigation(child.route);
                              }}
                            >
                              {child.icon}
                              <span>{child.title}</span>
                              {child.badge && (
                                <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded font-semibold bg-green-600 text-white">
                                  {child.badge}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* SuperAdmin button */}
          {rol === 0 && (
            <div className="px-3 pb-2 border-t border-slate-700 pt-3">
              <button
                onClick={handleSuperAdminClick}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                SuperAdmin
              </button>
            </div>
          )}

          {/* Logout */}
          <div className="px-3 pb-4 pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Modal SuperAdmin */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/10 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Actualizar Número de Cliente
                </h3>
                <button
                  onClick={() => setShowSuperAdminModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {updateMessage && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  {updateMessage}
                </div>
              )}
              {updateError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {updateError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Número de Cliente
                </label>
                <input
                  type="number"
                  value={newClientNumber}
                  onChange={(e) => setNewClientNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ingrese el número de cliente"
                  disabled={isUpdating}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSuperAdminModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  onClick={updateClientNumber}
                  disabled={isUpdating || !newClientNumber}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? "Actualizando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideBar;
