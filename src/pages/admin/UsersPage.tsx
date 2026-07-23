import { useCallback, useEffect, useState } from 'react';
import {
  ALL_ROLES,
  errorMessage,
  usersApi,
  type PagedResult,
  type RoleName,
  type UserDto,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';

const PAGE_SIZE = 10;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleName | ''>('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PagedResult<UserDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await usersApi.list({
        search: search || undefined,
        role: role || undefined,
        includeInactive,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, role, includeInactive, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Quản lý tài khoản</h1>
        <p className="mt-1 text-stone">Tìm kiếm, khóa/mở, xóa và phân quyền cho người dùng.</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm theo email / họ tên</span>
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="vd: owner1@hrm.local"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Vai trò</span>
            <select
              value={role}
              onChange={(e) => { setPage(1); setRole(e.target.value as RoleName | ''); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 py-2.5 text-sm text-stone">
            <input type="checkbox" checked={includeInactive} onChange={(e) => { setPage(1); setIncludeInactive(e.target.checked); }} className="accent-[var(--color-flame)]" />
            Gồm cả đã xóa
          </label>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
              <tr>
                <Th>Người dùng</Th>
                <Th>Vai trò</Th>
                <Th>Trạng thái</Th>
                <Th>Tạo lúc</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-stone"><Spinner /> Đang tải…</td></tr>
              )}
              {!loading && data?.items.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-stone">Không có tài khoản nào.</td></tr>
              )}
              {!loading && data?.items.map((u) => (
                <tr key={u.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{u.fullName}</div>
                    <div className="text-xs text-ash">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roleNames.length ? u.roleNames.map((r) => <Badge key={r}>{r}</Badge>) : <span className="text-ash">-</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {!u.isActive ? <Badge tone="red">Đã xóa</Badge>
                      : u.status === 'Locked' ? <Badge tone="red">Bị khóa</Badge>
                      : <Badge tone="green">Hoạt động</Badge>}
                  </td>
                  <td className="px-5 py-3 text-xs text-stone">{new Date(u.createdAtUtc).toLocaleString('vi-VN')}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {u.status === 'Locked'
                        ? <Button variant="neutral" onClick={() => act(() => usersApi.unlock(u.id))}>Mở khóa</Button>
                        : <Button variant="neutral" onClick={() => act(() => usersApi.lock(u.id))}>Khóa</Button>}
                      <Button variant="neutral" onClick={() => setEditing(u)}>Vai trò</Button>
                      {u.isActive && (
                        <Button
                          variant="danger"
                          onClick={() => { if (confirm(`Xóa tài khoản ${u.email}?`)) void act(() => usersApi.remove(u.id)); }}
                        >Xóa</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-parchment/60 px-5 py-3 text-sm text-stone">
            <span>Tổng {data.totalCount} tài khoản · Trang {data.pageNumber}/{data.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <RolesModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}

function RolesModal({
  user,
  onClose,
  onSaved,
  onError,
}: {
  user: UserDto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [roles, setRoles] = useState<RoleName[]>(user.roleNames as RoleName[]);
  const [saving, setSaving] = useState(false);

  function toggle(r: RoleName) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function save() {
    if (roles.length === 0) { onError('Phải chọn ít nhất một vai trò.'); return; }
    setSaving(true);
    try {
      await usersApi.assignRoles(user.id, roles);
      await onSaved();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" >
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold">Phân quyền</h3>
          <p className="mt-1 text-sm text-stone">{user.fullName} · {user.email}</p>
          <div className="mt-4 flex flex-col gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2.5 rounded-[var(--radius-input)] border border-bone px-3 py-2 text-sm">
                <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} className="accent-[var(--color-flame)]" />
                {r}
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="neutral" onClick={onClose}>Hủy</Button>
            <Button loading={saving} onClick={save}>Lưu</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
