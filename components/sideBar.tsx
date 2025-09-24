"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Compresor } from "@/types/common";
import Image from "next/image";

interface SideBarProps {
  compresores?: Compresor[];
  selectedCompresor?: Compresor | null;
  rol?: number | null;
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
  icon: React.ReactElement;
  route?: string;
  requiresCompresor: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  setExpanded?: (expanded: boolean) => void;
  badge?: string;
  children?: NavigationChild[];
}

const SideBar: React.FC<SideBarProps> = ({ selectedCompresor, rol }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth0();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBetaExpanded, setIsBetaExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleLogout = () => {
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("selectedCompresor");
    logout({
      logoutParams: { returnTo: window.location.origin },
    });
  };

  // Mínima distancia de deslizamiento para activar el gesto
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
    const isLeftSwipe = distance > minSwipeDistance;
    
    // Si es un deslizamiento hacia la izquierda y el sidebar está abierto en móvil
    if (isLeftSwipe && isExpanded && window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  const navigationItems: NavigationItem[] = [
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
      requiresCompresor: false,
    },
    ...(rol === 2
      ? [
          {
            id: "admin view",
            title: "Administrador",
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
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 6h12c0-3.31-2.69-6-6-6z"
                />
              </svg>
            ),
            requiresCompresor: false,
            route: "/admin-view",
          },
        ]
      : []),
    {
      id: "beta",
      title: "BETA",
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      isExpandable: true,
      isExpanded: isBetaExpanded,
      setExpanded: setIsBetaExpanded,
      requiresCompresor: false,
      children: [
        {
          id: "prediction",
          title: "Consumo Predictivo",
          route: "/prediction",
          icon: (
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
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          ),
          badge: "NUEVO",
        },
        {
          id: "pressure-prediction",
          title: "Presión",
          route: "/pressure",
          icon: (
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          ),
          badge: "PROXIMAMENTE",
          disabled: true,
        },
      ],
    },
  ];

  const handleNavigation = (route: string, disabled = false) => {
    if (disabled) return;
    router.push(route);
    // Cerrar sidebar en móvil después de navegar
    if (window.innerWidth < 768) {
      setIsExpanded(false);
    }
  };

  const isActiveRoute = (route: string) => {
    return pathname === route;
  };

  const canAccessRoute = (item: NavigationItem) => {
    if (!item.requiresCompresor) return true;
    return selectedCompresor !== null;
  };

  // Cerrar sidebar al hacer clic fuera en móvil
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement;
      const sidebar = document.getElementById('mobile-sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');
      
      if (isExpanded && window.innerWidth < 768 && 
          !sidebar?.contains(target) && 
          !toggleButton?.contains(target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded && window.innerWidth < 768) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <>
      {/* Overlay para móvil */}
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

      {!isExpanded && (
        <div
          className="fixed left-0 top-1/2 transform -translate-y-1/2 z-40 hidden md:block"
          data-exclude-pdf="true"
        >
          <div
            className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-10 rounded-r-xl shadow-xl border-r-2 border-slate-600 hover:from-slate-700 hover:to-slate-600 transition-all duration-300 cursor-pointer group"
            onMouseEnter={() => setIsExpanded(true)}
          >
            <div className="flex flex-col items-center gap-4">
              <svg
                className="w-7 h-7 text-slate-300 group-hover:text-white transition-colors"
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

              <div className="transform rotate-90 text-base font-semibold text-slate-400 group-hover:text-slate-200 transition-colors whitespace-nowrap tracking-widest">
                MENÚ
              </div>

              <svg
                className="w-6 h-6 text-slate-400 group-hover:text-slate-200 transition-all group-hover:translate-x-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed left-0 top-0 w-6 h-full z-40 bg-transparent hidden md:block"
        onMouseEnter={() => setIsExpanded(true)}
        data-exclude-pdf="true"
      />

      <div
        id="mobile-sidebar"
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? "w-80 shadow-xl" : "w-0 md:w-0"
        } overflow-hidden`}
        onMouseLeave={() => {
          if (window.innerWidth >= 768) {
            setIsExpanded(false);
          }
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-exclude-pdf="true"
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <Image
                    src={"/Ventologix_05.png"}
                    alt="Logo"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ventologix</h2>
                  <p className="text-sm text-slate-400">Dashboard</p>
                </div>
              </div>
              {/* Botón de cierre para móvil */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors"
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

          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 space-y-2">
              {navigationItems.map((item) => (
                <div key={item.id}>
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      item.route && isActiveRoute(item.route)
                        ? "bg-blue-600 text-white shadow-lg"
                        : canAccessRoute(item)
                        ? "hover:bg-slate-700 text-slate-200"
                        : "text-slate-500 cursor-not-allowed"
                    } ${
                      !canAccessRoute(item) && item.requiresCompresor
                        ? "opacity-50"
                        : ""
                    }`}
                    onClick={() => {
                      if (item.isExpandable) {
                        item.setExpanded?.(!item.isExpanded);
                      } else if (item.route && canAccessRoute(item)) {
                        handleNavigation(item.route);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-semibold ${
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
                      <div className="transition-transform duration-200">
                        {item.isExpanded ? (
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
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        ) : (
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
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </div>
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
                      <div className="ml-4 mt-2 space-y-1">
                        {item.children.map((child) => (
                          <div
                            key={child.id}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ${
                              isActiveRoute(child.route)
                                ? "bg-blue-500 text-white"
                                : child.disabled
                                ? "text-slate-500 cursor-not-allowed"
                                : canAccessRoute(item)
                                ? "hover:bg-slate-600 text-slate-300"
                                : "text-slate-500 cursor-not-allowed opacity-50"
                            }`}
                            onClick={() => {
                              if (!child.disabled && canAccessRoute(item)) {
                                handleNavigation(child.route);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {child.icon}
                              <span className="text-sm">{child.title}</span>
                              {child.badge && (
                                <span
                                  className={`px-1.5 py-0.5 text-xs rounded font-semibold ${
                                    child.badge === "NUEVO"
                                      ? "bg-green-600 text-white"
                                      : "bg-yellow-600 text-white"
                                  }`}
                                >
                                  {child.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {!selectedCompresor && (
            <div className="p-4 border-t border-slate-700">
              <div className="text-xs text-slate-400 text-center">
                Seleccione un compresor en el inicio para acceder a todas las
                funciones
              </div>
            </div>
          )}

          {/* Botón de Logout */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideBar;
