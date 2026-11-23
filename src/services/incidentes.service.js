import { supabase } from '../lib/supabase';

export const listIncidentes = async ({ admin } = {}) => {
  const select = 'id,lote_id,solicitado_por,resuelto_por,motivo,cantidad,observacion,comentario_admin,estado,fecha_solicitud,fecha_resolucion,lotes(codigo_lote,cantidad_actual,fecha_vencimiento,productos(nombre)),solicitante:perfiles!reportes_incidentes_solicitado_por_fkey(nombre_completo),resolutor:perfiles!reportes_incidentes_resuelto_por_fkey(nombre_completo)';
  let query = supabase.from('reportes_incidentes').select(select).order('fecha_solicitud', { ascending: false });
  if (!admin) query = query.eq('solicitado_por', (await supabase.auth.getUser()).data.user?.id);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export const reportarIncidente = async (payload) => {
  const { data, error } = await supabase.rpc('rpc_reportar_incidente', { p_lote_id: Number(payload.lote_id), p_motivo: payload.motivo, p_cantidad: Number(payload.cantidad), p_observacion: payload.observacion });
  if (error) throw error;
  return data;
};

export const resolverIncidente = async ({ id, aprobar, comentario }) => {
  const { data, error } = await supabase.rpc('rpc_resolver_incidente', { p_incidente_id: Number(id), p_aprobar: aprobar, p_comentario_admin: comentario || null });
  if (error) throw error;
  return data;
};
