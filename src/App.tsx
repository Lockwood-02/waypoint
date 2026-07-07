import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signIn, signOut, signUp } from './features/auth/authService'
import { supabase } from './lib/supabaseClient'

type AuthMode = 'login' | 'signup'

type AuthState = {
  email: string
  password: string
}

const initialAuthState: AuthState = {
  email: '',
  password: '',
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [formState, setFormState] = useState<AuthState>(initialAuthState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const title = authMode === 'login' ? 'Welcome back' : 'Create your account'
  const subtitle =
    authMode === 'login'
      ? 'Sign in to continue to your Waypoint dashboard.'
      : 'Start with an email and password, then confirm your account if Supabase email verification is enabled.'

  const userRows = useMemo(
    () =>
      user
        ? [
            ['Email', user.email ?? 'Not provided'],
            ['User ID', user.id],
            ['Provider', user.app_metadata.provider ?? 'email'],
            [
              'Created',
              user.created_at
                ? new Intl.DateTimeFormat('en', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(user.created_at))
                : 'Not available',
            ],
          ]
        : [],
    [user],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const action = authMode === 'login' ? signIn : signUp
    const { error, data } = await action(formState.email, formState.password)

    if (error) {
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (authMode === 'signup' && !data.session) {
      setMessage('Account created. Check your email to confirm your signup.')
      setFormState(initialAuthState)
    }

    setIsSubmitting(false)
  }

  async function handleSignOut() {
    setMessage('')
    await signOut()
  }

  function switchMode(mode: AuthMode) {
    setAuthMode(mode)
    setMessage('')
    setFormState(initialAuthState)
  }

  if (isLoadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-sm font-medium text-slate-300">Loading Waypoint...</p>
      </main>
    )
  }

  if (user) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Waypoint
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Home dashboard
              </h1>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              Sign out
            </button>
          </nav>

          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/40">
              <p className="text-sm font-medium text-cyan-200">
                Signed in as
              </p>
              <h2 className="mt-3 break-words text-2xl font-bold">
                {user.email}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                This screen is connected to Supabase Auth and is populated from
                the active session. It gives you a clean default place to expand
                into profiles, tasks, settings, or any other app data next.
              </p>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
              <h2 className="text-lg font-semibold">User information</h2>
              <dl className="mt-5 space-y-4">
                {userRows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-slate-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/50">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Waypoint
          </p>
          <h1 className="mt-3 text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-md bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              authMode === 'login'
                ? 'bg-cyan-300 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              authMode === 'signup'
                ? 'bg-cyan-300 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Email</span>
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={formState.password}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="At least 6 characters"
            />
          </label>

          {message ? (
            <p className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? 'Working...'
              : authMode === 'login'
                ? 'Login'
                : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
