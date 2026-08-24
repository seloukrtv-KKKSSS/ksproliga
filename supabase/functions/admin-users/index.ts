import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.112.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Empty in source control. A random one-time value is injected only into the
// first bootstrap deployment and that deployment is immediately replaced.
const BOOTSTRAP_TOKEN = ""
const APP_URL = "https://ksliga.com"

type OrganizerInput = {
  name?: unknown
  email?: unknown
  championship_ids?: unknown
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  })
}

function normalizeOrganizer(input: OrganizerInput) {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const championshipIds = Array.isArray(input.championship_ids)
    ? [...new Set(input.championship_ids.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))]
    : []

  if (name.length < 2 || name.length > 100) throw new Error("Вкажіть коректне ім’я організатора")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Вкажіть коректний email організатора")

  return { name, email, championshipIds }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: "Supabase server configuration is unavailable" }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  try {
    const body = await request.json()
    const action = typeof body?.action === "string" ? body.action : ""

    if (action === "bootstrap") {
      if (!BOOTSTRAP_TOKEN || body?.bootstrapToken !== BOOTSTRAP_TOKEN) {
        return json({ success: false, error: "Bootstrap is disabled" }, 403)
      }

      const { count, error: profileCountError } = await admin
        .from("organizer_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin")
      if (profileCountError) throw profileCountError
      if ((count ?? 0) > 0) return json({ success: false, error: "Main administrator already exists" }, 409)

      const { name, email } = normalizeOrganizer({
        name: body?.name,
        email: body?.email,
        championship_ids: [],
      })
      const password = typeof body?.password === "string" ? body.password : ""
      if (password.length < 6) throw new Error("Пароль повинен містити щонайменше 6 символів")

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { role: "admin" },
      })
      if (createError || !created.user) throw createError || new Error("Не вдалося створити адміністратора")

      const { data: profile, error: profileError } = await admin
        .from("organizer_profiles")
        .insert({
          user_id: created.user.id,
          name,
          email,
          role: "admin",
          championship_ids: [],
          is_active: true,
        })
        .select("user_id,name,email,role,championship_ids,is_active,last_login_at,created_at,updated_at")
        .single()

      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id)
        throw profileError
      }

      return json({ success: true, profile })
    }

    const authorization = request.headers.get("Authorization") || ""
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
    if (!accessToken) return json({ success: false, error: "Потрібна авторизація" }, 401)

    const { data: callerData, error: callerError } = await admin.auth.getUser(accessToken)
    if (callerError || !callerData.user) return json({ success: false, error: "Сесія недійсна" }, 401)

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("organizer_profiles")
      .select("user_id,role,is_active")
      .eq("user_id", callerData.user.id)
      .single()
    if (callerProfileError || !callerProfile?.is_active || callerProfile.role !== "admin") {
      return json({ success: false, error: "Ця дія доступна лише головному адміністратору" }, 403)
    }

    if (action === "invite") {
      const { name, email, championshipIds } = normalizeOrganizer(body?.organizer || {})
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${APP_URL}/auth/update-password`,
        data: { name },
      })
      if (inviteError || !invited.user) throw inviteError || new Error("Не вдалося надіслати запрошення")

      const { error: metadataError } = await admin.auth.admin.updateUserById(invited.user.id, {
        app_metadata: { role: "organizer" },
      })
      if (metadataError) {
        await admin.auth.admin.deleteUser(invited.user.id)
        throw metadataError
      }

      const { data: profile, error: profileError } = await admin
        .from("organizer_profiles")
        .insert({
          user_id: invited.user.id,
          name,
          email,
          role: "organizer",
          championship_ids: championshipIds,
          is_active: true,
        })
        .select("user_id,name,email,role,championship_ids,is_active,last_login_at,created_at,updated_at")
        .single()
      if (profileError) {
        await admin.auth.admin.deleteUser(invited.user.id)
        throw profileError
      }

      return json({ success: true, profile })
    }

    const userId = typeof body?.userId === "string" ? body.userId : ""
    if (!userId) throw new Error("Не вказано обліковий запис організатора")

    const { data: target, error: targetError } = await admin
      .from("organizer_profiles")
      .select("user_id,email,role")
      .eq("user_id", userId)
      .single()
    if (targetError || !target) throw new Error("Організатора не знайдено")
    if (target.role === "admin") return json({ success: false, error: "Головного адміністратора не можна змінити тут" }, 403)

    if (action === "update") {
      const { name, email, championshipIds } = normalizeOrganizer(body?.organizer || {})
      if (email !== target.email) {
        const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
          email,
          email_confirm: true,
          user_metadata: { name },
        })
        if (emailError) throw emailError
      } else {
        const { error: nameError } = await admin.auth.admin.updateUserById(userId, {
          user_metadata: { name },
        })
        if (nameError) throw nameError
      }

      const { data: profile, error: profileError } = await admin
        .from("organizer_profiles")
        .update({
          name,
          email,
          championship_ids: championshipIds,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("user_id,name,email,role,championship_ids,is_active,last_login_at,created_at,updated_at")
        .single()
      if (profileError) throw profileError

      return json({ success: true, profile })
    }

    if (action === "delete") {
      await admin
        .from("organizer_profiles")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)

      const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError
      return json({ success: true, profile: null })
    }

    return json({ success: false, error: "Невідома дія" }, 400)
  } catch (error) {
    console.error("admin-users error", error)
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Не вдалося виконати операцію",
    }, 400)
  }
})
