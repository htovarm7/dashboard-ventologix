import BackButton from "@/components/BackButton";
import Link from "next/link";

const TypeReportes = () => {
  return (
    <div className="p-6">
      <BackButton />

      <div className="mt-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Reportes
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Post Mantenimiento Column */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h2 className="text-xl font-bold text-blue-600 mb-4">
            Post-Mantenimiento
          </h2>

          <div className="space-y-3">
            <Link
              href="/features/compressor-maintenance/technician/reports/post"
              className="block w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition text-center"
            >
              Ver Reportes
            </Link>
            <Link
              href="/features/compressor-maintenance/technician/reports/post/form"
              className="block w-full px-4 py-2 bg-blue-100 text-blue-600 font-medium rounded hover:bg-blue-200 transition text-center border border-blue-600"
            >
              Crear Reporte
            </Link>
          </div>
        </div>

        {/* Pre Mantenimiento Column */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <h2 className="text-xl font-bold text-green-600 mb-4">
            Pre-Mantenimiento
          </h2>

          <div className="space-y-3">
            <Link
              href="/features/compressor-maintenance/technician/reports/pre"
              className="block w-full px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 transition text-center"
            >
              Ver Reportes
            </Link>
            <Link
              href="/features/compressor-maintenance/technician/reports/pre/form"
              className="block w-full px-4 py-2 bg-green-100 text-green-600 font-medium rounded hover:bg-green-200 transition text-center border border-green-600"
            >
              Crear Reporte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypeReportes;
