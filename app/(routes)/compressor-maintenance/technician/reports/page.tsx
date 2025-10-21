"use client";

import BackButton from "@/components/BackButton";

const Reportes = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Reportes</h1>
        <p className="text-gray-700">
          Aquí puedes generar reportes de mantenimiento.
        </p>
      </div>
    </div>
  );
};

export default Reportes;
