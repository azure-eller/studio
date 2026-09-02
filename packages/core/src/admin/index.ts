/**
 * `@studio/core/admin` — the headless admin: an API client, the display helpers, and hooks for every screen's
 * behaviour. The screens themselves live with the site (the template's `components/admin`, built on shadcn/ui),
 * so a site owns its admin UI the way it owns its sections, and any frontend can render its own.
 */
export { ApiError, createApi, type Api } from './api'
export { readImageSize, uploadFile, type UploadedMedia } from './upload'
export { clip, exportCsv, fmtDate, formatCell, humanise, labelFor, previewOf, rowUrl, submissionOf, titleOf, type Row } from './format'
export {
  fetchAll,
  slugify,
  useAdminRouter,
  useAltText,
  useLogin,
  useMediaPicker,
  useRecord,
  useRecordForm,
  useRows,
  useSession,
  useSingletonId,
  useUnread,
  useUploads,
  type Notice,
  type PickerItem,
  type RecordFormOptions,
  type SaveResult,
} from './hooks'
export { applyLink, EditorContent, editorActions, insertFileLink, useRichTextEditor, type Editor } from './richtext'
export { mediaUrl } from '../storage/url'
export type { CollectionMeta, Field } from '../collections/types'
export { EMPTY_DOC, type RichTextDoc } from '../richtext/types'
export const isImageRow = (row: Record<string, unknown>): boolean => String(row['mime'] ?? '').startsWith('image/')
