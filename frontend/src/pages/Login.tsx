import { useState } from 'react';
import { DatabaseIcon, LockIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { useApp } from '../contexts/AppContext';
import { login } from '../services/authApi';
import { inputClass } from '../utils/ui';

export function Login() {
  const { signIn } = useApp();
  const [email, setEmail] = useState('chamila.perera@polydime.lk');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex h-full w-full">
      <section className="hidden min-w-0 flex-1 flex-col justify-between bg-navy-900 px-12 py-10 text-slate-200 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-accent-500 text-base font-bold text-white">
            P
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">Polydime</span>
            <span className="block text-xs text-slate-400">ERP Report Studio</span>
          </span>
        </div>

        <div className="max-w-lg">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Your ERP data, reported the way finance actually works.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Run the four standard accounting reports exactly as they have always looked, or
            drag ERP fields onto a blank canvas to build your own — grouped, subtotalled and
            exported in a few clicks. No SQL required.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-navy-700 pt-6">
            <div>
              <dt className="text-2xs uppercase tracking-wide text-slate-400">ERP tables</dt>
              <dd className="tabular text-xl font-semibold text-white">17</dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-slate-400">Fields catalogued</dt>
              <dd className="tabular text-xl font-semibold text-white">96</dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-slate-400">Reports live</dt>
              <dd className="tabular text-xl font-semibold text-white">7</dd>
            </div>
          </dl>
        </div>

        <p className="flex items-center gap-2 text-2xs text-slate-400">
          <DatabaseIcon className="h-3.5 w-3.5" />
          Connected to POLYDIME_ERP through the secure backend API. Credentials are never
          held in the browser.
        </p>
      </section>

      <section className="flex w-full items-center justify-center bg-surface-muted px-6 lg:w-[460px]">
        <form
          className="w-full max-w-sm rounded border border-line bg-white p-6 shadow-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const user = await login(email, password);
              signIn(user.role);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
            } finally {
              setLoading(false);
            }
          }}>
          
          <h2 className="text-lg font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-xs text-ink-500">
            Use your Polydime domain account to continue.
          </p>

          {error &&
          <div className="mt-3 flex items-start gap-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
            <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          }

          <div className="mt-5 space-y-3">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required />
              
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required />
              
            </Field>
          </div>

          <Button type="submit" variant="primary" className="mt-5 w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="mt-4 text-center text-2xs text-ink-500">
            Demo accounts: chamila.perera@polydime.lk (Admin) · dilani.gunawardena@polydime.lk
            (Designer) · fredrick.rajapakse@polydime.lk (Viewer)
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-2xs text-ink-500">
            <LockIcon className="h-3 w-3" /> Single sign-on enforced by Polydime IT
          </p>
        </form>
      </section>
    </div>);

}