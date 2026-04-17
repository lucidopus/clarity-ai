/**
 * Ambient sound for focus mode.
 *
 * ~20min white-noise clip, native-looped by the `<audio loop>` attribute so
 * the end stitches seamlessly to the start.
 *
 * Prefer `NEXT_PUBLIC_AMBIENT_SOUND_URL` at runtime so a signed-URL rotation
 * (or bucket-visibility change) can be handled without a code deploy. The
 * inlined signed URL below is a fallback only — it is signed with a 1-year
 * expiry, after which the env var is required.
 */

const FALLBACK_AMBIENT_SOUND_URL =
  'https://ddjefcxwptnmgyztepdi.supabase.co/storage/v1/object/sign/media/white-noise.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV83YjI1ODUzZC1iOTNmLTQ0MGUtYjhkMi1kOTRiNzgxY2FhZWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS93aGl0ZS1ub2lzZS5tcDMiLCJpYXQiOjE3NzY0Njc3NzYsImV4cCI6MTgwODAwMzc3Nn0.jSra87wKb6zTIttm_saBSaQ_mF1vSh0-9J7M-RabM0c';

export const AMBIENT_SOUND_URL =
  process.env.NEXT_PUBLIC_AMBIENT_SOUND_URL ?? FALLBACK_AMBIENT_SOUND_URL;
