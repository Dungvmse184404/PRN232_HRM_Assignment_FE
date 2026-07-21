import { useState } from 'react';
import { errorMessage, racingApi } from '../../lib/api';
import { Button, Card } from '../ui';

export default function ConfirmResultModal({
  resultId,
  onClose,
  onSaved,
  onError,
}: {
  resultId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    try {
      await racingApi.confirmResult(resultId);
      await onSaved();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold">Xác nhận kết quả</h3>
          <p className="mt-1 text-sm text-stone">Bạn có chắc muốn xác nhận kết quả cho đăng ký này?</p>

          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ash">Mã kết quả</dt>
              <dd className="font-mono text-xs text-stone">{resultId.slice(0, 8)}…</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-ash">
            Sau khi xác nhận, kết quả sẽ chuyển sang trạng thái "RefereeConfirmed". Hành động này không thể hoàn tác.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="neutral" onClick={onClose}>Hủy</Button>
            <Button loading={saving} onClick={confirm}>Xác nhận</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
