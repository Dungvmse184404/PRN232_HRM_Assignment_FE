import { useState, type FormEvent } from 'react';
import { errorMessage, racingApi, type RaceDto } from '../../lib/api';
import { Button, Card, Field, Input } from '../ui';

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
  const [refereeUserId, setRefereeUserId] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!refereeUserId.trim()) { onError('Vui lòng nhập ID trọng tài.'); return; }
    setSaving(true);
    try {
      await racingApi.assignReferee(race.id, refereeUserId.trim());
      await onSaved();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="my-8 w-full max-w-sm">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold">Phân công Trọng tài</h3>
          <p className="mt-1 text-sm text-stone">{race.name}</p>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <Field label="ID trọng tài (User ID)" hint="Nhập UUID của người dùng có vai trò RaceReferee.">
              <Input
                required
                value={refereeUserId}
                onChange={(e) => setRefereeUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saving}>Phân công</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
