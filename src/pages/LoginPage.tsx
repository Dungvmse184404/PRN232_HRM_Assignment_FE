import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { Alert, Button, Card, Field, Input } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const to = (location.state as { from?: string })?.from ?? '/';
      navigate(to, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-[var(--shadow-glow)]">
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-stone">Vào hệ thống quản lý đua ngựa HRM.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        {error && <Alert kind="error">{error}</Alert>}
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@hrm.local" autoComplete="email" />
        </Field>
        <Field label="Mật khẩu">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
        </Field>
        <Button type="submit" loading={loading} className="mt-2">Đăng nhập</Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-flame hover:underline">Đăng ký</Link>
      </p>
    </Card>
  );
}
