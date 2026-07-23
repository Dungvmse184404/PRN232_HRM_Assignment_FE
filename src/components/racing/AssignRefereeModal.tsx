import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage, racingApi, usersApi, type RaceDto, type UserDto } from '../../lib/api';
import { Button, Card, Field, Input, Spinner } from '../ui';

const SEARCH_DEBOUNCE_MS = 300;

export default function AssignRefereeModal({
  race,
  onClose,
  onSaved,
  onError,
}: {
  race: RaceDto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Tìm trọng tài gần đúng theo tên / email / SĐT (bộ lọc role RaceReferee = bitmask 16 do BE xử lý).
  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await usersApi.list({ search: q, role: 'RaceReferee', pageSize: 8 });
        if (!cancelled) setResults(res.items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, selected]);

  function pick(u: UserDto) {
    setSelected(u);
    setResults([]);
  }

  function clearSelection() {
    setSelected(null);
    setQuery('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) {
      onError('Vui lòng chọn một trọng tài từ danh sách tìm kiếm.');
      return;
    }
    setSaving(true);
    try {
      await racingApi.assignReferee(race.id, selected.id);
      await onSaved();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const showDropdown = !selected && query.trim().length > 0;

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="my-8 w-full max-w-sm">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold">Phân công Trọng tài</h3>
          <p className="mt-1 text-sm text-stone">{race.name}</p>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <Field label="Tìm trọng tài" hint="Theo tên, email hoặc số điện thoại (chỉ tài khoản có vai trò Trọng tài).">
              {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-flame/60 bg-flame/5 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{selected.fullName}</div>
                    <div className="truncate text-xs text-stone">
                      {selected.email}{selected.phone ? ` · ${selected.phone}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="shrink-0 text-xs font-medium text-flame hover:underline"
                  >
                    Đổi
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="VD: Nguyễn Văn A, a@gmail.com hoặc 09xxxxxxxx"
                  />
                  {showDropdown && (
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-input)] border border-bone bg-paper shadow-[var(--shadow-soft)]">
                      {searching && (
                        <div className="flex items-center gap-2 px-4 py-3 text-xs text-stone">
                          <Spinner /> Đang tìm…
                        </div>
                      )}
                      {!searching && results.length === 0 && (
                        <div className="px-4 py-3 text-xs text-stone">Không tìm thấy trọng tài phù hợp.</div>
                      )}
                      {!searching && results.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => pick(u)}
                          className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-cream/60"
                        >
                          <div className="font-medium text-ink">{u.fullName}</div>
                          <div className="text-xs text-stone">
                            {u.email}{u.phone ? ` · ${u.phone}` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saving} disabled={!selected}>Phân công</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
