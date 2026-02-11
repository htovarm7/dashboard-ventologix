import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PostMantenimientoData {
  folio: string;
  // Display y Horas de Trabajo
  display_enciende_final?: string;
  horas_totales_final?: number;
  horas_carga_final?: number;
  horas_descarga_final?: number;
  // Voltajes y Amperajes
  voltaje_alimentacion_final?: number;
  amperaje_motor_carga_final?: number;
  amperaje_ventilador_final?: number;
  // Aceite
  fugas_aceite_final?: string;
  aceite_oscuro_final?: string;
  // Temperaturas
  temp_ambiente_final?: number;
  temp_compresion_display_final?: number;
  temp_compresion_laser_final?: number;
  temp_separador_aceite_final?: number;
  temp_interna_cuarto_final?: number;
  delta_t_enfriador_aceite_final?: number;
  temp_motor_electrico_final?: number;
  // Presiones
  presion_carga_final?: number;
  presion_descarga_final?: number;
  delta_p_separador_final?: number;
  // Fugas de Aire
  fugas_aire_final?: string;
  // Firmas
  nombre_persona_cargo?: string;
  firma_persona_cargo?: string;
  firma_tecnico_ventologix?: string;
}

interface SaveResponse {
  success: boolean;
  message?: string;
  folio?: string;
  error?: string;
  details?: string;
}

export function usePostMantenimiento() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePostMantenimiento = useCallback(
    async (data: PostMantenimientoData): Promise<SaveResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/reporte_mtto/post-mtto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMsg =
            result.error || result.message || "Error al guardar los datos";
          setError(errorMsg);
          return null;
        }

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error desconocido";
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getPostMantenimiento = useCallback(async (folio: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/reporte_mtto/post-mtto/${folio}`);

      if (!response.ok) {
        setError("Error al obtener los datos");
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    savePostMantenimiento,
    getPostMantenimiento,
    loading,
    error,
  };
}
