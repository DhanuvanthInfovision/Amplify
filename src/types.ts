export type FamilyId = 'atlas' | 'forge' | 'relay' | 'sentinel' | 'nexus'

export type Maturity = 'Experimental' | 'Demo-ready' | 'Validated' | 'Battle-tested'

export type PipelineStatus =
  | 'Submitted'
  | 'AI Review'
  | 'Needs Changes'
  | 'Manual Approval'
  | 'Approved'
  | 'Published'

export type PlatformFamily = {
  id: FamilyId
  name: string
  tagline: string
  description: string
  color: string
  whenToSell: string[]
  dependsOn: string[]
  enables: string[]
  solutions: {
    name: string
    description: string
  }[]
}

export type Asset = {
  id: string
  name: string
  familyId: FamilyId
  category: string
  solution: string
  description: string
  about: string
  owner: string
  ownerInitials: string
  maturity: Maturity
  effort: 'Low' | 'Medium' | 'High'
  clouds: string[]
  tags: string[]
  demoUrl?: string
  repoUrl?: string
  users: number
  deployments: number
  pipelines: number
  score: number
  architecture: string[]
  quickStart: string[]
  prerequisites: string[]
  dependencies: string[]
  changelog: {
    version: string
    date: string
    note: string
  }[]
}

export type PipelineItem = {
  id: string
  assetName: string
  familyId: FamilyId
  category: string
  solution: string
  author: string
  authorInitials: string
  status: PipelineStatus
  score: number
  description: string
  ownerEmail?: string
  repoUrl?: string
  demoUrl?: string
  clouds: string[]
  maturity: Maturity
  attachments: {
    label: string
    url: string
    type: 'Prompt' | 'Project' | 'Image' | 'Video' | 'Document' | 'Other'
  }[]
  submittedAt: string
  approvedAt?: string
  publishedAt?: string
}

export type ActivityItem = {
  id: string
  person: string
  action: string
  target: string
  familyId?: FamilyId
  time: string
}
