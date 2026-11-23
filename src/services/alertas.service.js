import { supabase } from '../lib/supabase';

export const sincronizarAlertas = async () => {
  const { error } = await supabase.rpc('rpc_sincronizar_alertas');
  if (error) throw error;
};

export const listAlertas = async () => {
  const { data, error } = await supabase.from('alertas').select('id,producto_id,lote_id,incidente_id,tipo,mensaje,fecha_generacion,atendida,productos(nombre)').order('fecha_generacion', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const atenderAlerta = async (id) => {
  const { data, error } = await supabase.from('alertas').update({ atendida: true, fecha_atencion: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const getAlertasResumen = async () => {
  const { count, error: countError } = await supabase.from('alertas').select('id', { count: 'exact', head: true }).eq('atendida', false);
  const { data, error } = await supabase.from('alertas').select('id,tipo,mensaje,fecha_generacion,productos(nombre)').eq('atendida', false).order('fecha_generacion', { ascending: false }).limit(4);
  if (countError) throw countError;
  if (error) throw error;
  return { count: count ?? 0, latest: data ?? [] };
};

export const getIncidentesPendientesCount = async () => {
  const { count, error } = await supabase.from('reportes_incidentes').select('id', { count: 'exact', head: true }).eq('estado', 'PENDIENTE');
  if (error) throw error;
  return count ?? 0;
};
