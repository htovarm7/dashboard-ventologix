"use client";

import BackButton from "@/components/BackButton";
import React from "react";

export default function ReportDetail({
  params,
}: {
  params: Promise<{ id_report: string }>;
}) {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(({ id_report }) => setId(id_report));
  }, [params]);

  if (!id) {
    return <div>Cargando...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <BackButton />
      <div className="max-w-7xl mx-auto mt-4">
        <h1 className="text-3xl font-bold mb-4">Detalle del Reporte</h1>
        <p className="text-gray-600">ID del reporte: {id}</p>
      </div>
    </main>
  );
}
