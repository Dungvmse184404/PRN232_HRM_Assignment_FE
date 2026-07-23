import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  horsesApi,
  HORSE_GENDERS,
  type HorseDto,
  type HorseStatus,
  type PagedResult,
} from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Alert, Badge, Button, Card, Input, Spinner } from '../components/ui';
import HorseFormModal from '../components/horses/HorseFormModal';
import HorseDocumentsModal from '../components/horses/HorseDocumentsModal';

const PAGE_SIZE = 12;
const GENDER_LABEL: Record<string, string> = { Male: 'Đực', Female: 'Cái', Gelding: 'Thiến' };

export default function HorsesPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<HorseStatus | ''>('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PagedResult<HorseDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HorseDto | null>(null);
  const [docsFor, setDocsFor] = useState<HorseDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await horsesApi.list({
        search: search || undefined,
        status: status || undefined,
        includeInactive,
        all: isAdmin ? all : undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, includeInactive, all, isAdmin, page]);

  useEffect(() => { void load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(h: HorseDto) { setEditing(h); setFormOpen(true); }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Quản lý ngựa</h1>
          <p className="mt-1 text-stone">Tạo, cập nhật hồ sơ và giấy tờ ngựa của bạn.</p>
        </div>
        <Button onClick={openCreate}>+ Thêm ngựa</Button>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm theo tên / giống</span>
            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="vd: Thần Mã" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Trạng thái</span>
            <select
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value as HorseStatus | ''); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Retired">Đã giải nghệ</option>
            </select>
          </div>
          <label className="flex items-center gap-2 py-2.5 text-sm text-stone">
            <input type="checkbox" checked={includeInactive} onChange={(e) => { setPage(1); setIncludeInactive(e.target.checked); }} className="accent-[var(--color-flame)]" />
            Gồm cả đã xóa
          </label>
          {isAdmin && (
            <label className="flex items-center gap-2 py-2.5 text-sm text-stone">
              <input type="checkbox" checked={all} onChange={(e) => { setPage(1); setAll(e.target.checked); }} className="accent-[var(--color-flame)]" />
              Tất cả chủ ngựa (admin)
            </label>
          )}
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <div className="py-16 text-center text-stone"><Spinner /> Đang tải…</div>
      ) : data?.items.length === 0 ? (
        <Card className="py-16 text-center text-stone">Chưa có ngựa nào. Bấm “Thêm ngựa” để tạo hồ sơ đầu tiên.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((h) => (
            <Card key={h.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{h.name}</h3>
                  <p className="text-xs text-ash">{h.breed || 'Chưa rõ giống'} · {GENDER_LABEL[h.genderName] ?? h.genderName}</p>
                </div>
                {!h.isActive ? <Badge tone="red">Đã xóa</Badge>
                  : h.status === 'Retired' ? <Badge tone="neutral">Giải nghệ</Badge>
                  : <Badge tone="green">Hoạt động</Badge>}
              </div>

              <dl className="grid grid-cols-2 gap-y-1 text-sm text-stone">
                <Meta label="Màu" value={h.color} />
                <Meta label="Ngày sinh" value={h.dateOfBirth} />
                <Meta label="Cân nặng" value={h.weightKg != null ? `${h.weightKg} kg` : null} />
                <Meta label="Chiều cao" value={h.heightCm != null ? `${h.heightCm} cm` : null} />
              </dl>

              <button onClick={() => setDocsFor(h)} className="self-start text-xs font-medium text-flame hover:underline">
                {h.documents.length} giấy tờ →
              </button>

              {h.isActive && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <Button variant="neutral" onClick={() => openEdit(h)}>Sửa</Button>
                  <Button variant="neutral" onClick={() => act(() => horsesApi.changeStatus(h.id, h.status === 'Active' ? 'Retired' : 'Active'))}>
                    {h.status === 'Active' ? 'Cho giải nghệ' : 'Kích hoạt'}
                  </Button>
                  <Button variant="danger" onClick={() => { if (confirm(`Xóa ngựa “${h.name}”?`)) void act(() => horsesApi.remove(h.id)); }}>Xóa</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {data && data.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-stone">
          <span>Tổng {data.totalCount} ngựa · Trang {data.pageNumber}/{data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}

      {formOpen && (
        <HorseFormModal
          horse={editing}
          genders={HORSE_GENDERS}
          onClose={() => setFormOpen(false)}
          onSaved={async () => { setFormOpen(false); await load(); }}
          onError={setError}
        />
      )}

      {docsFor && (
        <HorseDocumentsModal
          horse={docsFor}
          onClose={() => setDocsFor(null)}
          onChanged={async () => { await load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-ash">{label}</dt>
      <dd className="text-right font-medium text-ink">{value || '-'}</dd>
    </>
  );
}
