import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { errorMessage, tournamentsApi } from '../../lib/api';
import { Alert, Button, Card, Field, Input } from '../../components/ui';

export default function AdminTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ name: '', description: '', location: '', startDate: '', endDate: '', totalPrizePool: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const t = await tournamentsApi.getById(id);
        setForm({
          name: t.name,
          description: t.description ?? '',
          location: t.location ?? '',
          startDate: t.startDate.split('T')[0],
          endDate: t.endDate.split('T')[0],
          totalPrizePool: t.totalPrizePool?.toString() ?? '',
        });
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        location: form.location || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        totalPrizePool: form.totalPrizePool ? Number(form.totalPrizePool) : undefined,
      };
      if (isEdit) {
        await tournamentsApi.update(id!, payload as any);
        navigate(`/tournaments/${id}`, { replace: true });
      } else {
        const t = await tournamentsApi.create(payload);
        navigate(`/tournaments/${t.id}`, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-flame border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">{isEdit ? 'Sửa giải đấu' : 'Tạo giải đấu mới'}</h1>
      <Card className="mt-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Tên giải đấu">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Giải vô địch quốc gia 2026" />
          </Field>
          <Field label="Mô tả">
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn về giải đấu..." />
          </Field>
          <Field label="Địa điểm">
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Hà Nội" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngày bắt đầu">
              <Input type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="Ngày kết thúc">
              <Input type="date" required value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>
          <Field label="Tổng tiền thưởng (VND)">
            <Input type="number" value={form.totalPrizePool} onChange={(e) => setForm((f) => ({ ...f, totalPrizePool: e.target.value }))} placeholder="100000000" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="neutral" type="button" onClick={() => navigate(-1)}>Hủy</Button>
            <Button type="submit" loading={loading}>{isEdit ? 'Lưu' : 'Tạo'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
