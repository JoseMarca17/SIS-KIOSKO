import { supabase } from '../lib/supabase';

const columnasProveedor = 'id,nombre,nit_ci,telefono,email,activo';
const columnasVinculo = 'producto_id,proveedor_id,costo_adquisicion,tiempo_entrega_dias,es_principal,productos(id,nombre,codigo_barras,activo),proveedores(id,nombre,activo)';

const nuloSiVacio = (valor) => {
  if (valor == null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
};

const limpiarProveedor = (proveedor) => ({
  nombre: proveedor.nombre.trim(),
  nit_ci: nuloSiVacio(proveedor.nit_ci),
  telefono: proveedor.telefono.trim(),
  email: nuloSiVacio(proveedor.email),
});

const lanzarErrorProveedor = (error) => {
  if (!error) return;
  if (error.code === '23505') {
    const errorTraducido = new Error('Ya existe un proveedor con ese NIT/CI.');
    errorTraducido.code = error.code;
    throw errorTraducido;
  }
  throw error;
};

const idPositivo = (valor, nombre) => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${nombre} no es válido.`);
  return id;
};

export const formatearCostoAdquisicion = (valor) => {
  if (!['number', 'string'].includes(typeof valor) || String(valor).trim() === '') {
    throw new Error('Ingresa un costo de adquisición válido.');
  }
  const costo = Number(valor);
  if (!Number.isFinite(costo) || costo < 0 || costo > 99999999.99) {
    throw new Error('El costo de adquisición debe estar entre 0 y 99999999.99.');
  }
  if (Math.abs(costo * 100 - Math.round(costo * 100)) >= 1e-8) {
    throw new Error('El costo de adquisición admite como máximo 2 decimales.');
  }
  return costo.toFixed(2);
};

export const listProveedores = async () => {
  const { data, error } = await supabase
    .from('proveedores')
    .select(columnasProveedor)
    .order('nombre', { ascending: true });
  lanzarErrorProveedor(error);
  return data ?? [];
};

export const createProveedor = async (proveedor) => {
  const { data, error } = await supabase
    .from('proveedores')
    .insert({ ...limpiarProveedor(proveedor), activo: true })
    .select(columnasProveedor)
    .single();
  lanzarErrorProveedor(error);
  return data;
};

export const updateProveedor = async (id, proveedor) => {
  const { data, error } = await supabase
    .from('proveedores')
    .update(limpiarProveedor(proveedor))
    .eq('id', id)
    .select(columnasProveedor)
    .single();
  lanzarErrorProveedor(error);
  return data;
};

export const setProveedorActivo = async (id, activo) => {
  const { data, error } = await supabase
    .from('proveedores')
    .update({ activo: Boolean(activo) })
    .eq('id', id)
    .select(columnasProveedor)
    .single();
  lanzarErrorProveedor(error);
  return data;
};

export const listProductoProveedor = async ({ productoId, proveedorId } = {}) => {
  let consulta = supabase
    .from('producto_proveedor')
    .select(columnasVinculo)
    .order('producto_id', { ascending: true })
    .order('proveedor_id', { ascending: true });
  if (productoId != null) consulta = consulta.eq('producto_id', idPositivo(productoId, 'El producto'));
  if (proveedorId != null) consulta = consulta.eq('proveedor_id', idPositivo(proveedorId, 'El proveedor'));

  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
};

const actualizarPrincipal = async (productoId, proveedorId, esPrincipal) => {
  const { error } = await supabase
    .from('producto_proveedor')
    .update({ es_principal: esPrincipal })
    .eq('producto_id', productoId)
    .eq('proveedor_id', proveedorId);
  if (error) throw error;
};

const restaurarPrincipales = async (productoId, vinculosPrevios, proveedorActualId) => {
  const anteriores = vinculosPrevios.filter((vinculo) => vinculo.es_principal || vinculo.proveedor_id === proveedorActualId);
  const resultados = await Promise.allSettled(anteriores.map((vinculo) => (
    actualizarPrincipal(productoId, vinculo.proveedor_id, vinculo.es_principal)
  )));
  if (!vinculosPrevios.some((vinculo) => vinculo.proveedor_id === proveedorActualId)) {
    await actualizarPrincipal(productoId, proveedorActualId, false);
  }
  const fallo = resultados.find((resultado) => resultado.status === 'rejected');
  if (fallo) throw fallo.reason;
};

export const upsertProductoProveedor = async (vinculo) => {
  const productoId = idPositivo(vinculo.producto_id, 'El producto');
  const proveedorId = idPositivo(vinculo.proveedor_id, 'El proveedor');
  const dias = Number(vinculo.tiempo_entrega_dias);
  if (!Number.isInteger(dias) || dias < 0) throw new Error('El tiempo de entrega debe ser un entero mayor o igual a 0.');
  if (typeof vinculo.es_principal !== 'boolean') throw new Error('Indica si el vínculo es principal.');

  const datos = {
    producto_id: productoId,
    proveedor_id: proveedorId,
    costo_adquisicion: formatearCostoAdquisicion(vinculo.costo_adquisicion),
    tiempo_entrega_dias: dias,
    es_principal: vinculo.es_principal,
  };

  const vinculosPrevios = vinculo.es_principal ? await listProductoProveedor({ productoId }) : [];
  const { data, error } = await supabase
    .from('producto_proveedor')
    .upsert(datos, { onConflict: 'producto_id,proveedor_id' })
    .select(columnasVinculo)
    .single();
  if (error) throw error;

  if (vinculo.es_principal) {
    const { error: errorSecundarios } = await supabase
      .from('producto_proveedor')
      .update({ es_principal: false })
      .eq('producto_id', productoId)
      .neq('proveedor_id', proveedorId)
      .eq('es_principal', true);
    if (errorSecundarios) {
      try {
        await restaurarPrincipales(productoId, vinculosPrevios, proveedorId);
      } catch (errorRestauracion) {
        throw new Error(`No se pudo cambiar el proveedor principal ni restaurar el estado anterior: ${errorSecundarios.message}. ${errorRestauracion.message}`);
      }
      throw new Error(`No se pudieron desmarcar los otros proveedores principales: ${errorSecundarios.message}`);
    }
  }

  return data;
};
