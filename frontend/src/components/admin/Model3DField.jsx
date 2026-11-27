import { useId, useMemo, useState } from 'react';
import { Box } from 'lucide-react';
import { Button, Field, Select } from './ui';
import { MODEL_LABELS, MODEL_TYPES, detectModelType, resolveModel } from '../product3d/modelSpec';
import { Product3DNote, Product3DView } from '../product3d/Product3DView';

/**
 * "360° 3D view" setting for a product, with an on-demand live preview.
 *
 * value       'auto' | bracelet | mala | gemstone | crystal | raw | none
 * draft       the product as currently typed: { name, slug, category, model_colors }
 */
export function Model3DField({ value, onChange, draft, hasPhoto, disabled = false }) {
  const id = useId();
  const [showPreview, setShowPreview] = useState(false);
  const detected = detectModelType(draft);
  const spec = useMemo(
    () => resolveModel({ ...draft, model_type: value }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, draft?.name, draft?.slug, draft?.category?.name, JSON.stringify(draft?.model_colors || null)],
  );

  const colourHint =
    spec.type === 'none'
      ? null
      : spec.look?.kind === 'preset' || spec.look?.kind === 'gem'
        ? 'Colour comes from the stone named in the product name.'
        : hasPhoto
          ? 'Colour comes from the main product photo.'
          : 'Colour will come from the main product photo once you add one.';

  return (
    <div className="space-y-4">
      <Field
        label="3D shape"
        htmlFor={id}
        hint={
          value === 'auto'
            ? detected === 'none'
              ? 'No shape matches this product name, so there is no 3D view. Pick a shape to switch it on.'
              : `Automatic picks “${MODEL_LABELS[detected]}” from the name.`
            : 'You picked this shape; it overrides the automatic choice.'
        }
      >
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="max-w-sm" disabled={disabled}>
          {MODEL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'auto' && detected !== 'none' ? `Automatic (${MODEL_LABELS[detected]})` : MODEL_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      {spec.type !== 'none' && (
        <div className="space-y-2">
          {colourHint && <p className="text-xs text-espresso/70">{colourHint}</p>}
          {showPreview ? (
            <>
              <div className="aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-espresso/10">
                <Product3DView spec={spec} label={draft?.name || 'this product'} />
              </div>
              <Product3DNote className="max-w-sm" />
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                Hide preview
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(true)}>
              <Box className="h-4 w-4" aria-hidden="true" />
              Show 3D preview
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
