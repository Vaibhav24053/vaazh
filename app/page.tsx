'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/app/lib/supabase'

type Visit = {
  id: string
  chemist_name: string
  area: string
  products_discussed: string
  outcome: string
  competitor_mention: string | null
  followup_date: string | null
  raw_transcript: string
  created_at: string
}

const outcomeColor: Record<string, string> = {
  'order placed': 'text-emerald-400',
  'interested': 'text-amber-400',
  'follow up needed': 'text-blue-400',
  'not interested': 'text-red-400',
}

const outcomeBg: Record<string, string> = {
  'order placed': 'bg-emerald-400/10 border-emerald-400/20',
  'interested': 'bg-amber-400/10 border-amber-400/20',
  'follow up needed': 'bg-blue-400/10 border-blue-400/20',
  'not interested': 'bg-red-400/10 border-red-400/20',
}

const DEMO_VISITS: Visit[] = [
  {
    id: 'demo-1',
    chemist_name: 'Apollo Chemist',
    area: 'Andheri West',
    products_discussed: 'Zincovit',
    outcome: 'interested',
    competitor_mention: 'Mankind',
    followup_date: 'Thursday',
    raw_transcript: 'Met Ramesh at Apollo Chemist in Andheri West. Interested in Zincovit, wants 3 boxes. Mankind giving 12% margin last week. Follow up Thursday.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    chemist_name: 'Shiv Medical',
    area: 'Thane West',
    products_discussed: 'Calcium tablets',
    outcome: 'not interested',
    competitor_mention: 'Sun Pharma',
    followup_date: null,
    raw_transcript: 'Visited Shiv Medical. Sun Pharma giving 15% discount on calcium tablets. Lost the order. Need to escalate pricing.',
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'demo-3',
    chemist_name: 'MedPlus Borivali',
    area: 'Borivali East',
    products_discussed: 'Shelcal',
    outcome: 'order placed',
    competitor_mention: 'Abbott',
    followup_date: 'Monday',
    raw_transcript: 'MedPlus Borivali ordered 5 boxes of Shelcal. Abbott giving heavy discounts this month.',
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'demo-4',
    chemist_name: 'Noble Chemist',
    area: 'Mulund West',
    products_discussed: 'Zincovit, Shelcal',
    outcome: 'follow up needed',
    competitor_mention: null,
    followup_date: 'Next Tuesday',
    raw_transcript: 'Noble Chemist Mulund. Discussed Zincovit and Shelcal. Owner wants to think about it. Follow up next Tuesday.',
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
]

function WaveBar({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[2px] h-4">
      {[1, 2, 3, 4, 3, 2, 1, 2, 3].map((h, i) => (
        <motion.div
          key={i}
          className={`w-[2px] rounded-full ${active ? 'bg-amber-400' : 'bg-green-500'}`}
          animate={active ? {
            height: [`${h * 3}px`, `${h * 6}px`, `${h * 2}px`, `${h * 5}px`, `${h * 3}px`],
          } : { height: '4px' }}
          transition={{
            duration: 0.8,
            repeat: active ? Infinity : 0,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
          style={{ height: `${h * 3}px` }}
        />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [selected, setSelected] = useState<Visit | null>(null)
  const [pulse, setPulse] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [queryMode, setQueryMode] = useState(false)
  const [query, setQuery] = useState('')
  const [queryAnswer, setQueryAnswer] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [newVisitId, setNewVisitId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (demoMode) {
      setVisits(DEMO_VISITS)
      return
    }

    const loadVisits = async () => {
      const { data } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setVisits(data)
    }
    loadVisits()

    const channel = supabase
      .channel('visits-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'visits'
      }, (payload) => {
        setPulse(true)
        setNewVisitId((payload.new as Visit).id)
        setTimeout(() => setPulse(false), 3000)
        setTimeout(() => setNewVisitId(null), 4000)
        setVisits(prev => [payload.new as Visit, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [demoMode])

  const competitorVisits = visits.filter(v => v.competitor_mention)

  const todayVisits = visits.filter(v => {
    const visitDate = new Date(new Date(v.created_at).getTime() + (5.5 * 60 * 60 * 1000))
    const today = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000))
    return (
      visitDate.getDate() === today.getDate() &&
      visitDate.getMonth() === today.getMonth() &&
      visitDate.getFullYear() === today.getFullYear()
    )
  })

  const handleQuery = async (q?: string) => {
    const finalQuery = q || query
    if (!finalQuery.trim()) return
    if (q) setQuery(q)
    setQueryLoading(true)
    setQueryAnswer('')

    const visitSummary = visits.slice(0, 10).map(v =>
      `- ${v.chemist_name} (${v.area}): ${v.products_discussed}, outcome: ${v.outcome}, competitor: ${v.competitor_mention || 'none'}, followup: ${v.followup_date || 'none'}`
    ).join('\n')

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery, visitSummary })
      })
      const data = await res.json()
      setQueryAnswer(data.answer || 'Could not generate answer.')
    } catch {
      setQueryAnswer('Error processing query.')
    }
    setQueryLoading(false)
  }

  const toggleQuery = () => {
    setQueryMode(!queryMode)
    if (!queryMode) setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white font-mono overflow-hidden">

      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/[0.06] px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <WaveBar active={pulse} />
          <div>
            <span className="text-white font-bold text-base tracking-[0.2em]">VAAZH</span>
            <span className="text-white/20 text-xs ml-3 tracking-widest">FIELD INTELLIGENCE</span>
          </div>
          {demoMode && (
            <span className="text-amber-400 text-[10px] border border-amber-400/30 px-2 py-0.5 rounded-full tracking-widest">
              DEMO
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-[11px] text-white/30">
            <span>
              <span className="text-white/60 font-medium">{todayVisits.length}</span> visits today
            </span>
            <span>
              <span className="text-amber-400 font-medium">{competitorVisits.length}</span> intel flags
            </span>
          </div>

          <button
            onClick={toggleQuery}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-300 border ${
              queryMode
                ? 'bg-blue-400/15 border-blue-400/40 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
          >
            <span className="text-sm">◎</span>
            Ask VaazH
          </button>

          <div className="flex items-center gap-2 text-[11px]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500/70 tracking-widest">LIVE</span>
          </div>
        </div>
      </div>

      {/* Voice Query Panel */}
      <AnimatePresence>
        {queryMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative border-b border-white/[0.06] bg-blue-950/20 backdrop-blur-sm overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="max-w-2xl">
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleQuery()}
                      placeholder="Ask about visits, intel, rep performance..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleQuery()}
                    disabled={queryLoading}
                    className="bg-blue-500/20 border border-blue-400/30 text-blue-300 px-5 py-2.5 rounded-lg text-sm hover:bg-blue-500/30 transition-all disabled:opacity-40 whitespace-nowrap"
                  >
                    {queryLoading ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="inline-block"
                        >◌</motion.span>
                        Thinking
                      </span>
                    ) : 'Ask →'}
                  </button>
                </div>

                <div className="flex gap-2 flex-wrap mb-3">
                  {[
                    "Any competitor intel this week?",
                    "How many visits today?",
                    "Which products were discussed most?",
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => handleQuery(q)}
                      className="text-white/30 text-[11px] border border-white/[0.08] px-2.5 py-1 rounded-full hover:text-white/60 hover:border-white/20 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {queryAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 text-sm text-white/70 leading-relaxed"
                    >
                      <span className="text-blue-400/60 text-xs mr-2">◎</span>
                      {queryAnswer.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex" style={{ height: queryMode ? 'calc(100vh - 130px)' : 'calc(100vh - 61px)' }}>

        {/* Left Panel */}
        <div className="w-[380px] border-r border-white/[0.06] flex flex-col">
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em]">Live Feed</span>
            <span className="text-[10px] text-white/20">{visits.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {visits.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center"
                >
                  <div className="text-white/10 text-4xl mb-3">◎</div>
                  <div className="text-white/15 text-xs">Awaiting field reports...</div>
                </motion.div>
              )}
              {visits.map((visit) => (
                <motion.div
                  key={visit.id}
                  layout
                  initial={{ opacity: 0, x: -24, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => setSelected(visit)}
                  className={`relative p-4 border-b border-white/[0.04] cursor-pointer transition-all duration-200 group
                    ${selected?.id === visit.id
                      ? 'bg-white/[0.05] border-l-2 border-l-amber-400'
                      : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
                    }
                  `}
                >
                  {newVisitId === visit.id && (
                    <motion.div
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 3 }}
                      className="absolute inset-0 bg-amber-400/5 pointer-events-none"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {visit.competitor_mention && (
                          <span className="text-amber-400 text-[10px]">⚑</span>
                        )}
                        <span className="text-white/90 font-medium text-sm truncate group-hover:text-white transition-colors">
                          {visit.chemist_name || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-white/30 text-[11px] truncate mb-1.5">
                        {visit.area}{visit.products_discussed ? ` · ${visit.products_discussed}` : ''}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${outcomeBg[visit.outcome] || 'bg-white/5 border-white/10'} ${outcomeColor[visit.outcome] || 'text-white/30'}`}>
                        {visit.outcome}
                      </span>
                    </div>
                    <div className="text-white/15 text-[10px] whitespace-nowrap mt-0.5">
                      {new Date(visit.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stats Row */}
          <div className="grid grid-cols-3 border-b border-white/[0.06]">
            {[
              { label: 'Total Visits', value: visits.length, color: 'text-white' },
              { label: 'Today', value: todayVisits.length, color: 'text-white' },
              { label: 'Intel Flags', value: competitorVisits.length, color: 'text-amber-400' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-6 border-r border-white/[0.06] last:border-r-0 relative overflow-hidden"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <motion.div
                  key={stat.value}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-4xl font-bold tracking-tight ${stat.color}`}
                >
                  {stat.value}
                </motion.div>
                <div className="text-white/20 text-[10px] mt-1 uppercase tracking-[0.2em]">{stat.label}</div>
                {i === 2 && competitorVisits.length > 0 && (
                  <div className="absolute right-4 top-4 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* Visit Detail */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {selected ? (
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1">{selected.chemist_name}</h2>
                        <div className="text-white/30 text-xs">{selected.area}</div>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-white/20 hover:text-white/60 text-xs transition-colors mt-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: 'Products', value: selected.products_discussed },
                        { label: 'Outcome', value: selected.outcome, colored: true },
                        { label: 'Area', value: selected.area },
                        { label: 'Follow Up', value: selected.followup_date || '—' },
                      ].map((field) => (
                        <div key={field.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                          <div className="text-white/25 text-[10px] uppercase tracking-widest mb-2">{field.label}</div>
                          <div className={`text-sm font-medium ${field.colored ? (outcomeColor[field.value] || 'text-white/70') : 'text-white/80'}`}>
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selected.competitor_mention && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-amber-400/[0.07] border border-amber-400/20 rounded-xl p-4 mb-4 relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                        <div className="text-amber-400/70 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span>⚑</span> Competitor Intel
                        </div>
                        <div className="text-amber-200/80 text-sm font-medium">{selected.competitor_mention}</div>
                      </motion.div>
                    )}

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                      <div className="text-white/20 text-[10px] uppercase tracking-widest mb-3">Raw Transcript</div>
                      <div className="text-white/40 text-xs leading-relaxed">{selected.raw_transcript}</div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center"
                  >
                    <div className="text-center">
                      <motion.div
                        animate={{ opacity: [0.05, 0.12, 0.05] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-7xl mb-4 text-white"
                      >
                        ◎
                      </motion.div>
                      <div className="text-white/15 text-xs tracking-widest uppercase">Select a visit</div>
                      <div className="text-white/10 text-[10px] mt-1">or wait for a field report</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Intel Feed */}
            <div className="w-[220px] border-l border-white/[0.06] flex flex-col">
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <span className="text-amber-400/60 text-[10px]">⚑</span>
                <span className="text-[10px] text-white/20 uppercase tracking-[0.2em]">Intel Feed</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {competitorVisits.length === 0 ? (
                  <div className="p-4 text-white/10 text-xs text-center mt-4">No flags yet</div>
                ) : (
                  competitorVisits.map((v, i) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelected(v)}
                      className="p-3 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="text-amber-400 text-[11px] font-bold mb-1 truncate">
                        {v.competitor_mention}
                      </div>
                      <div className="text-white/30 text-[10px] truncate">{v.chemist_name}</div>
                      <div className="text-white/15 text-[10px] truncate">{v.area}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden demo mode trigger */}
      <button
        onClick={() => setDemoMode(!demoMode)}
        className="fixed bottom-3 right-3 w-2 h-2 rounded-full bg-white/5 hover:bg-amber-400/30 transition-all duration-500"
        title="Demo Mode"
      />
    </div>
  )
}