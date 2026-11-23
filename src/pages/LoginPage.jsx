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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-blue-500/5" aria-hidden="true" />
      <button type="button" className="icon-button absolute right-4 top-4 sm:right-6 sm:top-6" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
        {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
      </button>

      <section className="card relative w-full max-w-md p-6 sm:p-8" aria-labelledby="login-title">
        <div className="mb-8 text-center">
          <div className="mx-auto flex w-fit items-center gap-3">
            <span className="rounded-2xl bg-brand p-3 text-white" aria-hidden="true"><PackageSearch size={31} /></span>
            <span className="text-2xl font-bold tracking-tight text-txtprimary">KioskoControl</span>
          </div>
          <h1 id="login-title" className="mt-6 text-xl font-semibold text-txtprimary">Inicia sesión</h1>
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
            {errors.usuarioLogin ? <p id="usuarioLogin-error" className="mt-1.5 text-xs text-danger">{errors.usuarioLogin.message}</p> : null}
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
              <button type="button" className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-txtsecondary hover:bg-subtle hover:text-txtprimary" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {errors.password ? <p id="password-error" className="mt-1.5 text-xs text-danger">{errors.password.message}</p> : null}
          </div>

          {serverError ? <div className="rounded-xl bg-red-500/10 px-3.5 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20 dark:text-red-300 dark:ring-red-400/20" role="alert">{serverError}</div> : null}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> : null}
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
