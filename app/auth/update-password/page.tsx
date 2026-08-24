"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) setIsSessionReady(Boolean(data.session))
    }

    void checkSession()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setIsSessionReady(Boolean(session))
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("Пароль повинен містити щонайменше 6 символів")
      return
    }
    if (password !== confirmation) {
      setError("Паролі не збігаються")
      return
    }

    setIsSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setSuccess(true)
    await supabase.auth.signOut()
    window.setTimeout(() => window.location.replace("/?admin=1"), 1100)
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16 flex items-center justify-center">
      <Card className="liquid-glass-card w-full max-w-md overflow-hidden">
        <CardHeader className="border-b border-white/60 bg-white/35 px-6 py-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="brand-mark h-11 w-11 overflow-hidden rounded-2xl">
              <Image src="/images/ks-logo.png" alt="KS LIGA" width={44} height={44} className="h-full w-full object-cover" priority />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">KS LIGA</div>
              <div className="text-xs text-slate-500">Захищений доступ</div>
            </div>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Створення нового пароля
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          {success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
              <h1 className="text-lg font-black text-slate-950">Пароль успішно оновлено</h1>
              <p className="mt-1 text-sm text-slate-500">Повертаємо вас до входу в адмін-панель…</p>
            </div>
          ) : !isSessionReady ? (
            <div className="py-8 text-center">
              <KeyRound className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h1 className="text-base font-bold text-slate-900">Посилання недійсне або прострочене</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Поверніться до входу та запросіть новий лист через кнопку «Забули пароль?».
              </p>
              <Button className="ios-btn-primary mt-5" onClick={() => window.location.replace("/?admin=1")}>
                Повернутися до входу
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Введіть пароль, який надалі використовуватиметься для входу в адмін-панель.
              </p>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Новий пароль"
                minLength={6}
                className="glass-input h-11 px-4"
                required
              />
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Повторіть пароль"
                minLength={6}
                className="glass-input h-11 px-4"
                required
              />
              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
              <Button type="submit" disabled={isSaving} className="ios-btn-primary h-11 w-full font-bold">
                {isSaving ? "Зберігаємо…" : "Зберегти новий пароль"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
