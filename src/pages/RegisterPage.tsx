import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, errorMessage, type SelfServiceRole } from '../lib/api';
import { Alert, Button, Card, Field, Input } from '../components/ui';

const ROLE_OPTIONS: { value: SelfServiceRole; label: string }[] = [
  { value: 'HorseOwner', label: 'Chủ ngựa (Horse Owner)' },
  { value: 'Jockey', label: 'Nài ngựa (Jockey)' },
  { value: 'Spectator', label: 'Khán giả (Spectator)' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [roles, setRoles] = useState<SelfServiceRole[]>(['Spectator']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleRole(role: SelfServiceRole) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (roles.length === 0) {
      setError('Phải chọn ít nhất một vai trò.');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone || undefined,
        roles,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-[var(--shadow-glow)]">
      <h1 className="text-2xl font-semibold">Đăng ký tài khoản</h1>
      <p className="mt-1 text-sm text-stone">Tài khoản kích hoạt ngay, đăng nhập được luôn.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        {error && <Alert kind="error">{error}</Alert>}
        {success && <Alert kind="success">Đăng ký thành công! Đang chuyển tới trang đăng nhập…</Alert>}

        <Field label="Họ tên">
          <Input required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ban@hrm.local" />
        </Field>
        <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự.">
          <Input type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" />
        </Field>
        <Field label="Số điện thoại (tuỳ chọn)">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="09xxxxxxxx" />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink">Vai trò</span>
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-bone px-3 py-2 text-sm">
              <input type="checkbox" checked={roles.includes(opt.value)} onChange={() => toggleRole(opt.value)} className="accent-[var(--color-flame)]" />
              {opt.label}
            </label>
          ))}
        </fieldset>

        <Button type="submit" loading={loading} disabled={success} className="mt-2">Đăng ký</Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-flame hover:underline">Đăng nhập</Link>
      </p>
    </Card>
  );
}
