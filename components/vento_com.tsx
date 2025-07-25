import Image from "next/image";

interface VentoComProps {
  html: string;
}

const VentoCom: React.FC<VentoComProps> = ({ html }) => {
  return (
    <div className="ml-15">
      <div className="flex items-center">
        <Image
          src="/Ventologix_05.png"
          alt="Vento Logo"
          width={32}
          height={32}
          className="w-8 h-8"
        />
        <span className="ml-2 font-bold text-lg">Comentario VENTOLOGIX</span>
      </div>
      <div
        className="text-justify text-lg"
        dangerouslySetInnerHTML={{ __html: html || "Sin datos" }}
      />
    </div>
  );
};

export default VentoCom;
