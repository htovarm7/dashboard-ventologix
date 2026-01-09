"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

const TypeReportes = () => {
  const router = useRouter();

  // Función para ir atrás
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={handleGoBack}
          className="absolute left-8 top-8 flex items-center gap-2 bg-blue-800 text-white hover:bg-blue-900 transition-colors duration-200 px-4 py-3 rounded-lg shadow-md hover:shadow-lg"
          title="Atrás"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-lg font-medium">Atrás</span>
        </button>

        <div className="mt-8 mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Gestión de Reportes de Mantenimiento
          </h1>
          <p className="text-gray-600 text-xl">
            Crea y visualiza reportes de mantenimiento de compresores
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Pre Mantenimiento  */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-t-4 border-green-500 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-5xl">📋</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-green-600 mb-2">
                    Pre-Mantenimiento
                  </h2>
                  <p className="text-base text-gray-500">Inspección inicial</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Registra las condiciones iniciales del equipo antes del servicio
              </p>

              <div className="space-y-4">
                <Link
                  href="/features/compressor-maintenance/technician/reports/pre"
                  className="block w-full px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-center shadow-md hover:shadow-lg text-lg"
                >
                  📊 Ver Reportes
                </Link>
                <Link
                  href="/features/compressor-maintenance/technician/reports/pre/submit"
                  className="block w-full px-6 py-4 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 transition-colors text-center border-2 border-green-500 text-lg"
                >
                  ➕ Crear Reporte
                </Link>
              </div>
            </div>
          </div>

          {/* Mantenimiento  */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-t-4 border-blue-500 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-5xl">🔧</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-blue-600 mb-2">
                    Mantenimiento
                  </h2>
                  <p className="text-base text-gray-500">Servicio técnico</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Documenta las actividades y reparaciones realizadas
              </p>

              <div className="space-y-4">
                <Link
                  href="/features/compressor-maintenance/views"
                  className="block w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center shadow-md hover:shadow-lg text-lg"
                >
                  📊 Ver Reportes
                </Link>
                <Link
                  href="/features/compressor-maintenance/technician/reports/mtto/submit"
                  className="block w-full px-6 py-4 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-center border-2 border-blue-500 text-lg"
                >
                  ➕ Crear Reporte
                </Link>
              </div>
            </div>
          </div>

          {/* Post Mantenimiento  */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-t-4 border-orange-500 transform hover:-translate-y-1">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-5xl">✅</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-orange-600 mb-2">
                    Post-Mantenimiento
                  </h2>
                  <p className="text-base text-gray-500">Verificación final</p>
                </div>
              </div>

              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Verifica el funcionamiento después del servicio realizado
              </p>

              <div className="space-y-4">
                <Link
                  href="/features/compressor-maintenance/technician/reports/post"
                  className="block w-full px-6 py-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors text-center shadow-md hover:shadow-lg text-lg"
                >
                  📊 Ver Reportes
                </Link>
                <Link
                  href="/features/compressor-maintenance/technician/reports/post/submit"
                  className="block w-full px-6 py-4 bg-orange-50 text-orange-700 font-semibold rounded-lg hover:bg-orange-100 transition-colors text-center border-2 border-orange-500 text-lg"
                >
                  ➕ Crear Reporte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypeReportes;
