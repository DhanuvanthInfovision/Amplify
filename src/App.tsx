import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileCheck2,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  LibraryBig,
  List,
  LogOut,
  Moon,
  PackagePlus,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  createPublishedAsset,
  createSubmission,
  loadAssets,
  loadPipelineItems,
  savePipelineStatus,
} from './aimplifyDb'
import {
  activities,
  assets as seedAssets,
  demoUsers,
  families,
  getFamily,
  pipelineItems as initialPipelineItems,
} from './data'
import type { Asset, FamilyId, Maturity, PipelineItem, PipelineStatus } from './types'

type ViewMode = 'grid' | 'list'
type AssetTab = 'overview' | 'architecture' | 'quickStart'
type Theme = 'light' | 'dark'

const statusOptions: Array<PipelineStatus | 'All'> = [
  'All',
  'Submitted',
  'AI Review',
  'Needs Changes',
  'Manual Approval',
  'Approved',
  'Published',
]

const maturityOptions: Array<Maturity | 'All'> = [
  'All',
  'Experimental',
  'Demo-ready',
  'Validated',
  'Battle-tested',
]

const cloudOptions = ['All', 'AWS', 'GCP', 'Azure', 'Cloud agnostic']
const submitCloudOptions = ['AWS', 'Azure', 'GCP', 'Cloud agnostic', 'Oracle Cloud', 'IBM Cloud', 'On-prem']
const categoryOptions = [
  'AI Context',
  'AI SDLC',
  'DataOps',
  'Master Data',
  'Process Automation',
  'Prompt Engineering',
  'Quality Engineering',
  'Security',
  'Infrastructure',
  'Managed AI Ops',
]

