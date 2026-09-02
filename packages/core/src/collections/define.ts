import type { PgTable } from 'drizzle-orm/pg-core'
import { deriveFields, deriveSchemas } from './derive'
import type { Collection, CollectionConfig, CollectionMeta, Collections } from './types'

/** Builds a collection; the name is assigned by `defineCollections` from the map key. */
export function defineCollection<T extends PgTable>(config: CollectionConfig<T>): Collection<T> {
  const fields = deriveFields(config.table, config.fields ?? {})
  const { insertSchema, updateSchema } = deriveSchemas(config.table, fields, config.schema)
  const revalidate = typeof config.revalidate === 'function' ? config.revalidate : () => config.revalidate as string[]
  const status = fields['status']
  const publishable = status?.type === 'select' && ['draft', 'published'].every((v) => status.options?.some((o) => o.value === v))
  const titleField = config.titleField ?? (fields['title'] ? 'title' : null)
  const dateField = config.dateField ?? ['publishedAt', 'startsAt'].find((k) => k in fields) ?? 'createdAt'
  for (const k of [titleField, dateField]) if (k && k !== 'createdAt' && !fields[k]) throw new Error(`Unknown field "${k}" on ${config.label}`)
  return {
    name: '',
    table: config.table,
    label: config.label,
    labelSingular: config.labelSingular ?? config.label.replace(/s$/, ''),
    fields,
    list: config.list,
    readOnly: config.readOnly ?? false,
    view: config.view ?? 'table',
    publicPath: config.publicPath ?? null,
    titleField,
    dateField,
    inbox: 'readAt' in fields,
    publishable,
    revalidate,
    insertSchema,
    updateSchema,
  }
}

export function defineCollections(map: Record<string, Collection>): Collections {
  const byName: Record<string, Collection> = {}
  const meta: CollectionMeta[] = []
  for (const [name, c] of Object.entries(map)) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) throw new Error(`Invalid collection name "${name}"`)
    for (const col of [...c.list.columns, c.list.sort[0], ...(c.list.search ?? [])]) {
      if (col !== 'id' && col !== 'createdAt' && col !== 'updatedAt' && !c.fields[col])
        throw new Error(`Collection "${name}" lists unknown column "${col}"`)
    }
    const named = { ...c, name }
    byName[name] = named
    meta.push({
      name,
      label: c.label,
      labelSingular: c.labelSingular,
      fields: c.fields,
      list: c.list,
      readOnly: c.readOnly,
      view: c.view,
      publicPath: c.publicPath,
      titleField: c.titleField,
      dateField: c.dateField,
      inbox: c.inbox,
      publishable: c.publishable,
    })
  }
  return { byName, meta }
}
