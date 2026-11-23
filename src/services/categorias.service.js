import { supabase } from '../lib/supabase';

const columnas = 'id,nombre,activo';

const lanzarError = (error) => {
  if (!error) return;
  if (error.code === '23505') {
    const errorTraducido = new Error('Ya existe una categoría con ese nombre.');
    errorTraducido.code = error.code;
    throw errorTraducido;
  }
  throw error;
};

export const listCategorias = async () => {
  const { data, error } = await supabase
    .from('categorias')
    .select(columnas)
    .order('nombre', { ascending: true });
  lanzarError(error);
  return data ?? [];
};

export const createCategoria = async ({ nombre }) => {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre: nombre.trim(), activo: true })
    .select(columnas)
    .single();
  lanzarError(error);
  return data;
};

export const updateCategoria = async (id, { nombre }) => {
  const { data, error } = await supabase
    .from('categorias')
    .update({ nombre: nombre.trim() })
    .eq('id', id)
    .select(columnas)
    .single();
  lanzarError(error);
  return data;
};

export const setCategoriaActiva = async (id, activo) => {
  const { data, error } = await supabase
    .from('categorias')
    .update({ activo: Boolean(activo) })
    .eq('id', id)
    .select(columnas)
    .single();
  lanzarError(error);
  return data;
};
