import BackButton from "@/components/BackButton";

const AllReports = () => {
  return (
    <div>
      <BackButton />
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Todos los Reportes
      </h1>
      <p className="text-gray-700">
        Aquí puedes ver todos los reportes de mantenimiento generados.
      </p>
    </div>
  );
};

export default AllReports;
