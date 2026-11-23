import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

let profileRequest = 0;
let initializationPromise;

const fetchPerfil = async (userId) => {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id,nombre_completo,usuario_login,rol,activo,creado_en')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

const clearAuthState = (set) => {
  queryClient.clear();
  set({ session: null, perfil: null, isLoadingSession: false });
};

export const useAuthStore = create((set, get) => ({
  session: null,
  perfil: null,
  isLoadingSession: true,

  initAuth: () => {
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      const request = ++profileRequest;
      set({ isLoadingSession: true });

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          profileRequest += 1;
          clearAuthState(set);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          set({ session });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (!session) {
            profileRequest += 1;
            clearAuthState(set);
            return;
          }
          set({ session, isLoadingSession: true });

          const eventRequest = ++profileRequest;
          // No se esperan llamadas del SDK dentro del callback: evita deadlocks de Auth.
          window.setTimeout(async () => {
            try {
              const perfil = await fetchPerfil(session.user.id);
              if (eventRequest !== profileRequest) return;
              if (!perfil.activo) {
                await supabase.auth.signOut();
                clearAuthState(set);
                return;
              }
              set({ session, perfil, isLoadingSession: false });
            } catch {
              if (eventRequest !== profileRequest) return;
              await supabase.auth.signOut();
              clearAuthState(set);
            }
          }, 0);
        }
      });

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          const perfil = await fetchPerfil(session.user.id);
          if (!perfil.activo) {
            await supabase.auth.signOut();
            if (request === profileRequest) clearAuthState(set);
            return;
          }
          if (request === profileRequest) set({ session, perfil, isLoadingSession: false });
        } else if (request === profileRequest) {
          clearAuthState(set);
        }
      } catch {
        await supabase.auth.signOut();
        if (request === profileRequest) clearAuthState(set);
      }
    })();

    return initializationPromise;
  },

  signIn: async ({ usuarioLogin, password }) => {
    const normalizedLogin = usuarioLogin.trim().toLowerCase();
    const email = normalizedLogin.includes('@')
      ? normalizedLogin
      : `${normalizedLogin}@kiosko.local`;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    let perfil;
    try {
      perfil = await fetchPerfil(data.session.user.id);
    } catch {
      await get().signOut();
      throw new Error('No se pudo cargar tu perfil. Contacta al administrador.');
    }

    if (!perfil.activo) {
      await get().signOut();
      throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
    }

    profileRequest += 1;
    set({ session: data.session, perfil, isLoadingSession: false });
    return perfil;
  },

  signOut: async () => {
    profileRequest += 1;
    queryClient.clear();
    set({ session: null, perfil: null, isLoadingSession: false });
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));
