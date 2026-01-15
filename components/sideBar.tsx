"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Compressor } from "@/lib/types";
import { URL_API } from "@/lib/global";
import Image from "next/image";
import { Database, BookUser, UserPen } from "lucide-react";

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
  icon: React.ReactElement;
  route?: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  setExpanded?: (expanded: boolean) => void;
  badge?: string;
  children?: NavigationChild[];
}

const SideBar: React.FC<SideBarProps> = ({
  selectedCompresor,
  rol,
  secciones = [],
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth0();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBetaExpanded, setIsBetaExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Estados para SuperAdmin
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [newClientNumber, setNewClientNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState("");

  const handleLogout = () => {
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("selectedCompresor");
    logout({
      logoutParams: { returnTo: window.location.origin },
    });
  };

  // Función para actualizar número de cliente
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
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      setUpdateMessage("Número de cliente actualizado exitosamente");
      setNewClientNumber("");

      // Actualizar los datos en sessionStorage inmediatamente
      const storedUserData = sessionStorage.getItem("userData");
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        userData.numero_cliente = parseInt(newClientNumber);
        sessionStorage.setItem("userData", JSON.stringify(userData));
      }

      // Cerrar modal después de 1.5 segundos y recargar la página
      setTimeout(() => {
        setShowSuperAdminModal(false);
        setUpdateMessage("");
        // Recargar la página para que los cambios tengan efecto inmediato
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error updating client number:", error);
      setUpdateError(
        "Error al actualizar el número de cliente. Inténtelo nuevamente."
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
    },
    ...(rol === 3
      ? [
          {
            id: "admin view",
            title: "Administrador",
            icon: <UserPen />,
            route: "/admin-view",
          },
        ]
      : []),
    ...(rol === 0 || rol === 1 || rol === 2
      ? [
          {
            id: "clients",
            title: "Ver clientes",
            icon: <BookUser />,
            route: "/clients",
          },
          {
            id: "compresors",
            title: "Ver compresores",
            icon: <Database />,
            route: "/compresors",
          },
          {
            id: "moduls",
            title: "Habilitar modulos a cliente",
            icon: <UserPen />,
            route: "/modules",
          },
        ]
      : []),
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

  // Función para filtrar items según las secciones disponibles
  const getFilteredNavigationItems = (): NavigationItem[] => {
    return navigationItems.filter((item) => {
      // Siempre mostrar Inicio
      if (item.id === "home") return true;

      // Siempre mostrar Admin View si aplica
      if (item.id === "admin view") return true;

      // Filtrar BETA items según secciones
      if (item.id === "beta") {
        // Mostrar si hay al menos una sección válida
        if (secciones.length === 0) return true; // Si no hay secciones definidas, mostrar todo
        return true; // Mostrar el grupo BETA si hay secciones
      }

      // Filtrar otros items según secciones
      if (secciones.length === 0) return true; // Si no hay secciones, mostrar todo

      // Mostrar solo items cuyas secciones estén en la lista permitida
      if (item.id === "consumption-kwh") {
        return secciones.includes("ConsumoKwH");
      }

      return true;
    });
  };

  const getFilteredBetaChildren = (): NavigationChild[] => {
    const betaItem = navigationItems.find((item) => item.id === "beta");
    if (!betaItem || !betaItem.children) return [];

    if (secciones.length === 0) return betaItem.children;

    return betaItem.children.filter((child) => {
      if (child.id === "prediction") {
        return secciones.includes("Prediccion");
      }
      if (child.id === "pressure-prediction") {
        return secciones.includes("Presion");
      }
      return true;
    });
  }; // Cerrar sidebar al hacer clic fuera en móvil
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

      {/* {!isExpanded && (
        <div
          className="fixed left-0 top-1/2 transform -translate-y-1/2 z-40 hidden md:block"
          data-exclude-pdf="true"
        >
          <div
            className="bg-transparent text-white px-4 py-10 rounded-r-xl shadow-xl border-r-2 border-slate-600 hover:bg-slate-700/20 transition-all duration-300 cursor-pointer group"
            onMouseEnter={() => setIsExpanded(true)}
          >
            <div className="flex flex-col items-center gap-4">
              <svg
                className="w-7 h-7 text-black group-hover:text-white transition-colors"
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

              <div className="transform rotate-90 text-base font-bold text-black group-hover:text-slate-200 transition-colors whitespace-nowrap tracking-widest">
                MENÚ
              </div>

              <svg
                className="w-6 h-6 text-black font-bold group-hover:text-slate-200 transition-all group-hover:translate-x-2"
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
      )} */}

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
              {getFilteredNavigationItems().map((item) => (
                <div key={item.id}>
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      item.route && isActiveRoute(item.route)
                        ? "bg-blue-600 text-white shadow-lg"
                        : "hover:bg-slate-700 text-slate-200"
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
                        {item.id === "beta"
                          ? getFilteredBetaChildren().map((child) => (
                              <div
                                key={child.id}
                                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ${
                                  isActiveRoute(child.route)
                                    ? "bg-blue-500 text-white"
                                    : child.disabled
                                    ? "text-slate-500 cursor-not-allowed"
                                    : "hover:bg-slate-600 text-slate-300"
                                }`}
                                onClick={() => {
                                  if (!child.disabled) {
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
                            ))
                          : item.children.map((child) => (
                              <div
                                key={child.id}
                                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-200 ${
                                  isActiveRoute(child.route)
                                    ? "bg-blue-500 text-white"
                                    : child.disabled
                                    ? "text-slate-500 cursor-not-allowed"
                                    : "hover:bg-slate-600 text-slate-300"
                                }`}
                                onClick={() => {
                                  if (!child.disabled) {
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

          {/* Botón SuperAdmin para rol 0 */}
          {rol === 0 && (
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleSuperAdminClick}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>SuperAdmin</span>
              </button>
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
