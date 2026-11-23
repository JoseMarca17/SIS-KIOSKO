import { supabase } from '../lib/supabase';

const columnas = 'id,categoria_id,codigo_barras,nombre,unidad_medida,stock_minimo,stock_maximo,dias_alerta_vencimiento,activo,categorias(id,nombre,activo)';

const nuloSiVacio = (valor) => {
  if (valor == null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
};

const limpiarProducto = (producto) => ({
  categoria_id: Number(producto.categoria_id),
  codigo_barras: nuloSiVacio(producto.codigo_barras),
  nombre: producto.nombre.trim(),
  unidad_medida: producto.unidad_medida.trim(),
  stock_minimo: Number(producto.stock_minimo),
  stock_maximo: Number(producto.stock_maximo),
  dias_alerta_vencimiento: Number(producto.dias_alerta_vencimiento),
});

const lanzarError = (error) => {
  if (!error) return;
  if (error.code === '23505') {
    const errorTraducido = new Error('Ya existe un producto con ese código de barras.');
    errorTraducido.code = error.code;
    throw errorTraducido;
  }
  throw error;
};

export const listProductos = async () => {
  const { data, error } = await supabase
    .from('productos')
    .select(columnas)
    .order('nombre', { ascending: true });
  lanzarError(error);
  return data ?? [];
};

export const createProducto = async (producto) => {
  const { data, error } = await supabase
    .from('productos')
    .insert({ ...limpiarProducto(producto), activo: true })
    .select(columnas)
    .single();
  lanzarError(error);
  return data;
};

export const updateProducto = async (id, producto) => {
  const { data, error } = await supabase
    .from('productos')
    .update(limpiarProducto(producto))
    .eq('id', id)
    .select(columnas)
    .single();
  lanzarError(error);
  return data;
};

export const setProductoActivo = async (id, activo) => {
  const { data, error } = await supabase
    .from('productos')
    .update({ activo: Boolean(activo) })
    .eq('id', id)
    .select(columnas)
    .single();
  lanzarError(error);
  return data;
};
