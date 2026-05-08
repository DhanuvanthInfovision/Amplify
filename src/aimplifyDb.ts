import { assets as seedAssets, getFamily, pipelineItems as seedPipelineItems } from './data'
import { supabase } from './supabase'
import type { Asset, FamilyId, Maturity, PipelineItem, PipelineStatus } from './types'

type AssetRow = {
  id: string
  name: string
  family_id: FamilyId
  category: string
  solution: string
  description: string
  about: string
  owner: string
  owner_initials: string
  maturity: Maturity
  effort: Asset['effort']
  clouds: string[] | null
  tags: string[] | null
  demo_url: string | null
  repo_url: string | null
  users_count: number | null
  deployments_count: number | null
  pipelines_count: number | null
  score: number | null
  architecture: string[] | null
  quick_start: string[] | null
  prerequisites: string[] | null
  dependencies: string[] | null
  asset_changelog?: {
    version: string
    changed_on: string
    note: string
  }[]
}

type SubmissionRow = {
  id: string
  asset_name: string
  family_id: FamilyId
  category?: string | null
  solution?: string | null
  author: string
  author_initials: string
  status: PipelineStatus
  score: number | null
  description: string
  owner_email?: string | null
  repo_url?: string | null
  demo_url?: string | null
  clouds?: string[] | null
  maturity?: Maturity | null
  attachments?: PipelineItem['attachments'] | null
  submitted_at: string
  approved_at?: string | null
  published_at?: string | null
}

export async function loadAssets(): Promise<Asset[]> {
  if (!supabase) return seedAssets

  const { data, error } = await supabase
    .from('assets')
    .select('*, asset_changelog(version, changed_on, note)')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Unable to load assets from Supabase:', error.message)
    return seedAssets
  }

  const dbAssets = (data ?? []).map((row) => rowToAsset(row as AssetRow))
  return mergeById(seedAssets, dbAssets)
}

export async function loadPipelineItems(): Promise<PipelineItem[]> {
  if (!supabase) return seedPipelineItems

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) {
    console.warn('Unable to load submissions from Supabase:', error.message)
    return seedPipelineItems
  }

  const dbItems = (data ?? []).map((row) => rowToPipelineItem(row as SubmissionRow))
  return mergeById(seedPipelineItems, dbItems)
}

function mergeById<T extends { id: string }>(seed: T[], remote: T[]): T[] {
  const remoteIds = new Set(remote.map((item) => item.id))
  const seedExtras = seed.filter((item) => !remoteIds.has(item.id))
  return [...remote, ...seedExtras]
}

export async function createSubmission(item: PipelineItem): Promise<PipelineItem> {
  if (!supabase) return item

  const fullPayload = pipelineItemToSubmissionInsert(item)
  const { data, error } = await supabase
    .from('submissions')
    .insert(fullPayload)
    .select()
    .single()

  if (!error && data) return rowToPipelineItem(data as SubmissionRow)

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('submissions')
    .insert({
      asset_name: item.assetName,
      family_id: item.familyId,
      author: item.author,
      author_initials: item.authorInitials,
      status: item.status,
      score: item.score,
      description: item.description,
      submitted_at: item.submittedAt,
    })
    .select()
    .single()

  if (fallbackError) throw fallbackError
  return rowToPipelineItem(fallbackData as SubmissionRow)
}

export async function savePipelineStatus(id: string, status: PipelineStatus): Promise<void> {
  if (!supabase) return

  const payload: Partial<SubmissionRow> = {
    status,
    approved_at: status === 'Approved' ? today() : undefined,
    published_at: status === 'Published' ? today() : undefined,
  }

  const { error } = await supabase.from('submissions').update(payload).eq('id', id)
  if (error) {
    const { error: fallbackError } = await supabase.from('submissions').update({ status }).eq('id', id)
    if (fallbackError) throw fallbackError
  }
}

