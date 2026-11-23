import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Boxes, ClipboardList, Eye, EyeOff, LoaderCircle, LockKeyhole, Moon, PackageSearch, Sun, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const loginSchema = z.object({
  usuarioLogin: z.string().trim().min(1, 'Ingresa tu usuario.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

const highlights = [
  { icon: Boxes, text: 'Stock por lotes con control de vencimientos' },
  { icon: Bell, text: 'Alertas de stock bajo y productos por vencer' },
  { icon: ClipboardList, text: 'Kardex inmutable de cada movimiento' },
];

/* Ilustración decorativa: estantes con cajas, dibujada con SVG y tokens. */
function BrandIllustration() {
  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm text-sidebar-text" aria-hidden="true">
      <defs>
        <pattern id="login-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.25" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="320" height="200" rx="24" fill="url(#login-dots)" />
      <g fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round">
        <path d="M40 70h240M40 130h240M40 180h240" />
        <path d="M48 70v110M272 70v110" />
      </g>
      <g className="text-accent" fill="currentColor">
        <rect x="64" y="38" width="44" height="32" rx="6" opacity="0.95" />
        <rect x="188" y="148" width="40" height="32" rx="6" opacity="0.9" />
      </g>
      <g fill="currentColor">
        <rect x="116" y="46" width="34" height="24" rx="6" opacity="0.55" />
        <rect x="160" y="30" width="54" height="40" rx="6" opacity="0.25" />
        <rect x="70" y="100" width="56" height="30" rx="6" opacity="0.3" />
        <rect x="134" y="108" width="30" height="22" rx="6" opacity="0.6" />
        <rect x="200" y="96" width="52" height="34" rx="6" opacity="0.18" />
        <rect x="80" y="152" width="44" height="28" rx="6" opacity="0.45" />
        <rect x="132" y="158" width="46" height="22" rx="6" opacity="0.2" />
      </g>
      <g className="text-ok" fill="currentColor">
        <circle cx="236" cy="56" r="14" opacity="0.95" />
      </g>
      <path d="M229 56l5 5 9-10" fill="none" stroke="rgb(var(--sidebar-to))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const { theme, toggleTheme } = useThemeStore();
  const signIn = useAuthStore((state) => state.signIn);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { usuarioLogin: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const perfil = await signIn(values);
      toast.success(`Bienvenido, ${perfil.nombre_completo}.`);
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true });
    } catch (error) {
      setServerError(error.message || 'No se pudo iniciar sesión.');
    }
  };

  return (
    <main className="relative flex min-h-screen bg-base">
      {/* Panel de marca (solo escritorio) */}
      <aside className="relative hidden w-[46%] max-w-2xl overflow-hidden bg-gradient-to-br from-sidebar-from to-sidebar-to p-10 text-sidebar-text lg:flex lg:flex-col xl:p-14" aria-hidden="true">
        <span className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sidebar-text/10 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-center gap-3 animate-fade-up">
          <span className="rounded-2xl bg-sidebar-text/15 p-3 ring-1 ring-inset ring-sidebar-text/20"><PackageSearch size={28} /></span>
          <span className="text-2xl font-bold tracking-tight">KioskoControl</span>
        </div>

        <div className="relative my-auto py-10">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight animate-fade-up" style={{ animationDelay: '60ms' }}>
            Tu kiosko en orden, <span className="text-accent">sin sorpresas</span>.
          </h2>
          <p className="mt-4 max-w-md text-base text-sidebar-text/75 animate-fade-up" style={{ animationDelay: '120ms' }}>
            Inventario, incidentes y alertas en un solo lugar.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map(({ icon: Icon, text }, index) => (
              <li key={text} className="flex items-center gap-3 text-sm text-sidebar-text/85 animate-fade-up" style={{ animationDelay: `${180 + index * 50}ms` }}>
                <span className="rounded-lg bg-sidebar-text/10 p-1.5"><Icon size={16} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: '320ms' }}>
          <BrandIllustration />
        </div>
      </aside>

      {/* Formulario */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <button type="button" className="icon-button absolute right-4 top-4 overflow-hidden sm:right-6 sm:top-6" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
          <span key={theme} className="inline-flex animate-spin-swap">
            {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </span>
        </button>

        <section className="card relative w-full max-w-md p-6 animate-fade-up sm:p-8" aria-labelledby="login-title">
          <div className="mb-8">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="rounded-2xl bg-brand-solid p-3 text-on-brand" aria-hidden="true"><PackageSearch size={28} /></span>
              <span className="text-2xl font-bold tracking-tight text-txtprimary">KioskoControl</span>
            </div>
            <h1 id="login-title" className="mt-6 text-2xl font-bold tracking-tight text-txtprimary lg:mt-0">Inicia sesión</h1>
            <p className="mt-2 text-sm text-txtsecondary">Gestiona tu kiosko de forma simple y segura.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="usuarioLogin" className="mb-2 block text-sm font-medium text-txtprimary">Usuario</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txtsecondary" size={18} aria-hidden="true" />
                <input
                  id="usuarioLogin"
                  type="text"
                  className="control pl-10"
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  aria-invalid={Boolean(errors.usuarioLogin)}
                  aria-describedby={errors.usuarioLogin ? 'usuarioLogin-error' : undefined}
                  {...register('usuarioLogin')}
                />
              </div>
              {errors.usuarioLogin ? <p id="usuarioLogin-error" className="mt-1.5 text-xs font-medium text-danger-fg animate-fade-in">{errors.usuarioLogin.message}</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-txtprimary">Contraseña</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txtsecondary" size={18} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="control px-10"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button type="button" className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-txtsecondary transition-colors hover:bg-subtle hover:text-txtprimary" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {errors.password ? <p id="password-error" className="mt-1.5 text-xs font-medium text-danger-fg animate-fade-in">{errors.password.message}</p> : null}
            </div>

            {serverError ? <div className="rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger-fg ring-1 ring-inset ring-danger/25 animate-fade-in" role="alert">{serverError}</div> : null}

            <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
