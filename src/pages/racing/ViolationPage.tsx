import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  racingApi,
  type AssignedRaceDto,
  type RaceDto,
  type PagedResult,
} from '../../lib/api';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui';
import ViolationFormModal from '../../components/racing/ViolationFormModal';

const PAGE_SIZE = 10;

export default function ViolationPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [races, setRaces] = useState<PagedResult<RaceDto> | null>(null);
  const [assigned, setAssigned] = useState<AssignedRaceDto[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const selectedAssigned = assigned.find((a) => a.raceId === selectedRaceId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [racesData, assignedData] = await Promise.all([
        racingApi.listRaces({ search: search || undefined, pageNumber: page, pageSize: PAGE_SIZE }),
        racingApi.getAssignedRaces(),
      ]);
      setRaces(racesData);
      setAssigned(assignedData);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Ghi nhận vi phạm</h1>
          <p className="mt-1 text-stone">Ghi nhận vi phạm trong cuộc đua.</p>
        </div>
        {selectedRaceId && (
          <Button onClick={() => setModalOpen(true)}>+ Ghi vi phạm</Button>
        )}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm theo tên cuộc đua</span>
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="vd: Grand Prix"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Cuộc đua đang chọn</span>
            <select
              value={selectedRaceId}
              onChange={(e) => setSelectedRaceId(e.target.value)}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
            >
              <option value="">-- Chọn cuộc đua --</option>
              {races?.items.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <div className="py-16 text-center text-stone"><Spinner /> Đang tải…</div>
      ) : !selectedRaceId ? (
        <Card className="py-16 text-center text-stone">Chọn cuộc đua ở trên để xem danh sách vi phạm.</Card>
      ) : !selectedAssigned ? (
        <Card className="py-12 text-center text-stone">
          Bạn không phải trọng tài phụ trách cuộc đua này, hoặc cuộc đua chưa có vi phạm nào được ghi nhận qua hệ thống phân công.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-parchment/60 px-5 py-3">
            <span className="font-semibold">{selectedAssigned.raceName}</span>
            <span className="ml-2 text-xs text-ash">- vi phạm đã ghi nhận qua phiên làm việc này</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Mã đăng ký</Th>
                  <Th>Loại vi phạm</Th>
                  <Th>Mức độ</Th>
                  <Th>Hình phạt</Th>
                  <Th>Ghi chú</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-stone">
                    Chọn "Ghi vi phạm" để thêm mới. Danh sách vi phạm chi tiết xem tại báo cáo cuộc đua.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {races && races.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-stone">
          <span>Tổng {races.totalCount} cuộc đua · Trang {races.pageNumber}/{races.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!races.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="neutral" disabled={!races.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}

      {modalOpen && selectedRaceId && (
        <ViolationFormModal
          raceId={selectedRaceId}
          entries={selectedAssigned?.entries ?? []}
          onClose={() => setModalOpen(false)}
          onSaved={async () => { setModalOpen(false); await load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}
