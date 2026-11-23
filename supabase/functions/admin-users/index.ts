import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const profileFields = "id,nombre_completo,usuario_login,rol,activo,creado_en";
const roles = ["ADMIN", "PERSONAL"] as const;
type Role = typeof roles[number];
type Payload = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function failure(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function isPayload(value: unknown): value is Payload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 72;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") return failure("Método no permitido.", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("El entorno de la función no está configurado correctamente.");
    return failure("La función no está configurada correctamente.", 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return failure("Debes iniciar sesión para continuar.", 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser(token);
    if (callerError || !caller) return failure("La sesión no es válida o ha expirado.", 401);

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("perfiles")
      .select("id,rol,activo")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || !callerProfile || callerProfile.rol !== "ADMIN" || !callerProfile.activo) {
      return failure("No tienes permisos para administrar usuarios.", 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return failure("El cuerpo de la solicitud debe ser JSON válido.");
    }
    if (!isPayload(body) || !isPayload(body.payload) || typeof body.action !== "string") {
      return failure("Solicitud inválida. Envía action y payload.");
    }

    const { action, payload } = body;

    if (action === "create") {
      const nombreCompleto = cleanText(payload.nombre_completo, 100);
      const usuarioLogin = cleanText(payload.usuario_login, 50)?.toLowerCase();
      const password = payload.password;
      const rol = payload.rol;

      if (!nombreCompleto || nombreCompleto.length < 2) return failure("Ingresa un nombre completo válido.");
      if (!usuarioLogin || usuarioLogin.length < 3 || !/^[a-z0-9._-]+$/.test(usuarioLogin)) {
        return failure("El usuario solo puede incluir minúsculas, números, punto, guion o guion bajo.");
      }
      if (!validPassword(password)) return failure("La contraseña debe tener entre 8 y 72 caracteres.");
      if (!validRole(rol)) return failure("El rol debe ser ADMIN o PERSONAL.");

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: `${usuarioLogin}@kiosko.local`,
        password,
        email_confirm: true,
        user_metadata: { nombre_completo: nombreCompleto, usuario_login: usuarioLogin, rol },
      });
      if (createError || !created.user) {
        const duplicate = createError?.message.toLowerCase().includes("already");
        return failure(duplicate ? "Ese usuario de acceso ya existe." : errorMessage(createError), duplicate ? 409 : 400);
      }

      const { data: profile, error: profileError } = await adminClient
        .from("perfiles")
        .insert({
          id: created.user.id,
          nombre_completo: nombreCompleto,
          usuario_login: usuarioLogin,
          rol,
          activo: true,
        })
        .select(profileFields)
        .single();

      if (profileError) {
        const { error: rollbackError } = await adminClient.auth.admin.deleteUser(created.user.id);
        if (rollbackError) {
          console.error("No se pudo revertir el usuario Auth", created.user.id, rollbackError.message);
          return failure("No se pudo crear el perfil y la limpieza requiere revisión del administrador.", 500);
        }
        return failure(profileError.code === "23505" ? "Ese usuario de acceso ya existe." : "No se pudo crear el perfil del usuario.", profileError.code === "23505" ? 409 : 400);
      }

      return json({ user: profile }, 201);
    }

    if (action === "update_role") {
      if (!validId(payload.id)) return failure("El identificador del usuario no es válido.");
      const nombreCompleto = cleanText(payload.nombre_completo, 100);
      if (!nombreCompleto || nombreCompleto.length < 2) return failure("Ingresa un nombre completo válido.");
      if (!validRole(payload.rol)) return failure("El rol debe ser ADMIN o PERSONAL.");

      const { data: profile, error } = await adminClient
        .from("perfiles")
        .update({ nombre_completo: nombreCompleto, rol: payload.rol })
        .eq("id", payload.id)
        .select(profileFields)
        .single();
      if (error) return failure(error.code === "PGRST116" ? "El usuario no existe." : "No se pudo actualizar el usuario.", error.code === "PGRST116" ? 404 : 400);
      return json({ user: profile });
    }

    if (action === "toggle_active") {
      if (!validId(payload.id)) return failure("El identificador del usuario no es válido.");
      if (typeof payload.activo !== "boolean") return failure("Debes indicar el nuevo estado del usuario.");
      if (payload.id === caller.id) return failure("No puedes activar o desactivar tu propia cuenta.", 409);
      const activo = payload.activo;

      const { data: target, error: targetError } = await adminClient
        .from("perfiles")
        .select("id,activo")
        .eq("id", payload.id)
        .single();
      if (targetError || !target) return failure("El usuario no existe.", 404);

      if (!activo) {
        // Primero se bloquea Auth; si falla la base de datos, se revierte el bloqueo.
        const { error: banError } = await adminClient.auth.admin.updateUserById(payload.id, { ban_duration: "876600h" });
        if (banError) return failure("No se pudo bloquear el acceso del usuario.", 400);
        const { data: profile, error: updateError } = await adminClient
          .from("perfiles")
          .update({ activo: false })
          .eq("id", payload.id)
          .select(profileFields)
          .single();
        if (updateError) {
          await adminClient.auth.admin.updateUserById(payload.id, { ban_duration: "none" });
          return failure("No se pudo desactivar el perfil del usuario.", 400);
        }
        return json({ user: profile });
      }

      const { data: profile, error: updateError } = await adminClient
        .from("perfiles")
        .update({ activo: true })
        .eq("id", payload.id)
        .select(profileFields)
        .single();
      if (updateError) return failure("No se pudo activar el perfil del usuario.", 400);

      const { error: unbanError } = await adminClient.auth.admin.updateUserById(payload.id, { ban_duration: "none" });
      if (unbanError) {
        await adminClient.from("perfiles").update({ activo: false }).eq("id", payload.id);
        return failure("No se pudo restaurar el acceso Auth; el perfil permanece inactivo.", 400);
      }
      return json({ user: profile });
    }

    if (action === "reset_password") {
      if (!validId(payload.id)) return failure("El identificador del usuario no es válido.");
      if (!validPassword(payload.password)) return failure("La contraseña debe tener entre 8 y 72 caracteres.");
      const { error } = await adminClient.auth.admin.updateUserById(payload.id, { password: payload.password });
      if (error) return failure("No se pudo restablecer la contraseña.", 400);
      return json({ success: true });
    }

    return failure("Acción no válida.");
  } catch (error) {
    console.error("Error en admin-users", errorMessage(error));
    return failure("Ocurrió un error inesperado al administrar usuarios.", 500);
  }
});
