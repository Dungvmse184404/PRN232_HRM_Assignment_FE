import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage, tracksApi } from '../../lib/api';
import { Alert, Button, Card, Field, Input } from '../../components/ui';

/**
 * Tạo đường đua mới. Nếu được mở từ một form khác (VD tạo cuộc đua) qua ?returnTo=...,
 * sau khi tạo xong sẽ điều hướng ngược lại kèm ?newTrackId=<id> để form gốc tự chọn đường đua vừa tạo.
 */
export default function AdminTrackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [form, setForm] = useState({ name: '', lengthM: '1200', surfaceType: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upd(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const t = await tracksApi.create({
        name: form.name,
        lengthM: Number(form.lengthM),
        surfaceType: form.surfaceType || undefined,
        location: form.location || undefined,
      });
      if (returnTo) {
        const separator = returnTo.includes('?') ? '&' : '?';
        navigate(`${returnTo}${separator}newTrackId=${t.id}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">Tạo đường đua mới</h1>
      <Card className="mt-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Tên đường đua">
            <Input required value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Trường đua Phú Thọ" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Chiều dài (m)">
              <Input type="number" required min={1} value={form.lengthM} onChange={(e) => upd('lengthM', e.target.value)} />
            </Field>
            <Field label="Loại mặt đường (tuỳ chọn)">
              <Input value={form.surfaceType} onChange={(e) => upd('surfaceType', e.target.value)} placeholder="Đất, cỏ, cát..." />
            </Field>
          </div>
          <Field label="Địa điểm (tuỳ chọn)">
            <Input value={form.location} onChange={(e) => upd('location', e.target.value)} placeholder="TP.HCM" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="neutral" type="button" onClick={() => navigate(-1)}>Hủy</Button>
            <Button type="submit" loading={loading}>Tạo</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
