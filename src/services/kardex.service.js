import { supabase } from '../lib/supabase';

export const listKardex = async () => {
  const { data, error } = await supabase.from('movimientos_inventario').select('id,lote_id,usuario_id,incidente_id,tipo,cantidad,saldo_lote_posterior,motivo,fecha_hora,lotes(codigo_lote,costo_unitario,productos(nombre)),perfiles(nombre_completo)').order('fecha_hora', { ascending: false });
  if (error) throw error;
  return data ?? [];
};
