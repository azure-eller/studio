/**
 * `@studio/core/admin` — the headless admin: an API client, the display helpers, and hooks for every screen's
 * behaviour. The screens themselves live with the site (the template's `components/admin`, built on shadcn/ui),
 * so a site owns its admin UI the way it owns its sections, and any frontend can render its own.
 */
export { ApiError, createApi, type Api } from './api'
export { readImageSize, uploadFile, type UploadedMedia } from './upload'
export {
  clip,
  detailsOf,
  exportCsv,
  fmtDate,
  formatCell,
  humanise,
  isDateProp,
  isImageRow,
  labelFor,
  previewOf,
  publishState,
  repeatLabel,
  rowUrl,
  submissionOf,
  titleOf,
  type Detail,
  type PublishState,
  type Row,
} from './format'
export { duplicateBody, formBody, saveOutcome, slugify, type SaveOutcome } from './form'
export {
  fetchAll,
  useAdminRouter,
  useAltText,
  useLogin,
  useMediaPicker,
  useOverview,
  useRecord,
  useRecordForm,
  useRows,
  useSession,
  useSingletonId,
  useUnread,
  useUploads,
  type PickerItem,
  type RecordFormOptions,
  type SaveResult,
} from './hooks'
export { applyLink, EditorContent, editorActions, insertFileLink, useRichTextEditor, type Editor } from './richtext'
export { mediaUrl } from '../storage/url'
export { REPEAT_OPTIONS, repeatToRule, ruleToRepeat, type Repeat } from '../content/events'
export type { CollectionMeta, Field } from '../collections/types'
export { EMPTY_DOC, type RichTextDoc } from '../richtext/types'