export async function createPublishedAsset(item: PipelineItem, existingAssets: Asset[]): Promise<Asset> {
  const family = getFamily(item.familyId)
  const id = makePublishedAssetId(item, existingAssets)
  const asset: Asset = {
    id,
    name: item.assetName,
    familyId: item.familyId,
    category: item.category,
    solution: item.solution,
    description: item.description,
    about: item.description,
    owner: item.author,
    ownerInitials: item.authorInitials,
    maturity: item.maturity,
    effort: 'Medium',
    clouds: item.clouds,
    tags: [item.category, family.name],
    demoUrl: item.demoUrl,
    repoUrl: item.repoUrl,
    users: 0,
    deployments: 0,
    pipelines: 1,
    score: item.score,
    architecture: ['Submission Intake', 'AI Review', 'Manual Approval', 'Published Catalog'],
    quickStart: ['Review metadata', 'Request repo access', 'Follow accelerator README'],
    prerequisites: item.clouds.map((cloud) => `${cloud} environment`),
    dependencies: ['Manual approval completed'],
    changelog: [{ version: 'v0.1.0', date: today(), note: 'Published from contribution pipeline' }],
  }

  if (!supabase) return asset

  const { error } = await supabase.from('assets').insert(assetToRow(asset))
  if (error && !error.message.toLowerCase().includes('duplicate')) throw error

  const { error: changelogError } = await supabase.from('asset_changelog').insert({
    asset_id: asset.id,
    version: 'v0.1.0',
    changed_on: today(),
    note: 'Published from contribution pipeline',
  })
  if (changelogError) console.warn('Unable to insert asset changelog:', changelogError.message)

  return asset
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    familyId: row.family_id,
    category: row.category,
    solution: row.solution,
    description: row.description,
    about: row.about,
    owner: row.owner,
    ownerInitials: row.owner_initials,
    maturity: row.maturity,
    effort: row.effort,
    clouds: row.clouds ?? [],
    tags: row.tags ?? [],
    demoUrl: row.demo_url ?? undefined,
    repoUrl: row.repo_url ?? undefined,
    users: row.users_count ?? 0,
    deployments: row.deployments_count ?? 0,
    pipelines: row.pipelines_count ?? 0,
    score: row.score ?? 0,
    architecture: row.architecture ?? [],
    quickStart: row.quick_start ?? [],
    prerequisites: row.prerequisites ?? [],
    dependencies: row.dependencies ?? [],
    changelog: (row.asset_changelog ?? []).map((entry) => ({
      version: entry.version,
      date: entry.changed_on,
      note: entry.note,
    })),
  }
}

function rowToPipelineItem(row: SubmissionRow): PipelineItem {
  return {
    id: row.id,
    assetName: row.asset_name,
    familyId: row.family_id,
    category: row.category ?? 'Process Automation',
    solution: row.solution ?? getFamily(row.family_id).solutions[0]?.name ?? 'General Accelerator',
    author: row.author,
    authorInitials: row.author_initials,
    status: row.status,
    score: row.score ?? 0,
    description: row.description,
    ownerEmail: row.owner_email ?? undefined,
    repoUrl: row.repo_url ?? undefined,
    demoUrl: row.demo_url ?? undefined,
    clouds: row.clouds ?? ['AWS'],
    maturity: row.maturity ?? 'Demo-ready',
    attachments: row.attachments ?? [],
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
  }
}

function pipelineItemToSubmissionInsert(item: PipelineItem) {
  return {
    asset_name: item.assetName,
    family_id: item.familyId,
    category: item.category,
    solution: item.solution,
    author: item.author,
    author_initials: item.authorInitials,
    status: item.status,
    score: item.score,
    description: item.description,
    owner_email: item.ownerEmail,
    repo_url: item.repoUrl,
    demo_url: item.demoUrl,
    clouds: item.clouds,
    maturity: item.maturity,
    attachments: item.attachments,
    submitted_at: item.submittedAt,
  }
}

function assetToRow(asset: Asset) {
  return {
    id: asset.id,
    name: asset.name,
    family_id: asset.familyId,
    category: asset.category,
    solution: asset.solution,
    description: asset.description,
    about: asset.about,
    owner: asset.owner,
    owner_initials: asset.ownerInitials,
    maturity: asset.maturity,
    effort: asset.effort,
    clouds: asset.clouds,
    tags: asset.tags,
    demo_url: asset.demoUrl,
    repo_url: asset.repoUrl,
    users_count: asset.users,
    deployments_count: asset.deployments,
    pipelines_count: asset.pipelines,
    score: asset.score,
    architecture: asset.architecture,
    quick_start: asset.quickStart,
    prerequisites: asset.prerequisites,
    dependencies: asset.dependencies,
  }
}

function makePublishedAssetId(item: PipelineItem, existingAssets: Asset[]) {
  const basePrefix = item.familyId.slice(0, 3).toUpperCase()
  let index = existingAssets.filter((asset) => asset.familyId === item.familyId).length + 1
  let id = `${basePrefix}-${String(index).padStart(3, '0')}`
  while (existingAssets.some((asset) => asset.id.toLowerCase() === id.toLowerCase())) {
    index += 1
    id = `${basePrefix}-${String(index).padStart(3, '0')}`
  }
  return id.toLowerCase()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
