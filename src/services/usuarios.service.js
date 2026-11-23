import { supabase } from '../lib/supabase';

export const listUsuarios = async () => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id,nombre_completo,usuario_login,rol,activo,creado_en')
    .order('nombre_completo', { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const mutateUsuario = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, payload },
  });

  if (error) {
    let message = 'No se pudo completar la operación.';
    try {
      const body = await error.context?.json();
      if (body?.error) message = body.error;
    } catch {
      if (error.message) message = error.message;
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error);
  return data;
};
