import { useRef, useState, useCallback } from 'react';

const MAX_FILES   = 4;
const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB
const ALLOWED     = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function fmt(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * ImageUploader
 *
 * Props:
 *  existingCount  — number of images already saved (to enforce 4-image cap)
 *  onFilesChange  — called with File[] whenever selection changes
 *  disabled       — disables the zone
 */
export function ImageUploader({ existingCount = 0, onFilesChange, disabled = false }) {
  const inputRef        = useRef(null);
  const [files, setFiles]   = useState([]);   // { file, preview, error }
  const [dragging, setDragging] = useState(false);

  const slotsLeft = MAX_FILES - existingCount - files.filter(f => !f.error).length;

  const addFiles = useCallback((raw) => {
    const incoming = Array.from(raw);
    const results = [];

    for (const file of incoming) {
      if (files.length + results.filter(r => !r.error).length >= MAX_FILES - existingCount) {
        results.push({ file, preview: null, error: `Max ${MAX_FILES} images total` });
        continue;
      }
      if (!ALLOWED.includes(file.type)) {
        results.push({ file, preview: null, error: 'Must be JPEG, PNG, or WebP' });
        continue;
      }
      if (file.size > MAX_BYTES) {
        results.push({ file, preview: null, error: `Exceeds 5 MB limit (${fmt(file.size)})` });
        continue;
      }

      const preview = URL.createObjectURL(file);
      results.push({ file, preview, error: null });
    }

    setFiles(prev => {
      const next = [...prev, ...results];
      onFilesChange?.(next.filter(f => !f.error).map(f => f.file));
      return next;
    });
  }, [files, existingCount, onFilesChange]);

  const removeFile = (idx) => {
    setFiles(prev => {
      if (prev[idx]?.preview) URL.revokeObjectURL(prev[idx].preview);
      const next = prev.filter((_, i) => i !== idx);
      onFilesChange?.(next.filter(f => !f.error).map(f => f.file));
      return next;
    });
  };

  // Drag handlers
  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload images"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? '#C9A84C' : 'rgba(28,18,9,0.18)'}`,
          borderRadius: '10px',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(201,168,76,0.06)' : 'rgba(28,18,9,0.02)',
          transition: 'border-color 0.2s, background 0.2s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C9A84C"
             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
             style={{ margin: '0 auto 8px' }}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1C1209', marginBottom: '4px' }}>
          {slotsLeft > 0 ? `Drop images here or click to browse` : `Maximum images reached`}
        </p>
        <p style={{ fontSize: '11px', color: '#9E8068' }}>
          JPEG · PNG · WebP · Max 5 MB each · Up to {MAX_FILES - existingCount} more
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        disabled={disabled}
      />

      {/* File previews */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((entry, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: entry.error ? 'rgba(139,26,26,0.06)' : 'rgba(29,61,44,0.05)',
                border: `1px solid ${entry.error ? 'rgba(139,26,26,0.20)' : 'rgba(29,61,44,0.12)'}`,
              }}
            >
              {/* Thumbnail */}
              {entry.preview ? (
                <img
                  src={entry.preview}
                  alt=""
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: '5px', flexShrink: 0,
                  background: 'rgba(139,26,26,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
              )}

              {/* Name + info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '12px', fontWeight: 600, color: entry.error ? '#8B1A1A' : '#1C1209',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {entry.file.name}
                </p>
                <p style={{ fontSize: '11px', color: entry.error ? '#C02020' : '#9E8068' }}>
                  {entry.error || fmt(entry.file.size)}
                </p>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                aria-label="Remove file"
                style={{
                  flexShrink: 0, width: 24, height: 24,
                  borderRadius: '50%', background: 'rgba(28,18,9,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: 'none',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B5040" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
