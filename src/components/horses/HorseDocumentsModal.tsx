import { useState, type FormEvent } from 'react';
import { horsesApi, errorMessage, type HorseDocumentDto, type HorseDto } from '../../lib/api';
import { Button, Card, Field, Input } from '../ui';

export default function HorseDocumentsModal({
  horse,
  onClose,
  onChanged,
  onError,
}: {
  horse: HorseDto;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [docs, setDocs] = useState<HorseDocumentDto[]>(horse.documents);
  const [docType, setDocType] = useState('Pedigree');
  const [fileUrl, setFileUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await horsesApi.addDocument(horse.id, docType, fileUrl);
      setDocs((prev) => [...prev, created]);
      setFileUrl('');
      await onChanged();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(documentId: string) {
    try {
      await horsesApi.removeDocument(horse.id, documentId);
      setDocs((prev) => prev.filter((d) => d.id !== documentId));
      await onChanged();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="my-8 w-full max-w-lg">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold">Giấy tờ — {horse.name}</h3>
          <p className="mt-1 text-sm text-stone">Pedigree, tiêm phòng, quyền sở hữu… (FR-08)</p>

          <ul className="mt-4 flex flex-col gap-2">
            {docs.length === 0 && <li className="text-sm text-ash">Chưa có giấy tờ nào.</li>}
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-bone px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{d.docType}</div>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-flame hover:underline">{d.fileUrl}</a>
                </div>
                <button onClick={() => remove(d.id)} className="shrink-0 text-xs font-medium text-red-600 hover:underline">Xóa</button>
              </li>
            ))}
          </ul>

          <form className="mt-5 flex flex-col gap-3 border-t border-parchment/60 pt-4" onSubmit={add}>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Loại">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
                >
                  <option>Pedigree</option>
                  <option>Vaccination</option>
                  <option>Ownership</option>
                  <option>Other</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Đường dẫn file">
                  <Input required value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Đóng</Button>
              <Button type="submit" loading={busy}>Thêm giấy tờ</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
