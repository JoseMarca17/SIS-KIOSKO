import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Moon, PackageSearch, Sun, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const loginSchema = z.object({
  usuarioLogin: z.string().trim().min(1, 'Ingresa tu usuario.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

/* Fondo decorativo: degradado 135°, patrón de puntos y dos manchas de luz que flotan. */
function LoginBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,rgb(var(--login-from))_0%,rgb(var(--login-via))_50%,rgb(var(--login-to))_100%)]" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full text-sidebar-text opacity-[0.14]">
        <defs>
          <pattern id="login-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-dots)" />
      </svg>
      <span className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-glow-lilac/35 blur-[110px] animate-drift-a motion-reduce:animate-none sm:h-[34rem] sm:w-[34rem]" />
      <span className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-accent/[0.18] blur-[120px] animate-drift-b motion-reduce:animate-none sm:h-[36rem] sm:w-[36rem]" />
    </div>
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
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <LoginBackdrop />

      <button
        type="button"
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-sidebar-text/20 bg-sidebar-text/10 text-sidebar-text backdrop-blur-sm transition-[background-color,transform] duration-150 ease-out-expo hover:bg-sidebar-text/20 active:scale-[0.94] focus-visible:ring-sidebar-text focus-visible:ring-offset-login-via sm:right-6 sm:top-6"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        <span key={theme} className="inline-flex animate-spin-swap">
          {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </span>
      </button>

      <section className="relative w-full max-w-md rounded-2xl border border-transparent bg-surface p-6 text-txtprimary shadow-login animate-fade-up dark:border-borderdef sm:p-8" aria-labelledby="login-title">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-brand-solid p-3 text-on-brand shadow-card" aria-hidden="true"><PackageSearch size={28} /></span>
            <span className="text-2xl font-bold tracking-tight text-txtprimary">KioskoControl</span>
          </div>
          <h1 id="login-title" className="mt-7 text-xl font-semibold tracking-tight text-txtprimary">Inicia sesión</h1>
          <p className="mt-1.5 text-sm text-txtsecondary">Gestiona tu kiosko de forma simple y segura.</p>
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
    </main>
  );
}
