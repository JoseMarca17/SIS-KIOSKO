import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Configura las variables de Supabase en .env');

const checks = [
  { login: 'admin', password: 'Admin123!', role: 'ADMIN', edgeStatus: 400 },
  { login: 'personal', password: 'Personal123!', role: 'PERSONAL', edgeStatus: 403 },
];

let failures = 0;
for (const check of checks) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const { data: auth, error: authError } = await client.auth.signInWithPassword({
      email: `${check.login}@kiosko.local`,
      password: check.password,
    });
    if (authError || !auth.user) throw authError ?? new Error('No se recibió el usuario Auth');

    const { data: perfil, error: perfilError } = await client
      .from('perfiles')
      .select('id,nombre_completo,usuario_login,rol,activo')
      .eq('id', auth.user.id)
      .single();
    if (perfilError) throw perfilError;
    if (perfil.rol !== check.role || !perfil.activo || perfil.usuario_login !== check.login) {
      throw new Error(`Perfil inesperado: ${JSON.stringify(perfil)}`);
    }

    const [lotes, alertas, ultimasAlertas, incidentes, perfiles] = await Promise.all([
      client.from('lotes').select('id', { count: 'exact', head: true }),
      client.from('alertas').select('id', { count: 'exact', head: true }).eq('atendida', false),
      client.from('alertas').select('id,tipo,mensaje,fecha_generacion,productos(nombre)').eq('atendida', false).order('fecha_generacion', { ascending: false }).limit(4),
      client.from('reportes_incidentes').select('id', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
      client.from('perfiles').select('id', { count: 'exact', head: true }),
    ]);
    for (const response of [lotes, alertas, ultimasAlertas, incidentes, perfiles]) {
      if (response.error) throw response.error;
    }
    if (check.role === 'ADMIN' && (perfiles.count ?? 0) < 2) throw new Error('ADMIN no puede listar todos los perfiles');
    if (check.role === 'PERSONAL' && perfiles.count !== 1) throw new Error('RLS de perfiles expone cuentas ajenas a PERSONAL');

    const { error: edgeError } = await client.functions.invoke('admin-users', {
      body: { action: '__probe__', payload: {} },
    });
    const edgeStatus = edgeError?.context?.status;
    if (!edgeError || edgeStatus !== check.edgeStatus) {
      throw new Error(`Control de acceso Edge inesperado: status ${edgeStatus ?? 'sin error'}`);
    }

    if (check.role === 'ADMIN') {
      const { error: selfToggleError } = await client.functions.invoke('admin-users', {
        body: { action: 'toggle_active', payload: { id: perfil.id, activo: false } },
      });
      if (selfToggleError?.context?.status !== 409) {
        throw new Error('Edge no bloqueó la desactivación de la propia cuenta');
      }
    }

    console.log(`PASS ${check.login}: Auth/perfil ${perfil.rol}; ${lotes.count ?? 0} lotes; ${alertas.count ?? 0} alertas y ${incidentes.count ?? 0} incidentes pendientes; Edge HTTP ${edgeStatus}.`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.login}: ${error.message}`);
  } finally {
    const { error } = await client.auth.signOut();
    if (error) {
      failures += 1;
      console.error(`FAIL ${check.login}: no se pudo cerrar la sesión: ${error.message}`);
    }
  }
}

if (failures) process.exitCode = 1;
else console.log('Todas las pruebas de autenticación y autorización finalizaron correctamente.');
