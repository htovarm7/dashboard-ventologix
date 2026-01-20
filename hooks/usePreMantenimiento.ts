import { useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PreMantenimientoData {
  folio: string;
  reporte_id?: number;
  equipo_enciende?: string;
  display_enciende?: string;
  horas_totales?: number;
  horas_carga?: number;
  horas_descarga?: number;
  mantenimiento_proximo?: string;
  compresor_es_master?: string;
  amperaje_maximo_motor?: number;
  ubicacion_compresor?: string;
  expulsion_aire_caliente?: string;
  operacion_muchos_polvos?: string;
  compresor_bien_instalado?: string;
  condiciones_especiales?: string;
  voltaje_alimentacion?: number;
  amperaje_motor_carga?: number;
  amperaje_ventilador?: number;
  fugas_aceite_visibles?: string;
  fugas_aire_audibles?: string;
  aceite_oscuro_degradado?: string;
  temp_ambiente?: number;
  temp_compresion_display?: number;
  temp_compresion_laser?: number;
  temp_separador_aceite?: number;
  temp_interna_cuarto?: number;
  delta_t_enfriador_aceite?: number;
  temp_motor_electrico?: number;
  metodo_control_presion?: string;
  presion_carga?: number;
  presion_descarga?: number;
  diferencial_presion?: string;
  delta_p_separador?: number;
  tipo_valvula_admision?: string;
  funcionamiento_valvula_admision?: string;
  wet_tank_existe?: boolean;
  wet_tank_litros?: number;
  wet_tank_valvula_seguridad?: boolean;
  wet_tank_dren?: boolean;
  dry_tank_existe?: boolean;
  dry_tank_litros?: number;
  dry_tank_valvula_seguridad?: boolean;
  dry_tank_dren?: boolean;
  exceso_polvo_suciedad?: boolean;
  hay_manual?: boolean;
  tablero_electrico_enciende?: boolean;
  giro_correcto_motor?: boolean;
  unidad_compresion_gira?: boolean;
  motor_ventilador_funciona?: boolean;
  razon_paro_mantenimiento?: string;
  alimentacion_electrica_conectada?: boolean;
  pastilla_adecuada_amperajes?: boolean;
  tuberia_descarga_conectada_a?: string;
}

interface SaveResponse {
  success: boolean;
  message?: string;
  id?: number;
  folio?: string;
  error?: string;
  details?: string;
}

export function usePreMantenimiento() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePreMantenimiento = useCallback(
    async (data: PreMantenimientoData): Promise<SaveResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/reporte_mtto/pre-mtto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMsg = result.error || result.message || 'Error al guardar los datos';
          setError(errorMsg);
          return null;
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPreMantenimiento = useCallback(
    async (folio: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/reporte_mtto/pre-mtto/${folio}`);

        if (!response.ok) {
          setError('Error al obtener los datos');
          return null;
        }

        const result = await response.json();
        return result.data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    savePreMantenimiento,
    getPreMantenimiento,
    loading,
    error,
  };
}
