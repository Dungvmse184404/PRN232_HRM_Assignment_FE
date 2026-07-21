import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  racingApi,
  type AssignedRaceDto,
  type AssignedRaceEntryDto,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';
import InspectionFormModal from '../../components/racing/InspectionFormModal';

const RESULT_LABEL: Record<string, string> = { Eligible: 'Đạt', Ineligible: 'Không đạt' };

export default function HorseInspectionPage() {
  const [assigned, setAssigned] = useState<AssignedRaceDto[]>([]);
  const [selected, setSelected] = useState<AssignedRaceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectFor, setInspectFor] = useState<AssignedRaceEntryDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await racingApi.getAssignedRaces();
      setAssigned(data);
      if (selected) {
        const refreshed = data.find((a) => a.raceId === selected.raceId);
        setSelected(refreshed ?? null);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Kiểm tra ngựa</h1>
        <p className="mt-1 text-stone">Ghi nhận kết quả kiểm tra sức khỏe ngựa trước đua (FR-24).</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <div className="py-16 text-center text-stone"><Spinner /> Đang tải…</div>
      ) : assigned.length === 0 ? (
        <Card className="py-16 text-center text-stone">Chưa có cuộc đua nào được phân công cho bạn.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assigned.map((a) => (
          <div
            key={a.id}
            className={`cursor-pointer rounded-[var(--radius-card)] border border-parchment/60 bg-paper p-5 transition hover:border-flame/40 ${selected?.raceId === a.raceId ? 'border-flame' : ''}`}
            onClick={() => setSelected(a)}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold">{a.raceName}</h3>
              <Badge tone={a.status === 'Assigned' ? 'flame' : 'green'}>{a.status === 'Assigned' ? 'Đang phụ trách' : 'Hoàn thành'}</Badge>
            </div>
            <p className="text-xs text-ash">{new Date(a.scheduledStart).toLocaleString('vi-VN')}</p>
            <p className="text-sm text-stone">{a.entries.length} ngựa đăng ký</p>
          </div>
          ))}
        </div>
      )}

      {selected && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-parchment/60 px-5 py-4">
            <h2 className="text-lg font-semibold">{selected.raceName} — Danh sách ngựa</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Mã đăng ký</Th>
                  <Th>Jockey</Th>
                  <Th>Kết quả kiểm tra</Th>
                  <Th>Ghi chú</Th>
                  <Th className="text-right">Hành động</Th>
                </tr>
              </thead>
              <tbody>
                {selected.entries.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-stone">Chưa có ngựa nào đăng ký.</td></tr>
                )}
                {selected.entries.map((e) => (
                  <tr key={e.raceEntryId} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                    <td className="px-5 py-3 font-mono text-xs text-stone">{e.raceEntryId.slice(0, 8)}…</td>
                    <td className="px-5 py-3 text-stone">{e.jockeyName ?? '—'}</td>
                    <td className="px-5 py-3">
                      {e.inspectionResult === null ? (
                        <Badge tone="neutral">Chưa kiểm tra</Badge>
                      ) : e.inspectionResult === 0 ? (
                        <Badge tone="green">{RESULT_LABEL['Eligible']}</Badge>
                      ) : (
                        <Badge tone="red">{RESULT_LABEL['Ineligible']}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone">{e.inspectionNote ?? '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <Button variant="neutral" onClick={() => setInspectFor(e)}>Ghi nhận</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {inspectFor && selected && (
        <InspectionFormModal
          entry={inspectFor}
          onClose={() => setInspectFor(null)}
          onSaved={async () => { setInspectFor(null); await load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}
