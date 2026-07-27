import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { inputClass } from '../components/control-styles';
import { Field } from '../components/Field';
import { useToast } from '../components/toast-context';
import { useAuth } from '../features/auth/auth-context';

interface FieldState {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldState>({});
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/projects';

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ accessToken, user }) => {
      signIn(accessToken, user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(from, { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        // 401 belongs to the form, so it renders inline — never as a toast (docs/03 §5.1).
        setErrors({
          email: error.fieldError('email'),
          password: error.fieldError('password'),
        });
        if (error.fieldError('email') || error.fieldError('password')) {
          window.requestAnimationFrame(() => {
            if (error.fieldError('email')) emailRef.current?.focus();
            else passwordRef.current?.focus();
          });
        }
        setFormError(error.details ? null : error.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  const validate = (): boolean => {
    const next: FieldState = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length === 0) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      window.requestAnimationFrame(() => {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) emailRef.current?.focus();
        else passwordRef.current?.focus();
      });
      return;
    }
    mutation.mutate({ email: email.trim(), password });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Log in</h1>
        <p className="pt-1 text-sm text-slate-500">Continue to your projects and issue queues.</p>
      </div>

      <Field id="email" label="Email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          data-autofocus
          ref={emailRef}
          className={inputClass(Boolean(errors.email))}
          value={email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((s) => ({ ...s, email: undefined }));
          }}
          onBlur={() => {
            if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
              setErrors((s) => ({ ...s, email: 'Enter a valid email address' }));
            }
          }}
        />
      </Field>

      <Field id="password" label="Password" error={errors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          ref={passwordRef}
          className={inputClass(Boolean(errors.password))}
          value={password}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((s) => ({ ...s, password: undefined }));
          }}
        />
      </Field>

      {formError && <Alert>{formError}</Alert>}

      <Button type="submit" pending={mutation.isPending} className="w-full">
        Log in
      </Button>

      <p className="text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/signup" className="rounded font-medium text-indigo-600 hover:text-indigo-700">
          Sign up
        </Link>
      </p>
    </form>
  );
}