function App() {
  const [user, setUser] = useState(() => localStorage.getItem('aimplify:user') ?? '')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('aimplify:theme') as Theme) || 'light')
  const [assetList, setAssetList] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('aimplify:assets')
    if (!saved) return seedAssets
    try {
      return JSON.parse(saved) as Asset[]
    } catch {
      return seedAssets
    }
  })
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>(() => {
    const saved = localStorage.getItem('aimplify:pipeline')
    if (!saved) return initialPipelineItems
    try {
      return (JSON.parse(saved) as PipelineItem[]).map(normalizePipelineItem)
    } catch {
      return initialPipelineItems
    }
  })
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('aimplify:theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false

    async function hydrateFromSupabase() {
      try {
        const [assetsFromDb, pipelineFromDb] = await Promise.all([loadAssets(), loadPipelineItems()])
        if (cancelled) return
        setAssetList(assetsFromDb)
        setPipelineItems(pipelineFromDb.map(normalizePipelineItem))
        setDataError('')
      } catch (error) {
        if (cancelled) return
        setDataError(error instanceof Error ? error.message : 'Unable to load Supabase data.')
      }
    }

    void hydrateFromSupabase()

    return () => {
      cancelled = true
    }
  }, [])

  function persistPipeline(next: PipelineItem[]) {
    localStorage.setItem('aimplify:pipeline', JSON.stringify(next))
    setPipelineItems(next)
  }

  function persistAssets(next: Asset[]) {
    localStorage.setItem('aimplify:assets', JSON.stringify(next))
    setAssetList(next)
  }

  function login(email: string, password: string) {
    const found = demoUsers.find(
      (candidate) =>
        candidate.email.toLowerCase() === email.toLowerCase() &&
        candidate.password === password,
    )
    if (!found) return false
    localStorage.setItem('aimplify:user', found.name)
    setUser(found.name)
    return true
  }

  function logout() {
    localStorage.removeItem('aimplify:user')
    setUser('')
  }

  async function addSubmission(item: PipelineItem) {
    try {
      const saved = await createSubmission(item)
      persistPipeline([normalizePipelineItem(saved), ...pipelineItems])
      setDataError('')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to save submission.')
      persistPipeline([item, ...pipelineItems])
    }
  }

  async function updatePipelineStatus(id: string, status: PipelineStatus) {
    const next = pipelineItems.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              approvedAt: status === 'Approved' ? new Date().toISOString().slice(0, 10) : item.approvedAt,
              publishedAt: status === 'Published' ? new Date().toISOString().slice(0, 10) : item.publishedAt,
            }
          : item,
    )
    persistPipeline(next)
    try {
      await savePipelineStatus(id, status)
      setDataError('')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to update pipeline status.')
    }
  }

  async function publishSubmission(item: PipelineItem) {
    try {
      if (!assetList.some((asset) => asset.name === item.assetName && asset.owner === item.author)) {
        const publishedAsset = await createPublishedAsset(item, assetList)
        persistAssets([publishedAsset, ...assetList])
      }
      await updatePipelineStatus(item.id, 'Published')
      setDataError('')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unable to publish asset.')
      await updatePipelineStatus(item.id, 'Published')
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={login} assets={assetList} />} />
      <Route
        path="/*"
        element={
          user ? (
            <Shell
              assets={assetList}
              pipelineItems={pipelineItems}
              theme={theme}
              user={user}
              onLogout={logout}
              onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            >
              {dataError && <div className="data-banner">Supabase notice: {dataError}</div>}
              <Routes>
                <Route path="/" element={<Dashboard assets={assetList} pipelineItems={pipelineItems} />} />
                <Route path="/catalog" element={<Catalog assets={assetList} />} />
                <Route path="/catalog/:familyId" element={<FamilyPage assets={assetList} />} />
                <Route path="/assets/:assetId" element={<AssetPage assets={assetList} />} />
                <Route path="/submit" element={<SubmitPage onSubmitAsset={addSubmission} />} />
                <Route
                  path="/pipeline"
                  element={
                    <PipelinePage
                      items={pipelineItems}
                      onPublish={publishSubmission}
                      onStatusChange={updatePipelineStatus}
                    />
                  }
                />
              </Routes>
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}

function normalizePipelineItem(item: PipelineItem): PipelineItem {
  const legacyStatus = item.status as PipelineStatus | 'Governance'
  return {
    ...item,
    category: item.category ?? 'Process Automation',
    solution: item.solution ?? getFamily(item.familyId).solutions[0]?.name ?? 'General Accelerator',
    status: legacyStatus === 'Governance' ? 'Manual Approval' : item.status,
    clouds: item.clouds ?? ['AWS'],
    maturity: item.maturity ?? 'Demo-ready',
    attachments: item.attachments ?? [],
  }
}

function Shell({
  assets,
  pipelineItems,
  user,
  theme,
  onLogout,
  onToggleTheme,
  children,
}: {
  assets: Asset[]
  pipelineItems: PipelineItem[]
  user: string
  theme: Theme
  onLogout: () => void
  onToggleTheme: () => void
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="AIMPLIFY dashboard">
          <span className="brand-mark">AI</span>
          <span>
            <strong>AIMPLIFY</strong>
            <small>Accelerator OS</small>
          </span>
        </Link>
        <nav className="nav">
          <Link to="/"><LayoutDashboard size={16} /> Home</Link>
          <Link to="/catalog"><LibraryBig size={16} /> Catalog</Link>
          <Link to="/pipeline"><ClipboardCheck size={16} /> Pipeline</Link>
          <Link to="/submit"><PackagePlus size={16} /> Submit</Link>
        </nav>
        <div className="topbar-actions">
          <GlobalSearch assets={assets} pipelineItems={pipelineItems} />
          <button className="icon-button" onClick={onToggleTheme} title="Toggle theme" type="button">
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <span className="avatar">{user.slice(0, 2).toUpperCase()}</span>
          <button className="icon-button" onClick={onLogout} title="Sign out" type="button">
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

function GlobalSearch({ assets, pipelineItems }: { assets: Asset[]; pipelineItems: PipelineItem[] }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const normalizedQuery = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!normalizedQuery) return []
    const pages = [
      { title: 'Home', meta: 'Dashboard and adoption metrics', href: '/' },
      { title: 'Catalog', meta: 'All accelerator assets, families, categories, and solutions', href: `/catalog?query=${encodeURIComponent(query)}` },
      { title: 'Contribution Pipeline', meta: 'AI review, manual approval, needs changes, and publishing', href: '/pipeline' },
      { title: 'Submit Asset', meta: 'Create a new contribution for review', href: '/submit' },
    ]
    const familyResults = families.map((family) => ({
      title: family.name,
      meta: `${family.tagline} - ${family.description}`,
      href: `/catalog/${family.id}`,
    }))
    const categoryResults = categoryOptions.map((category) => ({
      title: category,
      meta: 'Category',
      href: `/catalog?query=${encodeURIComponent(category)}`,
    }))
    const solutionResults = families.flatMap((family) =>
      family.solutions.map((solution) => ({
        title: solution.name,
        meta: `${family.name} solution - ${solution.description}`,
        href: `/catalog?query=${encodeURIComponent(solution.name)}`,
      })),
    )
    const assetResults = assets.map((asset) => ({
      title: asset.name,
      meta: `${getFamily(asset.familyId).name} - ${asset.category} - ${asset.solution}`,
      href: `/assets/${asset.id}`,
      text: [
        asset.name,
        asset.description,
        asset.about,
        asset.category,
        asset.solution,
        asset.tags.join(' '),
        asset.clouds.join(' '),
        getFamily(asset.familyId).name,
      ].join(' '),
    }))
    const pipelineResults = pipelineItems.map((item) => ({
      title: item.assetName,
      meta: `${item.status} - ${getFamily(item.familyId).name} - ${item.category}`,
      href: '/pipeline',
      text: `${item.assetName} ${item.description} ${item.status} ${item.category} ${item.solution} ${item.clouds.join(' ')}`,
    }))
    return [...pages, ...familyResults, ...categoryResults, ...solutionResults, ...assetResults, ...pipelineResults]
      .filter((result) => `${result.title} ${result.meta} ${'text' in result ? result.text : ''}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 7)
  }, [assets, normalizedQuery, pipelineItems, query])

  function choose(href: string) {
    setOpen(false)
    setQuery('')
    navigate(href)
  }

  return (
    <div className="global-search">
      <label className="search">
        <Search size={16} />
        <input
          value={query}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results[0]) choose(results[0].href)
            if (event.key === 'Escape') setOpen(false)
          }}
          placeholder="Semantic search..."
        />
      </label>
      {open && query && (
        <div className="search-results">
          {results.length ? results.map((result) => (
            <button key={`${result.href}-${result.title}`} onMouseDown={() => choose(result.href)} type="button">
              <strong>{result.title}</strong>
              <span>{result.meta}</span>
            </button>
          )) : <p>No matching assets, pages, categories, or solutions.</p>}
        </div>
      )}
    </div>
  )
}

function LoginPage({
  onLogin,
  assets,
}: {
  onLogin: (email: string, password: string) => boolean
  assets: Asset[]
}) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('abhilash.vantaram@infovision.com')
  const [password, setPassword] = useState('Aimplify@2026')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (onLogin(email, password)) {
      navigate('/')
      return
    }
    setError('Use one of the seeded demo users for V1 access.')
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-large">
          <span className="brand-mark">AI</span>
          <strong>AIMPLIFY</strong>
        </div>
        <h1>Accelerator OS for reusable AI delivery</h1>
        <p>
          A governed marketplace for reusable AI assets, prompt libraries,
          agent workflows, demos, and delivery accelerators across InfoVision.
        </p>
        <div className="login-metrics">
          {families.slice(0, 4).map((family) => (
            <span key={family.id} style={{ color: family.color }}>
              <strong>{assets.filter((asset) => asset.familyId === family.id).length}</strong>
              {family.name}
            </span>
          ))}
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <h2>Sign in</h2>
        <p>Use your InfoVision V1 demo credentials</p>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit">Sign in</button>
        <small>Microsoft Entra SSO and role policies are planned for backend integration.</small>
      </form>
    </main>
  )
}

function Dashboard({ assets, pipelineItems }: { assets: Asset[]; pipelineItems: PipelineItem[] }) {
  const totalDeployments = assets.reduce((sum, asset) => sum + asset.deployments, 0)
  const mostDeployed = [...assets].sort((a, b) => b.deployments - a.deployments).slice(0, 5)
  const pending = pipelineItems.filter((item) => item.status !== 'Published')

  return (
    <div className="page">
      <section className="command-band">
        <div>
          <small>AIMPLIFY Command Center</small>
          <h1>Welcome back, Abhilash</h1>
          <p>Track accelerator readiness, review incoming submissions, and publish reusable AI assets to the organization.</p>
        </div>
        <Link to="/submit" className="primary-button">Submit Asset</Link>
      </section>
      <section className="metric-grid">
        <Metric label="Total Assets" value={assets.length} icon={<Database />} />
        <Metric label="Battle-tested" value={assets.filter((asset) => asset.maturity === 'Battle-tested').length} icon={<ShieldCheck />} />
        <Metric label="Demo-ready" value={assets.filter((asset) => asset.maturity === 'Demo-ready').length} icon={<Sparkles />} />
        <Metric label="Total Deploys" value={totalDeployments} icon={<GitBranch />} />
      </section>

      <section>
        <h2 className="section-title">Platform Families</h2>
        <div className="family-strip">
          {families.map((family) => (
            <Link className="family-card" to={`/catalog/${family.id}`} key={family.id}>
              <span style={{ background: family.color }} />
              <strong>{family.name}</strong>
              <small>{family.tagline}</small>
              <em>{assets.filter((asset) => asset.familyId === family.id).length}</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <Panel title="Most Deployed Assets">
          <div className="list">
            {mostDeployed.map((asset) => (
              <Link to={`/assets/${asset.id}`} className="list-row" key={asset.id}>
                <span className="dot" style={{ background: getFamily(asset.familyId).color }} />
                <span><strong>{asset.name}</strong><small>{asset.id.toUpperCase()} - {getFamily(asset.familyId).name}</small></span>
                <b>{asset.deployments}</b>
              </Link>
            ))}
          </div>
        </Panel>
        <div className="stack">
          <Panel title="Recent Activity">
            <div className="activity-list">
              {activities.map((activity) => (
                <p key={activity.id}>
                  <strong>{activity.person}</strong> {activity.action}{' '}
                  <span style={{ color: activity.familyId ? getFamily(activity.familyId).color : undefined }}>{activity.target}</span>
                  <small>{activity.time}</small>
                </p>
              ))}
            </div>
          </Panel>
          <Panel title={`Review Queue (${pending.length})`}>
            <div className="mini-pipeline">
              {pending.slice(0, 4).map((item) => (
                <Link to="/pipeline" key={item.id}>
                  <span>{item.status}</span>
                  {item.assetName}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  )
}

function Catalog({ assets }: { assets: Asset[] }) {
  const [searchParams] = useSearchParams()
  const [familyFilters, setFamilyFilters] = useState<string[]>([])
  const [cloudFilters, setCloudFilters] = useState<string[]>([])
  const [maturityFilters, setMaturityFilters] = useState<string[]>([])
  const [query, setQuery] = useState(searchParams.get('query') ?? '')
  const [view, setView] = useState<ViewMode>('grid')
  const filtered = useMemo(
    () =>
      assets.filter((asset) => {
        const matchesFamily = familyFilters.length === 0 || familyFilters.includes(asset.familyId)
        const matchesCloud = cloudFilters.length === 0 || asset.clouds.some((cloud) => cloudFilters.includes(cloud))
        const matchesMaturity = maturityFilters.length === 0 || maturityFilters.includes(asset.maturity)
        const text = `${asset.name} ${asset.description} ${asset.category} ${asset.solution} ${asset.tags.join(' ')}`.toLowerCase()
        return matchesFamily && matchesCloud && matchesMaturity && text.includes(query.toLowerCase())
      }),
    [assets, familyFilters, cloudFilters, maturityFilters, query],
  )

  return (
    <div className="page">
      <div className="catalog-head">
        <PageIntro title="Asset Catalog" subtitle={`${filtered.length} of ${assets.length} assets`} />
        <div className="catalog-actions">
          <Link to="/submit" className="secondary-button">+ Submit</Link>
          <button className={view === 'grid' ? 'icon-button active' : 'icon-button'} onClick={() => setView('grid')} type="button" title="Grid view"><Grid3X3 size={17} /></button>
          <button className={view === 'list' ? 'icon-button active' : 'icon-button'} onClick={() => setView('list')} type="button" title="List view"><List size={17} /></button>
        </div>
      </div>
      <div className="filter-bar">
        <label className="catalog-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets, tags, solutions..." /></label>
        <div className="filter-dropdown-row">
          <CheckboxDropdown
            label="Family"
            options={families.map((family) => ({ label: family.name, value: family.id }))}
            selected={familyFilters}
            onChange={setFamilyFilters}
          />
          <CheckboxDropdown
            label="Cloud"
            options={cloudOptions.filter((option) => option !== 'All').map((option) => ({ label: option, value: option }))}
            selected={cloudFilters}
            onChange={setCloudFilters}
          />
          <CheckboxDropdown
            label="Maturity"
            options={maturityOptions.filter((option) => option !== 'All').map((option) => ({ label: option, value: option }))}
            selected={maturityFilters}
            onChange={setMaturityFilters}
          />
          <button className="secondary-button" type="button" onClick={() => { setFamilyFilters([]); setCloudFilters([]); setMaturityFilters([]); setQuery('') }}>
            Clear filters
          </button>
        </div>
      </div>
      <AssetGrid assetsForGrid={filtered} view={view} />
    </div>
  )
}

function FamilyPage({ assets }: { assets: Asset[] }) {
  const { familyId } = useParams()
  const family = getFamily((familyId as FamilyId) ?? 'atlas')
  const entries = assets.filter((asset) => asset.familyId === family.id)

  return (
    <div className="page">
      <div className="breadcrumb">Home / {family.name}</div>
      <section className="family-hero" style={{ borderTopColor: family.color }}>
        <div>
          <small>{family.tagline}</small>
          <h1>{family.name}</h1>
          <p>{family.description}</p>
          <div className="hero-counts">
            <Metric label="Assets" value={entries.length} />
            <Metric label="Battle-tested" value={entries.filter((asset) => asset.maturity === 'Battle-tested').length} />
            <Metric label="Demo-ready" value={entries.filter((asset) => asset.maturity === 'Demo-ready').length} />
            <Metric label="Deploys" value={entries.reduce((sum, asset) => sum + asset.deployments, 0)} />
          </div>
        </div>
        <InfoColumn title="When To Sell" items={family.whenToSell} />
        <InfoColumn title="Depends On" items={family.dependsOn} />
        <InfoColumn title="Enables" items={family.enables} />
      </section>
      <section>
        <h2 className="section-title">Signature Solutions</h2>
        <div className="solution-grid">
          {family.solutions.map((solution) => (
            <article key={solution.name}>
              <CircleDot size={15} style={{ color: family.color }} />
              <span><strong>{solution.name}</strong><small>{solution.description}</small></span>
            </article>
          ))}
        </div>
      </section>
      <AssetGrid assetsForGrid={entries} view="grid" />
    </div>
  )
}

function AssetPage({ assets }: { assets: Asset[] }) {
  const { assetId } = useParams()
  const asset = assets.find((entry) => entry.id === assetId) ?? assets[0]
  const family = getFamily(asset.familyId)
  const [tab, setTab] = useState<AssetTab>('overview')
  const [demoOpen, setDemoOpen] = useState(false)
  const [cloneRequested, setCloneRequested] = useState(false)
  const related = assets.filter((entry) => entry.familyId === asset.familyId && entry.id !== asset.id).slice(0, 3)

  return (
    <div className="page asset-page">
      <div className="breadcrumb">Catalog / {family.name} / {asset.name}</div>
      <section className="asset-header">
        <div>
          <div className="chip-row"><span>{asset.id.toUpperCase()}</span><span>{family.name}</span><span>{asset.maturity}</span></div>
          <h1>{asset.name}</h1>
          <p>{asset.description}</p>
          <div className="chip-row">{asset.clouds.map((cloud) => <span key={cloud}>{cloud}</span>)}</div>
          <div className="action-row">
            <button className="primary-button" onClick={() => setDemoOpen(true)} type="button"><Play size={16} /> Launch Demo</button>
            <button className="secondary-button" onClick={() => setCloneRequested(true)} type="button"><GitBranch size={16} /> Request Clone Access</button>
          </div>
          {cloneRequested && <p className="inline-notice">Clone access request captured. This will route to manual approval when the backend is connected.</p>}
        </div>
        <aside className="side-panel">
          <Metric label="Users" value={asset.users} />
          <Metric label="Deploys" value={asset.deployments} />
          <Metric label="Pipelines" value={asset.pipelines} />
          <Metric label="Score" value={`${asset.score}%`} />
          <hr />
          <dl>
            <dt>Owner</dt><dd>{asset.owner}</dd>
            <dt>Category</dt><dd>{asset.category}</dd>
            <dt>Solution</dt><dd>{asset.solution}</dd>
            <dt>Effort</dt><dd>{asset.effort}</dd>
          </dl>
        </aside>
      </section>
      <div className="tabs">
        {[
          ['overview', 'Overview'],
          ['architecture', 'Architecture'],
          ['quickStart', 'Quick Start'],
        ].map(([value, label]) => (
          <button className={tab === value ? 'active' : ''} onClick={() => setTab(value as AssetTab)} type="button" key={value}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && (
        <section className="detail-grid">
          <Panel title="About"><p>{asset.about}</p><div className="tag-row">{asset.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></Panel>
          <Panel title="Prerequisites"><CheckList items={asset.prerequisites} /></Panel>
          <Panel title="Dependencies"><CheckList items={asset.dependencies.length ? asset.dependencies : ['No required dependencies']} /></Panel>
          <Panel title={`More in ${family.name}`}>
            <div className="related-list">
              {related.map((entry) => <Link to={`/assets/${entry.id}`} key={entry.id}>{entry.name}<small>{entry.id.toUpperCase()}</small></Link>)}
            </div>
          </Panel>
          <Panel title="Changelog"><ChangeList asset={asset} /></Panel>
        </section>
      )}
      {tab === 'architecture' && (
        <section className="panel">
          <h2>Architecture</h2>
          <div className="architecture-flow">{asset.architecture.map((node) => <span key={node}>{node}</span>)}</div>
        </section>
      )}
      {tab === 'quickStart' && (
        <section className="detail-grid">
          <Panel title="Quick Start"><pre>{asset.quickStart.join('\n')}</pre></Panel>
          <Panel title="Repository & Demo">
            <div className="link-stack">
              <a href={asset.repoUrl ?? '#'} target="_blank">Repository <ExternalLink size={14} /></a>
              <a href={asset.demoUrl ?? '#'} target="_blank">Demo / video link <ExternalLink size={14} /></a>
            </div>
          </Panel>
        </section>
      )}
      {demoOpen && <DemoModal asset={asset} onClose={() => setDemoOpen(false)} />}
    </div>
  )
}

function SubmitPage({ onSubmitAsset }: { onSubmitAsset: (item: PipelineItem) => void }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    assetName: '',
    familyId: 'relay' as FamilyId,
    category: 'Process Automation',
    solution: 'Agent Orchestration',
    ownerEmail: 'dhanuvanth.senthilkumar@infovision.com',
    repoUrl: '',
    demoUrl: '',
    maturity: 'Demo-ready' as Maturity,
    clouds: ['AWS', 'Azure'],
    attachmentUrl: '',
    attachmentType: 'Video' as PipelineItem['attachments'][number]['type'],
    description: '',
  })

  function setField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setFamily(familyId: FamilyId) {
    const nextFamily = getFamily(familyId)
    setForm((current) => ({
      ...current,
      familyId,
      solution: nextFamily.solutions[0]?.name ?? current.solution,
    }))
  }

  function toggleCloud(cloud: string) {
    setForm((current) => ({
      ...current,
      clouds: current.clouds.includes(cloud)
        ? current.clouds.filter((item) => item !== cloud)
        : [...current.clouds, cloud],
    }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmitAsset({
      id: `sub-${Date.now()}`,
      assetName: form.assetName || 'Untitled Accelerator',
      familyId: form.familyId,
      category: form.category,
      solution: form.solution,
      author: 'Dhanuvanth SenthilKumar',
      authorInitials: 'DS',
      status: 'Submitted',
      score: 68,
      description: form.description || 'New accelerator submitted for V1 review.',
      ownerEmail: form.ownerEmail,
      repoUrl: form.repoUrl,
      demoUrl: form.demoUrl,
      clouds: form.clouds,
      maturity: form.maturity,
      attachments: form.attachmentUrl ? [{ label: 'Submitted attachment', url: form.attachmentUrl, type: form.attachmentType }] : [],
      submittedAt: new Date().toISOString().slice(0, 10),
    })
    navigate('/pipeline')
  }

  return (
    <div className="page submit-page">
      <div className="breadcrumb">Pipeline / New asset</div>
      <form className="submit-form expanded" onSubmit={submit}>
        <div className="form-head">
          <span><PackagePlus size={18} /> Contribution intake</span>
          <h1>Submit a New Asset</h1>
          <p>Capture the metadata required for AI review, human approval, and eventual organization-wide publishing.</p>
        </div>
        <div className="form-grid">
          <label>Asset Name *<input value={form.assetName} onChange={(event) => setField('assetName', event.target.value)} placeholder="e.g. Invoice Extraction Pipeline" required /></label>
          <label>Platform Family *<select value={form.familyId} onChange={(event) => setFamily(event.target.value as FamilyId)}>{families.map((family) => <option key={family.id} value={family.id}>{family.name} - {family.tagline}</option>)}</select></label>
          <label>Category<select value={form.category} onChange={(event) => setField('category', event.target.value)}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Signature Solution<select value={form.solution} onChange={(event) => setField('solution', event.target.value)}>{getFamily(form.familyId).solutions.map((solution) => <option key={solution.name}>{solution.name}</option>)}</select></label>
          <label>Owner Email<input value={form.ownerEmail} onChange={(event) => setField('ownerEmail', event.target.value)} /></label>
          <label>Maturity<select value={form.maturity} onChange={(event) => setField('maturity', event.target.value as Maturity)}>{maturityOptions.filter((item) => item !== 'All').map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="form-field">
            <span>Cloud Compatibility</span>
            <div className="cloud-picker">
              {submitCloudOptions.map((cloud) => (
                <label key={cloud}>
                  <input checked={form.clouds.includes(cloud)} onChange={() => toggleCloud(cloud)} type="checkbox" />
                  {cloud}
                </label>
              ))}
            </div>
          </div>
          <label>Repository Link<input value={form.repoUrl} onChange={(event) => setField('repoUrl', event.target.value)} placeholder="https://github.com/..." /></label>
          <label>Demo / Video Link<input value={form.demoUrl} onChange={(event) => setField('demoUrl', event.target.value)} placeholder="https://..." /></label>
          <label>Attachment Type<select value={form.attachmentType} onChange={(event) => setField('attachmentType', event.target.value as typeof form.attachmentType)}>{['Prompt', 'Project', 'Image', 'Video', 'Document', 'Other'].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="wide">Attachment / Supporting Link<input value={form.attachmentUrl} onChange={(event) => setField('attachmentUrl', event.target.value)} placeholder="Prompt, project, image, video, or document link" /></label>
          <label className="wide">Description *<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="What does it do? Which signature solution does it support? What can delivery teams reuse?" required /></label>
        </div>
        <div className="review-checks">
          <strong>Review path</strong>
          <WorkflowPills current="Submitted" />
          <CheckList items={['Security & sanitization', 'Test coverage & evals', 'Code quality', 'Dependency health', 'Documentation', 'Cloud-native deploy', 'Compliance & logging']} />
        </div>
        <button className="primary-button" type="submit">Submit for Review</button>
      </form>
    </div>
  )
}

function PipelinePage({
  items,
  onStatusChange,
  onPublish,
}: {
  items: PipelineItem[]
  onStatusChange: (id: string, status: PipelineStatus) => void
  onPublish: (item: PipelineItem) => void
}) {
  const [filter, setFilter] = useState<PipelineStatus | 'All'>('All')
  const filtered = useMemo(() => (filter === 'All' ? items : items.filter((item) => item.status === filter)), [filter, items])

  return (
    <div className="page">
      <div className="pipeline-heading">
        <PageIntro title="Contribution Pipeline" subtitle="Submitted -> AI Review -> Manual Approval -> Approved -> Published" />
        <Link to="/submit" className="primary-button">+ Submit</Link>
      </div>
      <div className="segmented">
        {statusOptions.map((status) => (
          <button className={filter === status ? 'active' : ''} type="button" onClick={() => setFilter(status)} key={status}>{status}</button>
        ))}
      </div>
      <div className="pipeline-list rich">
        {filtered.map((item) => (
          <article key={item.id}>
            <span className="avatar">{item.authorInitials}</span>
            <div>
              <h2>{item.assetName}</h2>
              <p>{item.author} - {item.submittedAt} - {getFamily(item.familyId).name} - {item.category}</p>
              <WorkflowPills current={item.status} />
              {item.status === 'Needs Changes' && <NeedsChangesNote item={item} />}
            </div>
            <strong>{item.score}<small>/100</small></strong>
            <em>{item.status}</em>
            <PipelineActions item={item} onPublish={onPublish} onStatusChange={onStatusChange} />
          </article>
        ))}
      </div>
    </div>
  )
}

function NeedsChangesNote({ item }: { item: PipelineItem }) {
  return (
    <div className="pipeline-note">
      <strong>Revision needed</strong>
      <span>{item.author} owns the update. Review comments should be added by the manual approver; after the contributor updates repo/demo/metadata, resubmit to AI Review.</span>
    </div>
  )
}

function PipelineActions({
  item,
  onStatusChange,
  onPublish,
}: {
  item: PipelineItem
  onStatusChange: (id: string, status: PipelineStatus) => void
  onPublish: (item: PipelineItem) => void
}) {
  if (item.status === 'Submitted') return <button className="secondary-button" onClick={() => onStatusChange(item.id, 'AI Review')} type="button">Start AI Review</button>
  if (item.status === 'AI Review') return <button className="secondary-button" onClick={() => onStatusChange(item.id, 'Manual Approval')} type="button">Send to Manual Approval</button>
  if (item.status === 'Manual Approval') {
    return (
      <div className="action-row compact">
        <button className="secondary-button" onClick={() => onStatusChange(item.id, 'Needs Changes')} type="button">Needs Changes</button>
        <button className="primary-button" onClick={() => onStatusChange(item.id, 'Approved')} type="button">Approve</button>
      </div>
    )
  }
  if (item.status === 'Approved') return <button className="primary-button" onClick={() => onPublish(item)} type="button">Publish to Catalog</button>
  if (item.status === 'Needs Changes') return <button className="secondary-button" onClick={() => onStatusChange(item.id, 'AI Review')} type="button">Resubmit to AI Review</button>
  return <span className="published-note"><FileCheck2 size={16} /> Organization-visible</span>
}

function AssetGrid({ assetsForGrid, view }: { assetsForGrid: Asset[]; view: ViewMode }) {
  return (
    <section>
      <h2 className="section-title">Assets ({assetsForGrid.length})</h2>
      <div className={view === 'grid' ? 'asset-grid' : 'asset-list-view'}>
        {assetsForGrid.map((asset) => {
          const family = getFamily(asset.familyId)
          return (
            <Link className="asset-card" to={`/assets/${asset.id}`} key={asset.id}>
              <span className="chip-row"><span>{asset.id.toUpperCase()}</span><span style={{ color: family.color }}>{family.name}</span></span>
              <h2>{asset.name}</h2>
              <p>{asset.description}</p>
              <small>{asset.solution}</small>
              <div className="card-footer"><span>{asset.effort}</span><span>{asset.maturity}</span></div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (value: string[]) => void
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  return (
    <details className="checkbox-dropdown">
      <summary>
        <span>{label}</span>
        <strong>{selected.length ? selected.length : 'All'}</strong>
        <ChevronDown size={15} />
      </summary>
      <div className="checkbox-menu">
        {options.map((option) => (
          <label key={option.value}>
            <input checked={selected.includes(option.value)} onChange={() => toggle(option.value)} type="checkbox" />
            {option.label}
          </label>
        ))}
      </div>
    </details>
  )
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return <article className="metric">{icon}<strong>{value}</strong><span>{label}</span></article>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel"><h2>{title}</h2>{children}</section>
}

function PageIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="page-intro"><h1>{title}</h1><p>{subtitle}</p></div>
}

function InfoColumn({ title, items }: { title: string; items: string[] }) {
  return <div className="info-column"><strong>{title}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>
}

function CheckList({ items }: { items: string[] }) {
  return <ul className="check-list">{items.map((item) => <li key={item}><CheckCircle2 size={15} /> {item}</li>)}</ul>
}

function WorkflowPills({ current }: { current: PipelineStatus }) {
  const steps: PipelineStatus[] = ['Submitted', 'AI Review', 'Manual Approval', 'Approved', 'Published']
  const index = steps.indexOf(current)
  return (
    <div className="workflow-pills">
      {steps.map((step, stepIndex) => <span className={stepIndex <= index ? 'done' : ''} key={step}>{step}</span>)}
    </div>
  )
}

function ChangeList({ asset }: { asset: Asset }) {
  return <div className="change-list">{asset.changelog.map((change) => <p key={change.version}><strong>{change.version}</strong> {change.date}<span>{change.note}</span></p>)}</div>
}

function DemoModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal">
        <button className="icon-button close-button" onClick={onClose} type="button"><X size={17} /></button>
        <span className="modal-icon"><Play size={22} /></span>
        <h2>{asset.name} Demo</h2>
        <p>V1 opens a linked demo or video. Once storage is connected, this panel can play the asset walkthrough directly.</p>
        <a className="primary-button" href={asset.demoUrl ?? '#'} target="_blank">Open demo link <ExternalLink size={16} /></a>
      </section>
    </div>
  )
}

export default App
