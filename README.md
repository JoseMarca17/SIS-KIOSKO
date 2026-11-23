# KioskoControl — Fase 2

Aplicación base de inventario para kiosko construida con Vite, React, Tailwind CSS y Supabase. Esta fase incluye autenticación real, autorización por rol, tema claro/oscuro, layout responsivo, contadores de incidentes/alertas y administración de usuarios mediante una Edge Function segura.

## Configuración local

Requisitos: Node.js y npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Completa `.env` con:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

La clave pública usa el prefijo `sb_publishable_`. Nunca agregues una clave `service_role` al frontend ni al repositorio. El archivo `.env` está excluido por `.gitignore`.

## Accesos semilla

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin` | `Admin123!` |
| Personal | `personal` | `Personal123!` |

El campo de acceso acepta el usuario simple; la aplicación lo normaliza internamente a `@kiosko.local`.

## Comandos

```bash
npm run dev       # servidor de desarrollo
npm run build     # compilación de producción
npm run preview   # vista previa del build
npm run test:auth # Auth admin/personal, perfiles, lotes y control Edge (solo lectura/probe)
```

La prueba de autenticación abre y cierra sesiones de los dos usuarios semilla. Su llamada de prueba a `admin-users` no crea ni modifica usuarios: verifica que una acción desconocida llegue hasta ADMIN (HTTP 400) y que PERSONAL sea rechazado (HTTP 403).

## Administración de usuarios

`src/pages/UsuariosPage.jsx` lee perfiles con Supabase y realiza todas las mutaciones exclusivamente mediante `admin-users`. La función `supabase/functions/admin-users/index.ts` comprueba JWT, rol ADMIN y cuenta activa antes de crear usuarios, actualizar nombre/rol, restablecer contraseñas o activar/desactivar cuentas. La `service_role` solo se obtiene de los secretos del entorno Deno de Supabase.

Para publicar cambios de la función usando Supabase CLI autenticado:

```bash
supabase functions deploy admin-users --project-ref fnwmfqihefrhmqzcbqde
```

No se modifican las migraciones de Fase 1. Las rutas restantes contienen placeholders que se reemplazarán en las fases siguientes.
