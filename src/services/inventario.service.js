import { supabase } from '../lib/supabase';

export const listInventario = async () => {
  const { data, error } = await supabase.from('v_productos_stock').select('*').order('nombre');
  if (error) throw error;
  return data ?? [];
};

export const listLotes = async (productoId) => {
  let query = supabase.from('lotes').select('id,producto_id,proveedor_id,codigo_lote,fecha_ingreso,fecha_vencimiento,cantidad_inicial,cantidad_actual,costo_unitario,productos(nombre),proveedores(nombre)').order('fecha_vencimiento', { ascending: true, nullsFirst: false });
  if (productoId) query = query.eq('producto_id', productoId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

export const registrarEntrada = async (payload) => {
  const { data, error } = await supabase.rpc('rpc_registrar_entrada_lote', {
    p_producto_id: Number(payload.producto_id), p_proveedor_id: payload.proveedor_id ? Number(payload.proveedor_id) : null,
    p_codigo_lote: payload.codigo_lote || null, p_fecha_vencimiento: payload.fecha_vencimiento || null,
    p_cantidad: Number(payload.cantidad), p_costo_unitario: Number(payload.costo_unitario), p_motivo: payload.motivo,
  });
  if (error) throw error;
  return data;
};

export const movimientoDirecto = async (payload) => {
  const { data, error } = await supabase.rpc('rpc_movimiento_directo_admin', {
    p_producto_id: payload.producto_id ? Number(payload.producto_id) : null,
    p_lote_id: payload.lote_id ? Number(payload.lote_id) : null, p_tipo: payload.tipo,
    p_cantidad: Number(payload.cantidad), p_motivo: payload.motivo,
  });
  if (error) throw error;
  return data;
};
