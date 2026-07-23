import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  errorMessage,
  racingApi,
  type AssignedRaceDto,
} from '../../lib/api';
import { Alert, Button, Card, Field, Spinner } from '../../components/ui';

export default function RaceReportPage() {
  const [assigned, setAssigned] = useState<AssignedRaceDto[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssigned(await racingApi.getAssignedRaces());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedRaceId) { setError('Vui lòng chọn cuộc đua.'); return; }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await racingApi.createReport(selectedRaceId, summary || undefined);
      setSuccess(res.message);
      setSummary('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Lập biên bản cuộc đua</h1>
        <p className="mt-1 text-stone">Tạo biên bản tổng kết sau cuộc đua.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-stone"><Spinner /> Đang tải…</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold">Tạo biên bản mới</h2>
            <p className="mt-1 text-sm text-stone">Chọn cuộc đua đã được phân công và nhập nội dung biên bản.</p>

            <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
              {error && <Alert kind="error">{error}</Alert>}
              {success && <Alert kind="success">{success}</Alert>}

              <Field label="Cuộc đua">
                <select
                  required
                  value={selectedRaceId}
                  onChange={(e) => { setSelectedRaceId(e.target.value); setSuccess(null); setError(null); }}
                  className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm outline-none focus:border-flame"
                >
                  <option value="">-- Chọn cuộc đua --</option>
                  {assigned.map((a) => (
                    <option key={a.raceId} value={a.raceId}>
                      {a.raceName}{a.tournamentName ? ` · ${a.tournamentName}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tóm tắt / Nội dung biên bản">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={6}
                  placeholder="Ghi chú diễn biến, sự cố, kết quả tổng quan…"
                  className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 resize-none"
                />
              </Field>

              <div className="flex justify-end gap-2">
                <Button type="submit" loading={saving}>Lập biên bản</Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">Cuộc đua được phân công</h2>
            <p className="mt-1 text-sm text-stone">Danh sách cuộc đua bạn đang phụ trách.</p>

            {assigned.length === 0 ? (
              <p className="mt-6 text-sm text-ash">Chưa có cuộc đua nào được phân công.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {assigned.map((a) => (
                  <li
                    key={a.raceId}
                    className={`cursor-pointer rounded-[var(--radius-input)] border px-4 py-3 text-sm transition hover:border-flame/40 ${selectedRaceId === a.raceId ? 'border-flame bg-marigold/20' : 'border-bone'}`}
                    onClick={() => { setSelectedRaceId(a.raceId); setSuccess(null); setError(null); }}
                  >
                    <div className="font-medium text-ink">{a.raceName}</div>
                    {a.tournamentName && <div className="text-xs text-stone">{a.tournamentName}</div>}
                    <div className="mt-0.5 text-xs text-ash">
                      {new Date(a.scheduledStart).toLocaleString('vi-VN')} · {a.entries.length} ngựa
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
