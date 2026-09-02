import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import { getTableName } from 'drizzle-orm'
import { deriveFields, deriveSchemas } from './derive'
import type { Collection, CollectionConfig, CollectionMap, CollectionMeta, Collections } from './types'

/** Builds a collection; the name is assigned by `defineCollections` from the map key. */
export function defineCollection<T extends PgTable>(config: CollectionConfig<T>): Collection<T> {
  const fields = deriveFields(config.table, config.fields ?? {})
  const { insertSchema, updateSchema } = deriveSchemas(config.table, fields, config.schema)
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
    slugged: fields['slug']?.type === 'slug',
    singleton: config.singleton ?? false,
    dependents: [],
    reads: config.reads ?? {},
    insertSchema,
    updateSchema,
  }
}

/** Names the collections and links them: a table another collection references gets it as a dependent. */
export function defineCollections<M extends CollectionMap>(map: M): Collections<M> {
  const byName = {} as M
  const meta: CollectionMeta[] = []
  const byTable = new Map<string, string>()
  for (const [name, c] of Object.entries(map)) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) throw new Error(`Invalid collection name "${name}"`)
    for (const col of [...c.list.columns, c.list.sort[0], ...(c.list.search ?? [])]) {
      if (col !== 'id' && col !== 'createdAt' && col !== 'updatedAt' && !c.fields[col]) throw new Error(`Collection "${name}" lists unknown column "${col}"`)
    }
    byTable.set(getTableName(c.table), name)
  }
  for (const [name, c] of Object.entries(map)) {
    const dependents = Object.entries(map)
      .filter(([other, oc]) => other !== name && getTableConfig(oc.table).foreignKeys.some((fk) => getTableName(fk.reference().foreignTable) === getTableName(c.table)))
      .map(([other]) => other)
    const named = { ...c, name, dependents } as M[keyof M]
    ;(byName as CollectionMap)[name] = named
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
      singleton: c.singleton,
    })
  }
  return { byName, meta }
}

/** Cache tags a row belongs to: its collection, its slug, and every collection that embeds rows from this one. */
export function tagsFor(c: Collection, row: Record<string, unknown> | null = null): string[] {
  const tags = [c.name]
  if (c.slugged && row && typeof row['slug'] === 'string') tags.push(`${c.name}:${row['slug']}`)
  return [...tags, ...c.dependents]
}
