import React, { useRef, useState } from 'react';
import { Upload, Trash2, ArrowUp, Loader2, ShieldCheck } from 'lucide-react';
import { LISTING_LIMITS } from '../../../config/adoptionListingConfig.js';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';
import { adoptionPhotoUploadService } from '../../../services/AdoptionPhotoUploadService.js';

interface StepPhotosProps {
  draft: ListingFormDraft;
  onChange: (patch: Partial<ListingFormDraft>) => void;
  error?: string | null;
}

export const StepPhotos: React.FC<StepPhotosProps> = ({
  draft,
  onChange,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLocalError(null);

    const remainingSlots = LISTING_LIMITS.MAX_PHOTOS - draft.photos.length;
    if (remainingSlots <= 0) {
      setLocalError(`Maximum ${LISTING_LIMITS.MAX_PHOTOS} photos allowed.`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    const addedUrls: string[] = [];

    try {
      for (let i = 0; i < toProcess.length; i++) {
        const file = toProcess[i];
        const uploaded = await adoptionPhotoUploadService.validateAndUploadPhoto(
          file,
          (stage) => {
            const label =
              stage === 'validating'
                ? 'Validating image signature'
                : stage === 'compressing'
                ? 'Compressing & stripping location metadata'
                : 'Uploading photo';
            setUploadStatus(`${label} (${i + 1}/${toProcess.length})...`);
          }
        );
        addedUrls.push(uploaded.url);
      }

      if (addedUrls.length > 0) {
        onChange({ photos: [...draft.photos, ...addedUrls] });
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to upload one or more photos.');
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    onChange({ photos: draft.photos.filter((_, i) => i !== index) });
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const next = [...draft.photos];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onChange({ photos: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Photos ({draft.photos.length}/{LISTING_LIMITS.MAX_PHOTOS})
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          Add 1 to 5 clear, natural-light photos. Real JPG, PNG, or WebP files under 5 MB are validated and compressed automatically.
        </p>
      </div>

      {/* Upload Dropzone */}
      {draft.photos.length < LISTING_LIMITS.MAX_PHOTOS && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#4C3B42] bg-[#161114] px-6 py-10 text-center transition-colors hover:border-[#D94F73] disabled:opacity-60"
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          {uploading ? (
            <>
              <Loader2 className="h-9 w-9 animate-spin text-[#D94F73] mb-3" />
              <p className="text-sm font-semibold text-[#F6F0EC]">{uploadStatus || 'Processing...'}</p>
            </>
          ) : (
            <>
              <Upload className="h-9 w-9 text-[#D94F73] mb-3" />
              <p className="text-sm font-semibold text-[#F6F0EC]">
                Click to select photos ({LISTING_LIMITS.MAX_PHOTOS - draft.photos.length} slots left)
              </p>
              <p className="mt-1 text-xs text-[#8D7D83]">
                EXIF/GPS location data is stripped automatically before upload.
              </p>
            </>
          )}
        </button>
      )}

      {/* Uploaded Photos Grid */}
      {draft.photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {draft.photos.map((url, idx) => (
            <div
              key={url + idx}
              className="group relative overflow-hidden rounded-2xl border border-[#382D32] bg-[#161114]"
            >
              <div className="aspect-4/3 w-full overflow-hidden">
                <img
                  src={url}
                  alt={`Pet photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                {idx === 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Cover photo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makePrimary(idx)}
                    className="inline-flex items-center gap-1 text-[#E2B75B] hover:underline"
                  >
                    <ArrowUp className="h-3.5 w-3.5" /> Set cover
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  aria-label={`Remove photo ${idx + 1}`}
                  className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(localError || error) && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
          {localError || error}
        </div>
      )}
    </div>
  );
};
