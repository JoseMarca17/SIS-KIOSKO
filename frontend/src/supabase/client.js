/**
 * Supabase es la base de datos PostgreSQL del proyecto.
 * El navegador no usa service_role ni credenciales de base de datos:
 * React consume la API Django, que mantiene las reglas de negocio.
 */
export const supabaseMode = 'django-api-over-supabase-postgres'
