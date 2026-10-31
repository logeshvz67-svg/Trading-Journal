import { useEffect, useState } from 'react';
import { compressImage } from '../lib/image';
import { SCREENSHOT_BUCKET, signedScreenshotUrl } from '../lib/supabase';
import { useStore } from '../store';
import { errMsg } from './ui';

/** Compresses in the browser (< 500 KB) and uploads straight to private Supabase Storage. */
export function ScreenshotInput({ value, onChange }: { value: string | null; onChange: (path: string | null) => void }) {
  const { sb, session } = useStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (value) signedScreenshotUrl(value).then((u) => alive && setPreview(u));
    else setPreview(null);
    return () => {
      alive = false;
    };
  }, [value]);

  async function pick(file: File | undefined) {
    if (!file || !session) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compressImage(file);
      const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from(SCREENSHOT_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      onChange(path);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {preview && (
        <a href={preview} target="_blank" rel="noreferrer">
          <img src={preview} alt="Trade screenshot" className="max-h-64 w-full rounded-xl border border-border object-contain" />
        </a>
      )}
      <div className="flex gap-2">
        <label className="btn-ghost cursor-pointer text-sm">
          {busy ? 'Compressing & uploading...' : value ? 'Replace screenshot' : '📷 Add chart screenshot'}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {value && (
          <button type="button" className="btn-ghost text-sm" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
