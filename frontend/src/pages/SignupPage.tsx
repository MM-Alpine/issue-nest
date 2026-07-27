import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { inputClass } from '../components/control-styles';
import { Field } from '../components/Field';
import { useToast } from '../components/toast-context';
import { useAuth } from '../features/auth/auth-context';

interface FieldState {
  name?: string;
  email?: string;
  password?: string;
}

export function SignupPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldState>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: ({ accessToken, user }) => {
      signIn(accessToken, user);
      toast.success(`Welcome to IssueHub, ${user.name.split(' ')[0]}`);
      navigate('/projects', { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_ALREADY_EXISTS') {
          setErrors({ email: 'That email is already registered. Log in instead?' });
          return;
        }
        if (error.details) {
          setErrors({
            name: error.fieldError('name'),
            email: error.fieldError('email'),
            password: error.fieldError('password'),
          });
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError('Something went wrong. Please try again.');
    },
  });

  const validate = (): boolean => {
    const next: FieldState = {};
    if (name.trim().length === 0) next.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length < 8) next.password = 'Password must be at least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    mutation.mutate({ name: name.trim(), email: email.trim(), password });
  };

  const clear = (key: keyof FieldState) => setErrors((s) => ({ ...s, [key]: undefined }));

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>

      <Field id="name" label="Name" error={errors.name}>
        <input
          id="name"
          type="text"
          autoComplete="name"
          autoFocus
          className={inputClass(Boolean(errors.name))}
          value={name}
          aria-invalid={Boolean(errors.name)}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) clear('name');
          }}
        />
      </Field>

      <Field id="email" label="Email" error={errors.email}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass(Boolean(errors.email))}
          value={email}
          aria-invalid={Boolean(errors.email)}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) clear('email');
          }}
        />
      </Field>

      <Field
        id="password"
        label="Password"
        error={errors.password}
        hint="At least 8 characters"
      >
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputClass(Boolean(errors.password))}
          value={password}
          aria-invalid={Boolean(errors.password)}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) clear('password');
          }}
        />
      </Field>

      {formError && <Alert>{formError}</Alert>}

      <Button type="submit" pending={mutation.isPending} className="w-full">
        Sign up
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="rounded font-medium text-indigo-600 hover:text-indigo-700">
          Log in
        </Link>
      </p>
    </form>
  );
}
