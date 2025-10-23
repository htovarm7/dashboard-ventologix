import BackButton from "@/components/BackButton";

const CreateReport = () => {
  return (
    <div>
      <BackButton />
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Crear Reporte</h1>
      <p className="text-gray-700">
        Aquí puedes crear un nuevo reporte de mantenimiento.
      </p>
    </div>
  );
};

export default CreateReport;
