import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  LayoutDashboard, Building2, Key, LogOut,
  TrendingUp, Users, AlertTriangle, CheckCircle,
  Clock, ChevronDown, ChevronUp, X, Search, RefreshCw
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type Org = {
  id: string
  nom: string
  statut_compte: string | null
  plan: string | null
  trial_end: string | null
  licence_end: string | null
  created_at: string
  telephone: string | null
  siret: string | null
}

type Stats = {
  nb_users: number
  nb_palettes: number
  nb_clients: number
  nb_mouvements: number
}

const PLAN_PRIX: Record<string, number> = { starter: 49, pro: 99, business: 199 }
const PLANS = ['starter', 'pro', 'business']
const STATUTS = ['trial', 'actif', 'active', 'suspendu', 'expire']

const s = {
  sidebar: { width: '240px', background: '#0D1117', borderRight: '1px solid rgba(255,255,255,0.06)', height: '100vh', display: 'flex', flexDirection: 'column' as const, position: 'fixed' as const, left: 0, top: 0, zIndex: 50 },
  main: { marginLeft: '240px', minHeight: '100vh', background: '#080A0F', padding: '32px' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px' },
  input: { width: '100%', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: 'white', outline: 'none', fontFamily: 'Inter, sans-serif', colorScheme: 'dark' },
  btn: (color: string) => ({ background: color, border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '0.75rem', fontWeight: '600' as const, color: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }),
  label: { display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
}

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<'dashboard' | 'orgs' | 'licences'>('dashboard')
  const [orgs, setOrgs] = useState<Org[]>([])
  const [, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [editOrg, setEditOrg] = useState<Org | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'licence' | 'infos'>('licence')

  useEffect(() => { fetchOrgs() }, [])

  const fetchOrgs = async () => {
    setLoading(true)
    const { data } = await supabase.from('organisations').select('*').order('created_at', { ascending: false })
    setOrgs(data ?? [])
    setLoading(false)
  }

  const fetchStats = async (orgId: string) => {
    if (stats[orgId]) return
    const [{ count: nb_users }, { count: nb_palettes }, { count: nb_clients }, { count: nb_mouvements }] = await Promise.all([
      supabase.from('utilisateurs').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
      supabase.from('palettes').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).is('deleted_at', null),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).is('deleted_at', null),
      supabase.from('mouvements').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
    ])
    setStats(prev => ({ ...prev, [orgId]: { nb_users: nb_users ?? 0, nb_palettes: nb_palettes ?? 0, nb_clients: nb_clients ?? 0, nb_mouvements: nb_mouvements ?? 0 } }))
  }

  const mrr = orgs.filter(o => o.statut_compte === 'actif' || o.statut_compte === 'active').reduce((sum, o) => sum + (PLAN_PRIX[o.plan ?? 'starter'] ?? 49), 0)
  const actifs = orgs.filter(o => o.statut_compte === 'actif' || o.statut_compte === 'active').length
  const trials = orgs.filter(o => o.statut_compte === 'trial').length
  const expires = orgs.filter(o => {
    const d = o.licence_end ?? o.trial_end
    if (!d) return false
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) <= 7
  }).length

  const mrrData = [
    { m: 'Jan', v: 0 }, { m: 'Fév', v: 0 }, { m: 'Mar', v: 0 },
    { m: 'Avr', v: Math.round(mrr * 0.4) }, { m: 'Mai', v: mrr }, { m: 'Jun', v: mrr },
  ]

  const daysLeft = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null

  const getStatutStyle = (s: string | null) => {
    if (s === 'actif' || s === 'active') return { bg: 'rgba(16,185,129,0.12)', color: '#34D399', label: 'Actif' }
    if (s === 'trial') return { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA', label: 'Essai' }
    if (s === 'suspendu') return { bg: 'rgba(239,68,68,0.12)', color: '#FCA5A5', label: 'Suspendu' }
    return { bg: 'rgba(100,116,139,0.12)', color: '#94A3B8', label: s ?? '—' }
  }

  const getPlanStyle = (p: string | null) => {
    if (p === 'business') return { bg: 'rgba(168,85,247,0.12)', color: '#C084FC' }
    if (p === 'pro') return { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' }
    return { bg: 'rgba(100,116,139,0.12)', color: '#94A3B8' }
  }

  const extend = async (orgId: string, days: number) => {
    setSaving(true)
    const org = orgs.find(o => o.id === orgId)
    const base = org?.licence_end ? new Date(org.licence_end) : new Date()
    base.setDate(base.getDate() + days)
    await supabase.from('organisations').update({ licence_end: base.toISOString(), statut_compte: 'actif' }).eq('id', orgId)
    setSaving(false)
    fetchOrgs()
  }

  const suspend = async (orgId: string) => {
    if (!confirm('Suspendre cette organisation ?')) return
    await supabase.from('organisations').update({ statut_compte: 'suspendu' }).eq('id', orgId)
    fetchOrgs()
  }

  const activate = async (orgId: string) => {
    const end = new Date(); end.setMonth(end.getMonth() + 1)
    await supabase.from('organisations').update({ statut_compte: 'actif', licence_end: end.toISOString() }).eq('id', orgId)
    fetchOrgs()
  }

  const openEdit = (org: Org) => {
    setEditForm({
      plan: org.plan ?? 'starter',
      statut_compte: org.statut_compte ?? 'trial',
      trial_end: org.trial_end ? org.trial_end.slice(0, 10) : '',
      licence_end: org.licence_end ? org.licence_end.slice(0, 10) : '',
      nom: org.nom,
      telephone: org.telephone ?? '',
    })
    setActiveTab('licence')
    setEditOrg(org)
  }

  const saveEdit = async () => {
    if (!editOrg) return
    setSaving(true)
    const payload: any = { plan: editForm.plan, statut_compte: editForm.statut_compte, nom: editForm.nom, telephone: editForm.telephone || null }
    if (editForm.trial_end) payload.trial_end = new Date(editForm.trial_end).toISOString()
    if (editForm.licence_end) payload.licence_end = new Date(editForm.licence_end).toISOString()
    await supabase.from('organisations').update(payload).eq('id', editOrg.id)
    setSaving(false)
    setEditOrg(null)
    fetchOrgs()
  }

  const orgsFiltrees = orgs.filter(o => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return o.nom.toLowerCase().includes(q) || (o.siret ?? '').includes(q)
  })

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button onClick={() => setPage(id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: page === id ? 'rgba(37,99,235,0.15)' : 'transparent', color: page === id ? '#60A5FA' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: page === id ? '600' : '400', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', textAlign: 'left' }}>
      <Icon size={16} />{label}
    </button>
  )

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{ width: '34px', height: '34px', background: '#1d4ed8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="9" width="16" height="11" rx="2" fill="rgba(255,255,255,0.2)"/>
                <rect x="9" y="2" width="4" height="12" rx="2" fill="white"/>
                <polygon points="11,0 6,7 16,7" fill="white"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white', lineHeight: '1.2' }}>Stockio<span style={{ color: '#3B82F6' }}>XL</span></p>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Back Office</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '4px' }}>Navigation</p>
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="orgs" icon={Building2} label="Organisations" />
            <NavItem id="licences" icon={Key} label="Licences" />
          </div>
        </div>

        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>MRR</p>
            <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#60A5FA' }}>{mrr}€</p>
          </div>
          <button onClick={onLogout} style={{ ...s.btn('rgba(239,68,68,0.1)'), width: '100%', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>

        {/* ─── DASHBOARD ─── */}
        {page === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Dashboard</h1>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Vue d'ensemble de votre activité StockioXL</p>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {[
                { label: 'MRR', value: `${mrr}€`, sub: 'Revenu mensuel', icon: TrendingUp, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                { label: 'Clients actifs', value: actifs, sub: `sur ${orgs.length} orgs`, icon: Users, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                { label: 'En essai', value: trials, sub: '14 jours gratuits', icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                { label: 'Alertes', value: expires, sub: 'Expirent dans 7j', icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
              ].map(k => (
                <div key={k.label} style={{ ...s.card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>{k.label}</p>
                    <div style={{ width: '32px', height: '32px', background: k.bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <k.icon size={16} color={k.color} />
                    </div>
                  </div>
                  <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'white', lineHeight: '1', marginBottom: '4px' }}>{k.value}</p>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Graphique MRR */}
            <div style={{ ...s.card, marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '2px' }}>Évolution MRR</h2>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>6 derniers mois</p>
                </div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.1)', color: '#34D399', padding: '4px 10px', borderRadius: '100px', fontWeight: '600' }}>+{mrr}€ ce mois</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={mrrData}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="v" stroke="#2563EB" strokeWidth={2} fill="url(#mrrGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Orgs récentes */}
            <div style={s.card}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '20px' }}>Organisations récentes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {orgs.slice(0, 5).map(org => {
                  const st = getStatutStyle(org.statut_compte)
                  const pl = getPlanStyle(org.plan)
                  const dl = daysLeft(org.licence_end ?? org.trial_end)
                  return (
                    <div key={org.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(37,99,235,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={16} color="#60A5FA" />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white' }}>{org.nom}</p>
                          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{new Date(org.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '100px', fontWeight: '600' }}>{st.label}</span>
                        <span style={{ fontSize: '0.7rem', background: pl.bg, color: pl.color, padding: '3px 10px', borderRadius: '100px', fontWeight: '600' }}>{org.plan ?? 'starter'}</span>
                        {dl !== null && dl <= 7 && dl > 0 && <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', color: '#FCD34D', padding: '3px 10px', borderRadius: '100px', fontWeight: '600' }}>{dl}j</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── ORGANISATIONS ─── */}
        {page === 'orgs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Organisations</h1>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>{orgs.length} organisation(s) au total</p>
              </div>
              <button onClick={fetchOrgs} style={{ ...s.btn('rgba(255,255,255,0.06)'), border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={13} /> Actualiser
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher une organisation..." style={{ ...s.input, paddingLeft: '36px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orgsFiltrees.map(org => {
                const st = getStatutStyle(org.statut_compte)
                const pl = getPlanStyle(org.plan)
                const dl = daysLeft(org.licence_end ?? org.trial_end)
                const isExp = expanded === org.id
                return (
                  <div key={org.id} style={{ ...s.card, padding: '0', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', cursor: 'pointer' }}
                      onClick={() => { setExpanded(isExp ? null : org.id); if (!isExp) fetchStats(org.id) }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(37,99,235,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={18} color="#60A5FA" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{org.nom}</p>
                          <span style={{ fontSize: '0.68rem', background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>{st.label}</span>
                          <span style={{ fontSize: '0.68rem', background: pl.bg, color: pl.color, padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>{org.plan ?? 'starter'}</span>
                          {dl !== null && dl <= 7 && dl > 0 && <span style={{ fontSize: '0.68rem', background: 'rgba(245,158,11,0.1)', color: '#FCD34D', padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>⚠ {dl}j</span>}
                          {dl !== null && dl <= 0 && <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>Expiré</span>}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                          Créé le {new Date(org.created_at).toLocaleDateString('fr-FR')}
                          {org.licence_end && ` · Licence jusqu'au ${new Date(org.licence_end).toLocaleDateString('fr-FR')}`}
                          {!org.licence_end && org.trial_end && ` · Essai jusqu'au ${new Date(org.trial_end).toLocaleDateString('fr-FR')}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={e => { e.stopPropagation(); openEdit(org) }} style={{ ...s.btn('rgba(59,130,246,0.15)'), color: '#60A5FA' }}>Gérer</button>
                        {(org.statut_compte === 'actif' || org.statut_compte === 'active') ? (
                          <button onClick={e => { e.stopPropagation(); suspend(org.id) }} style={{ ...s.btn('rgba(239,68,68,0.15)'), color: '#FCA5A5' }}>Suspendre</button>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); activate(org.id) }} style={{ ...s.btn('rgba(16,185,129,0.15)'), color: '#34D399' }}>Activer</button>
                        )}
                        <button onClick={e => { e.stopPropagation(); extend(org.id, 30) }} style={{ ...s.btn('rgba(168,85,247,0.15)'), color: '#C084FC' }}>+30j</button>
                        {isExp ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                      </div>
                    </div>

                    {isExp && stats[org.id] && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                          {[
                            { label: 'Utilisateurs', value: stats[org.id].nb_users, color: '#60A5FA' },
                            { label: 'Palettes', value: stats[org.id].nb_palettes, color: '#34D399' },
                            { label: 'Clients', value: stats[org.id].nb_clients, color: '#C084FC' },
                            { label: 'Mouvements', value: stats[org.id].nb_mouvements, color: '#FBBF24' },
                          ].map(st => (
                            <div key={st.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px' }}>
                              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{st.label}</p>
                              <p style={{ fontSize: '1.4rem', fontWeight: '800', color: st.color }}>{st.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── LICENCES ─── */}
        {page === 'licences' && (
          <div>
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Licences</h1>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Gestion des licences et abonnements</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {PLANS.map(plan => {
                const count = orgs.filter(o => o.plan === plan && (o.statut_compte === 'actif' || o.statut_compte === 'active')).length
                const rev = count * PLAN_PRIX[plan]
                return (
                  <div key={plan} style={s.card}>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>{plan}</p>
                    <p style={{ fontSize: '2rem', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{count}</p>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>clients actifs</p>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Revenu mensuel</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#60A5FA' }}>{rev}€</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={s.card}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginBottom: '20px' }}>Licences à surveiller</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {orgs.filter(o => {
                  const d = daysLeft(o.licence_end ?? o.trial_end)
                  return d !== null && d <= 14
                }).map(org => {
                  const dl = daysLeft(org.licence_end ?? org.trial_end)
                  const st = getStatutStyle(org.statut_compte)
                  return (
                    <div key={org.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white' }}>{org.nom}</p>
                        <p style={{ fontSize: '0.72rem', color: dl !== null && dl <= 0 ? '#FCA5A5' : '#FCD34D' }}>
                          {dl !== null && dl <= 0 ? 'Expirée' : `Expire dans ${dl} jour(s)`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '0.68rem', background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>{st.label}</span>
                        <button onClick={() => extend(org.id, 30)} style={{ ...s.btn('#2563EB') }}>+30j</button>
                        <button onClick={() => extend(org.id, 365)} style={{ ...s.btn('rgba(168,85,247,0.8)') }}>+1 an</button>
                      </div>
                    </div>
                  )
                })}
                {orgs.filter(o => { const d = daysLeft(o.licence_end ?? o.trial_end); return d !== null && d <= 14 }).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)' }}>
                    <CheckCircle size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#34D399' }} />
                    <p style={{ fontSize: '0.85rem' }}>Toutes les licences sont à jour ✓</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL EDIT ─── */}
      {editOrg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'white' }}>Gérer l'organisation</h2>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{editOrg.nom}</p>
              </div>
              <button onClick={() => setEditOrg(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[{ id: 'licence', label: '🔑 Licence' }, { id: 'infos', label: '📋 Infos' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{ flex: 1, padding: '14px', fontSize: '0.82rem', fontWeight: '500', border: 'none', background: 'none', color: activeTab === t.id ? '#60A5FA' : 'rgba(255,255,255,0.35)', borderBottom: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeTab === 'licence' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={s.label}>Plan</label>
                      <select value={editForm.plan} onChange={e => setEditForm((p: any) => ({ ...p, plan: e.target.value }))} style={{ ...s.input }}>
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={s.label}>Statut</label>
                      <select value={editForm.statut_compte} onChange={e => setEditForm((p: any) => ({ ...p, statut_compte: e.target.value }))} style={{ ...s.input }}>
                        {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={s.label}>Fin essai</label>
                      <input type="date" value={editForm.trial_end} onChange={e => setEditForm((p: any) => ({ ...p, trial_end: e.target.value }))} style={{ ...s.input }} />
                    </div>
                    <div>
                      <label style={s.label}>Fin licence</label>
                      <input type="date" value={editForm.licence_end} onChange={e => setEditForm((p: any) => ({ ...p, licence_end: e.target.value }))} style={{ ...s.input }} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ ...s.label, marginBottom: '10px' }}>Prolonger rapidement</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[7, 14, 30, 90, 365].map(d => (
                        <button key={d} onClick={() => {
                          const base = editForm.licence_end ? new Date(editForm.licence_end) : new Date()
                          base.setDate(base.getDate() + d)
                          setEditForm((p: any) => ({ ...p, licence_end: base.toISOString().slice(0, 10), statut_compte: 'actif' }))
                        }} style={{ flex: 1, ...s.btn('rgba(37,99,235,0.15)'), color: '#60A5FA' }}>
                          +{d}j
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {activeTab === 'infos' && (
                <>
                  <div>
                    <label style={s.label}>Nom organisation</label>
                    <input value={editForm.nom} onChange={e => setEditForm((p: any) => ({ ...p, nom: e.target.value }))} style={s.input} />
                  </div>
                  <div>
                    <label style={s.label}>Téléphone</label>
                    <input value={editForm.telephone} onChange={e => setEditForm((p: any) => ({ ...p, telephone: e.target.value }))} style={s.input} placeholder="06..." />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setEditOrg(null)} style={{ flex: 1, ...s.btn('rgba(255,255,255,0.05)'), border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '12px' }}>Annuler</button>
              <button onClick={saveEdit} disabled={saving} style={{ flex: 1, ...s.btn('#2563EB'), padding: '12px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
