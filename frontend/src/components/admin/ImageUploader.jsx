import { useEffect, useRef, useState } from 'react';
import { fileExt, formatBytes } from './adminUtils';

const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

function isAllowedImage(file) {
  if (file.type) return ALLOWED_TYPES.includes(file.type);
  return ALLOWED_EXTS.includes(fileExt(file.name)); // some browsers leave type empty
}

let entrySeq = 0;

/**
 * ImageUploader — picks up to (4 − existingCount) images and reports the valid ones.
 *
 * Props:
 *  existingCount — images already saved for the product (enforces the 4-image cap)
 *  onFilesChange — called with File[] (valid files only) whenever the selection changes
 *  disabled      — disables the zone
 *
 * The component owns its selection. To clear it (e.g. after a successful upload),
 * remount it by changing its `key`; object URLs are revoked on remove and on unmount.
 */
export function ImageUploader({ existingCount = 0, onFilesChange, disabled = false }) {
  const inputRef = useRef(null);
  const [entries, setEntries] = useState([]); // { id, file, preview, error }
  const [dragging, setDragging] = useState(false);

  // Revoke any remaining previews when the uploader unmounts
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  useEffect(
    () => () => {
      entriesRef.current.forEach((e) => e.preview && URL.revokeObjectURL(e.preview));
    },
    [],
  );

  const validCount = entries.filter((e) => !e.error).length;
  const slotsLeft = Math.max(0, MAX_FILES - existingCount - validCount);
  const zoneDisabled = disabled || slotsLeft <= 0;

  const commit = (next) => {
    setEntries(next);
    onFilesChange?.(next.filter((e) => !e.error).map((e) => e.file));
  };

  const addFiles = (raw) => {
    const incoming = Array.from(raw ?? []);
    if (!incoming.length) return;
    let accepted = 0;
    const added = incoming.map((file) => {
      entrySeq += 1;
      const base = { id: entrySeq, file, preview: null };
      if (!isAllowedImage(file)) return { ...base, error: 'Must be JPEG, PNG or WebP' };
      if (file.size > MAX_BYTES) return { ...base, error: `Exceeds 5 MB limit (${formatBytes(file.size)})` };
      // Only accepted files take a slot — rejected ones never count toward the cap
      if (accepted >= slotsLeft) return { ...base, error: `Max ${MAX_FILES} images per product` };
      accepted += 1;
      return { ...base, preview: URL.createObjectURL(file), error: null };
    });
    commit([...entries, ...added]);
  };

  const removeEntry = (id) => {
    const target = entries.find((e) => e.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    commit(entries.filter((e) => e.id !== id));
  };

  const openPicker = () => {
    if (!zoneDisabled) inputRef.current?.click();
  };

  const onDragOver = (e) => {
    e.preventDefault();
    if (!zoneDisabled) setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!zoneDisabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={zoneDisabled ? -1 : 0}
        aria-disabled={zoneDisabled}
        aria-label="Add product images"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          dragging ? 'border-gold bg-gold/6' : 'border-espresso/15 bg-espresso/[0.02]'
        } ${zoneDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gold'}`}
      >
        <svg
          width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C9A84C"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="mx-auto mb-2" aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-[13px] font-semibold text-espresso mb-1">
          {slotsLeft > 0 ? 'Drop images here or click to browse' : 'Maximum images reached'}
        </p>
        <p className="text-[11px] text-gray-500">
          JPEG · PNG · WebP · Max 5 MB each · {slotsLeft > 0 ? `Up to ${slotsLeft} more` : 'Remove one to add another'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
        disabled={zoneDisabled}
      />

      {/* Selected files */}
      {entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
                entry.error ? 'border-red-200 bg-red-50' : 'border-primary/12 bg-primary/[0.05]'
              }`}
            >
              {entry.preview ? (
                <img src={entry.preview} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-red-100 flex items-center justify-center" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`truncate text-xs font-semibold ${entry.error ? 'text-red-800' : 'text-espresso'}`}>
                  {entry.file.name}
                </p>
                <p className={`text-[11px] ${entry.error ? 'text-red-600' : 'text-gray-500'}`}>
                  {entry.error || formatBytes(entry.file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                aria-label={`Remove ${entry.file.name}`}
                disabled={disabled}
                className="h-6 w-6 shrink-0 rounded-full bg-espresso/8 flex items-center justify-center hover:bg-espresso/15 disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B5040" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
