import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { errorMessage, racesApi } from '../../lib/api';
import { Alert, Button, Card, Field, Input } from '../../components/ui';

interface RoundItem {
  key: number;
  roundNumber: number;
  name: string;
  scheduledTime: string;
}

let roundKey = 0;
function newRound(n: number): RoundItem {
  return { key: ++roundKey, roundNumber: n, name: '', scheduledTime: '' };
}

export default function AdminRacePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    tournamentId: searchParams.get('tournamentId') ?? '',
    trackId: '',
    name: '',
    scheduledStart: '',
    scheduledEnd: '',
    distanceM: '1200',
    maxHorses: '8',
    registrationDeadline: '',
  });
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await racesApi.getById(id);
        setForm({
          tournamentId: r.tournamentId,
          trackId: r.trackId,
          name: r.name,
          scheduledStart: r.scheduledStart.slice(0, 16),
          scheduledEnd: r.scheduledEnd?.slice(0, 16) ?? '',
          distanceM: String(r.distanceM),
          maxHorses: String(r.maxHorses),
          registrationDeadline: r.registrationDeadline?.slice(0, 16) ?? '',
        });
        if (r.rounds.length > 0) {
          setRounds(r.rounds.map((rr) => ({
            key: ++roundKey,
            roundNumber: rr.roundNumber,
            name: rr.name ?? '',
            scheduledTime: rr.scheduledTime?.slice(0, 16) ?? '',
          })));
        }
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  function upd(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addRound() {
    setRounds((prev) => [...prev, newRound(prev.length + 1)]);
  }

  function removeRound(key: number) {
    setRounds((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRound(key: number, field: keyof RoundItem, value: string | number) {
    setRounds((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        tournamentId: form.tournamentId,
        trackId: form.trackId,
        name: form.name,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : undefined,
        distanceM: Number(form.distanceM),
        maxHorses: Number(form.maxHorses),
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
        rounds: rounds.map((r) => ({
          roundNumber: r.roundNumber,
          name: r.name || undefined,
          scheduledTime: r.scheduledTime ? new Date(r.scheduledTime).toISOString() : undefined,
        })),
      };

      if (isEdit) {
        await racesApi.update(id!, {
          name: payload.name,
          scheduledStart: payload.scheduledStart,
          scheduledEnd: payload.scheduledEnd,
          distanceM: payload.distanceM,
          maxHorses: payload.maxHorses,
          registrationDeadline: payload.registrationDeadline,
        });
        navigate(`/races/${id}`, { replace: true });
      } else {
        const r = await racesApi.create(payload);
        navigate(`/races/${r.id}`, { replace: true });
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
      <h1 className="text-3xl font-semibold tracking-tight">{isEdit ? 'Sửa cuộc đua' : 'Tạo cuộc đua mới'}</h1>
      <Card className="mt-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <Alert kind="error">{error}</Alert>}

          <Field label="Giải đấu (Tournament ID)">
            <Input required disabled={isEdit} value={form.tournamentId} onChange={(e) => upd('tournamentId', e.target.value)} placeholder="GUID của giải đấu" />
          </Field>
          <Field label="Đường đua (Track ID)">
            <Input required disabled={isEdit} value={form.trackId} onChange={(e) => upd('trackId', e.target.value)} placeholder="GUID của đường đua" />
          </Field>
          <Field label="Tên cuộc đua">
            <Input required value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Chung kết 1200m" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Khoảng cách (m)">
              <Input type="number" required min={1} value={form.distanceM} onChange={(e) => upd('distanceM', e.target.value)} />
            </Field>
            <Field label="Số ngựa tối đa">
              <Input type="number" required min={2} max={20} value={form.maxHorses} onChange={(e) => upd('maxHorses', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Thời gian bắt đầu">
              <Input type="datetime-local" required value={form.scheduledStart} onChange={(e) => upd('scheduledStart', e.target.value)} />
            </Field>
            <Field label="Thời gian kết thúc (dự kiến)">
              <Input type="datetime-local" value={form.scheduledEnd} onChange={(e) => upd('scheduledEnd', e.target.value)} />
            </Field>
          </div>
          <Field label="Hạn đăng ký">
            <Input type="datetime-local" value={form.registrationDeadline} onChange={(e) => upd('registrationDeadline', e.target.value)} />
          </Field>

          {!isEdit && (
            <div className="border-t border-parchment/60 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Vòng đua ({rounds.length})</span>
                <Button type="button" variant="neutral" onClick={addRound}>+ Thêm vòng</Button>
              </div>
              {rounds.length > 0 && (
                <div className="mt-3 space-y-3">
                  {rounds.map((r) => (
                    <div key={r.key} className="flex items-end gap-2 rounded-[var(--radius-input)] border border-bone bg-cream/40 p-3">
                      <div className="w-16">
                        <span className="text-xs text-ash">Vòng #</span>
                        <Input type="number" min={1} value={r.roundNumber} onChange={(e) => updateRound(r.key, 'roundNumber', Number(e.target.value))} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-ash">Tên (tuỳ chọn)</span>
                        <Input value={r.name} onChange={(e) => updateRound(r.key, 'name', e.target.value)} placeholder="Bán kết" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-ash">Thời gian</span>
                        <Input type="datetime-local" value={r.scheduledTime} onChange={(e) => updateRound(r.key, 'scheduledTime', e.target.value)} />
                      </div>
                      <Button type="button" variant="danger" onClick={() => removeRound(r.key)}>X</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="neutral" type="button" onClick={() => navigate(-1)}>Hủy</Button>
            <Button type="submit" loading={loading}>{isEdit ? 'Lưu' : 'Tạo'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
