'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { RiGhostLine, RiShieldKeyholeLine, RiFireLine, RiHeart3Fill, RiHeart3Line, RiChat3Line, RiFlagLine, RiSendPlane2Fill, RiRefreshLine, RiTrophyLine, RiBarChartBoxLine, RiUserLine, RiEyeOffLine, RiShieldCheckLine, RiSparklingLine, RiMegaphoneLine, RiTimeLine, RiCloseLine, RiCheckLine, RiAlertLine, RiThumbUpLine, RiThumbUpFill } from 'react-icons/ri'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Confession {
  id: string
  text: string
  category: string
  likes: number
  comments: number
  timestamp: number
  username: string
}

interface ChatMessage {
  id: string
  username: string
  text: string
  timestamp: number
  isOwn: boolean
}

interface ModerationResult {
  is_safe: boolean
  toxicity_score: number
  categories: string[]
  action: string
  reason: string
  cleaned_text: string
  confidence: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_ID = '69995dd80ab3a50ca24853e5'

const CATEGORIES = ['Crush', 'Academic', 'Rant', 'Funny', 'Secret', 'Advice'] as const

const CATEGORY_COLORS: Record<string, string> = {
  Crush: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  Academic: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Rant: 'bg-red-500/20 text-red-300 border-red-500/30',
  Funny: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Secret: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Advice: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

const ALIAS_PREFIXES = ['Shadow', 'Ghost', 'Phantom', 'Specter', 'Wraith', 'Shade', 'Mist', 'Whisper', 'Echo', 'Drift', 'Cipher', 'Veil', 'Haze', 'Flicker', 'Nimbus']

function generateAlias(): string {
  const prefix = ALIAS_PREFIXES[Math.floor(Math.random() * ALIAS_PREFIXES.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}_${num}`
}

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getAvatarColor(name: string): string {
  const colors = ['bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const INITIAL_CONFESSIONS: Confession[] = [
  { id: '1', text: 'I still think about my freshman year roommate every day. We lost touch after sophomore year and I regret not staying connected.', category: 'Secret', likes: 47, comments: 12, timestamp: Date.now() - 3600000, username: 'Shadow_7392' },
  { id: '2', text: 'The library 3rd floor is the best nap spot on campus. Fight me.', category: 'Funny', likes: 89, comments: 23, timestamp: Date.now() - 7200000, username: 'Ghost_1847' },
  { id: '3', text: 'I switched my major three times and I finally found something I love. Dont give up if youre struggling.', category: 'Advice', likes: 124, comments: 31, timestamp: Date.now() - 10800000, username: 'Phantom_5531' },
  { id: '4', text: 'To the person who returns my water bottle to the lost and found every week — you are my hero.', category: 'Crush', likes: 67, comments: 8, timestamp: Date.now() - 18000000, username: 'Specter_2249' },
  { id: '5', text: 'Professor Thompsons organic chemistry class is actually not that bad if you go to office hours. Trust me.', category: 'Academic', likes: 56, comments: 15, timestamp: Date.now() - 25200000, username: 'Wraith_8814' },
  { id: '6', text: 'I eat cereal for dinner at least 4 times a week and Im not even ashamed anymore.', category: 'Rant', likes: 203, comments: 45, timestamp: Date.now() - 36000000, username: 'Shade_6673' },
]

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'c1', username: 'Shadow_7392', text: 'Anyone else pulling an all-nighter for the calc exam?', timestamp: Date.now() - 300000, isOwn: false },
  { id: 'c2', username: 'Ghost_1847', text: 'The dining hall pizza today was actually decent for once', timestamp: Date.now() - 240000, isOwn: false },
  { id: 'c3', username: 'Phantom_5531', text: 'Has anyone taken CS301? Is it as hard as people say?', timestamp: Date.now() - 180000, isOwn: false },
  { id: 'c4', username: 'Specter_2249', text: 'Just found out my crush is in my study group. Universe is testing me.', timestamp: Date.now() - 120000, isOwn: false },
  { id: 'c5', username: 'Wraith_8814', text: 'The campus sunset tonight was unreal. Wish I could share a pic here.', timestamp: Date.now() - 60000, isOwn: false },
]

// ─── ErrorBoundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[#a78bfa] mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-500 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sub-components (defined as functions, NOT exported) ─────────────────────

function ModerationBanner({ result, onDismiss }: { result: ModerationResult | null; onDismiss: () => void }) {
  if (!result) return null

  const actionColor = result.action === 'approve'
    ? 'border-emerald-500/40 bg-emerald-500/10'
    : result.action === 'flag'
    ? 'border-yellow-500/40 bg-yellow-500/10'
    : 'border-red-500/40 bg-red-500/10'

  const actionIcon = result.action === 'approve'
    ? <RiCheckLine className="w-5 h-5 text-emerald-400" />
    : result.action === 'flag'
    ? <RiAlertLine className="w-5 h-5 text-yellow-400" />
    : <RiCloseLine className="w-5 h-5 text-red-400" />

  const actionLabel = result.action === 'approve'
    ? 'Content Approved'
    : result.action === 'flag'
    ? 'Content Flagged'
    : 'Content Rejected'

  const toxicityBarColor = result.toxicity_score < 0.3
    ? 'bg-emerald-500'
    : result.toxicity_score < 0.6
    ? 'bg-yellow-500'
    : 'bg-red-500'

  const cats = Array.isArray(result.categories) ? result.categories : []

  return (
    <div className={`sw-slide-up rounded-xl border p-4 mb-4 ${actionColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {actionIcon}
          <span className="font-semibold text-sm text-white">{actionLabel}</span>
          <span className="text-xs text-[#c4b5fd]">Confidence: {((result.confidence ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <button onClick={onDismiss} className="text-[#a78bfa] hover:text-white transition-colors">
          <RiCloseLine className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-[#c4b5fd] mb-1">
          <span>Toxicity Score</span>
          <span>{((result.toxicity_score ?? 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${toxicityBarColor}`}
            style={{ width: `${(result.toxicity_score ?? 0) * 100}%` }}
          />
        </div>
      </div>

      {cats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {cats.map((cat, i) => (
            <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-[#c4b5fd] border border-white/10">
              {cat}
            </span>
          ))}
        </div>
      )}

      {result.reason && (
        <p className="text-xs text-[#a78bfa] mt-1">{result.reason}</p>
      )}
    </div>
  )
}

function ConfessionCard({
  confession,
  isLiked,
  onLike,
  onReport,
  animateLikeId,
  showHotBadge,
}: {
  confession: Confession
  isLiked: boolean
  onLike: () => void
  onReport: () => void
  animateLikeId: string | null
  showHotBadge?: boolean
}) {
  const catClass = CATEGORY_COLORS[confession.category] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'

  return (
    <div className="sw-glass sw-neon-hover rounded-xl p-4 transition-all duration-300">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(confession.username)}`}>
          <RiGhostLine className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-medium text-[#c4b5fd]">{confession.username}</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full border ${catClass}`}>
              {confession.category}
            </span>
            {showHotBadge && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 sw-badge-pulse">
                <RiFireLine className="w-3 h-3" />
                HOT
              </span>
            )}
            <span className="text-[10px] text-[#a78bfa]/60 ml-auto flex items-center gap-1">
              <RiTimeLine className="w-3 h-3" />
              {getRelativeTime(confession.timestamp)}
            </span>
          </div>
          <p className="text-sm text-white/90 leading-relaxed mb-3">{confession.text}</p>
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className="flex items-center gap-1.5 text-xs transition-all duration-200 group"
            >
              <span className={animateLikeId === confession.id ? 'sw-like-bounce' : ''}>
                {isLiked ? (
                  <RiHeart3Fill className="w-4 h-4 text-pink-400" />
                ) : (
                  <RiHeart3Line className="w-4 h-4 text-[#a78bfa] group-hover:text-pink-400 transition-colors" />
                )}
              </span>
              <span className={isLiked ? 'text-pink-400' : 'text-[#a78bfa] group-hover:text-pink-400'}>{confession.likes}</span>
            </button>
            <span className="flex items-center gap-1.5 text-xs text-[#a78bfa]">
              <RiChat3Line className="w-4 h-4" />
              {confession.comments}
            </span>
            <button
              onClick={onReport}
              className="flex items-center gap-1 text-xs text-[#a78bfa] hover:text-red-400 transition-colors ml-auto"
            >
              <RiFlagLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] sw-typing-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] sw-typing-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] sw-typing-dot" />
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="sw-glass rounded-xl p-4 flex flex-col items-center gap-2 sw-neon-hover transition-all">
      <div className="text-purple-400">{icon}</div>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-[#a78bfa]">{label}</span>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'wall' | 'chat' | 'trending' | 'profile'>('wall')

  // User identity
  const [username, setUsername] = useState('')

  // Confession state
  const [confessions, setConfessions] = useState<Confession[]>(INITIAL_CONFESSIONS)
  const [newConfession, setNewConfession] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Secret')
  const [isPosting, setIsPosting] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [animateLikeId, setAnimateLikeId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('All')

  // Moderation
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null)
  const [moderationStatus, setModerationStatus] = useState<string>('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const [showTyping, setShowTyping] = useState(false)

  // Report state
  const [reportStatus, setReportStatus] = useState<{ id: string; message: string } | null>(null)
  const [reportLoading, setReportLoading] = useState<string | null>(null)

  // Profile stats
  const [myPostCount, setMyPostCount] = useState(0)
  const [myLikesReceived, setMyLikesReceived] = useState(0)

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const confessionIdCounter = useRef(100)

  // Initialize username
  useEffect(() => {
    setUsername(generateAlias())
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, showTyping])

  // Auto-dismiss moderation for approvals
  useEffect(() => {
    if (moderationResult?.action === 'approve') {
      const timer = setTimeout(() => {
        setModerationResult(null)
        setModerationStatus('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [moderationResult])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handlePost = useCallback(async () => {
    if (!newConfession.trim() || isPosting) return

    setIsPosting(true)
    setModerationResult(null)
    setModerationStatus('Moderating content with AI...')
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(newConfession.trim(), AGENT_ID)
      setActiveAgentId(null)

      if (result.success) {
        const data = result?.response?.result
        const modResult: ModerationResult = {
          is_safe: data?.is_safe ?? true,
          toxicity_score: data?.toxicity_score ?? 0,
          categories: Array.isArray(data?.categories) ? data.categories : [],
          action: data?.action ?? 'approve',
          reason: data?.reason ?? '',
          cleaned_text: data?.cleaned_text ?? newConfession.trim(),
          confidence: data?.confidence ?? 0,
        }
        setModerationResult(modResult)

        if (modResult.action === 'approve') {
          const newId = String(confessionIdCounter.current++)
          const newPost: Confession = {
            id: newId,
            text: modResult.cleaned_text || newConfession.trim(),
            category: selectedCategory,
            likes: 0,
            comments: 0,
            timestamp: Date.now(),
            username: username,
          }
          setConfessions(prev => [newPost, ...prev])
          setMyPostCount(prev => prev + 1)
          setNewConfession('')
          setModerationStatus('Content approved and posted!')
        } else if (modResult.action === 'flag') {
          const newId = String(confessionIdCounter.current++)
          const newPost: Confession = {
            id: newId,
            text: modResult.cleaned_text || newConfession.trim(),
            category: selectedCategory,
            likes: 0,
            comments: 0,
            timestamp: Date.now(),
            username: username,
          }
          setConfessions(prev => [newPost, ...prev])
          setMyPostCount(prev => prev + 1)
          setNewConfession('')
          setModerationStatus('Content flagged but posted with warnings.')
        } else {
          setModerationStatus('Content rejected. Please revise your post.')
        }
      } else {
        setModerationStatus('Moderation check failed. Please try again.')
      }
    } catch {
      setModerationStatus('An error occurred. Please try again.')
      setActiveAgentId(null)
    }

    setIsPosting(false)
  }, [newConfession, isPosting, selectedCategory, username])

  const handleLike = useCallback((id: string) => {
    setAnimateLikeId(id)
    setTimeout(() => setAnimateLikeId(null), 400)

    setLikedPosts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    setConfessions(prev =>
      prev.map(c => {
        if (c.id === id) {
          const isLiked = likedPosts.has(id)
          return { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1 }
        }
        return c
      })
    )
  }, [likedPosts])

  const handleReport = useCallback(async (confession: Confession) => {
    if (reportLoading) return

    setReportLoading(confession.id)
    setReportStatus(null)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(confession.text, AGENT_ID)
      setActiveAgentId(null)

      if (result.success) {
        const data = result?.response?.result
        const action = data?.action ?? 'approve'
        const reason = data?.reason ?? 'No issues found.'

        if (action === 'reject') {
          setConfessions(prev => prev.filter(c => c.id !== confession.id))
          setReportStatus({ id: confession.id, message: `Post removed: ${reason}` })
        } else if (action === 'flag') {
          setReportStatus({ id: confession.id, message: `Post flagged for review: ${reason}` })
        } else {
          setReportStatus({ id: confession.id, message: `No violation found: ${reason}` })
        }
      } else {
        setReportStatus({ id: confession.id, message: 'Report failed. Try again.' })
      }
    } catch {
      setReportStatus({ id: confession.id, message: 'Report failed. Try again.' })
      setActiveAgentId(null)
    }

    setReportLoading(null)
    setTimeout(() => setReportStatus(null), 4000)
  }, [reportLoading])

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || isSendingChat) return

    setIsSendingChat(true)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(chatInput.trim(), AGENT_ID)
      setActiveAgentId(null)

      if (result.success) {
        const data = result?.response?.result
        const action = data?.action ?? 'approve'

        if (action === 'reject') {
          setChatMessages(prev => [...prev, {
            id: `sys-${Date.now()}`,
            username: 'System',
            text: `Message blocked: ${data?.reason ?? 'Content policy violation'}`,
            timestamp: Date.now(),
            isOwn: false,
          }])
        } else {
          const cleanedText = data?.cleaned_text ?? chatInput.trim()
          setChatMessages(prev => [...prev, {
            id: `msg-${Date.now()}`,
            username: username,
            text: cleanedText,
            timestamp: Date.now(),
            isOwn: true,
          }])
          setMyPostCount(prev => prev + 1)

          // Simulate a reply after a brief delay
          setShowTyping(true)
          setTimeout(() => {
            setShowTyping(false)
            const replies = [
              'Totally relate to that!',
              'Haha thats so real',
              'Has anyone else experienced this?',
              'Campus life hits different at 2am',
              'Facts. Nothing but facts.',
            ]
            setChatMessages(prev => [...prev, {
              id: `reply-${Date.now()}`,
              username: generateAlias(),
              text: replies[Math.floor(Math.random() * replies.length)],
              timestamp: Date.now(),
              isOwn: false,
            }])
          }, 2000)
        }
      } else {
        setChatMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          username: 'System',
          text: 'Failed to send. Please try again.',
          timestamp: Date.now(),
          isOwn: false,
        }])
      }
    } catch {
      setChatMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        username: 'System',
        text: 'Network error. Please try again.',
        timestamp: Date.now(),
        isOwn: false,
      }])
      setActiveAgentId(null)
    }

    setChatInput('')
    setIsSendingChat(false)
  }, [chatInput, isSendingChat, username])

  const refreshUsername = useCallback(() => {
    setUsername(generateAlias())
  }, [])

  // ─── Derived Data ───────────────────────────────────────────────────────

  const displayConfessions = showSampleData ? confessions : confessions.filter(c => c.username === username)
  const filteredConfessions = filterCategory === 'All'
    ? displayConfessions
    : displayConfessions.filter(c => c.category === filterCategory)

  const trendingConfessions = [...confessions].sort((a, b) => b.likes - a.likes)

  const categoryStats = CATEGORIES.map(cat => {
    const count = confessions.filter(c => c.category === cat).length
    return { category: cat, count }
  }).sort((a, b) => b.count - a.count)

  const maxCatCount = Math.max(...categoryStats.map(c => c.count), 1)
  const totalLikes = confessions.reduce((sum, c) => sum + c.likes, 0)
  const mostPopularCat = categoryStats[0]?.category ?? 'N/A'

  const displayChatMessages = showSampleData ? chatMessages : chatMessages.filter(m => m.isOwn || m.username === 'System')

  // ─── Tab Config ─────────────────────────────────────────────────────────

  const tabs = [
    { id: 'wall' as const, label: 'Wall', icon: <RiMegaphoneLine className="w-4 h-4" /> },
    { id: 'chat' as const, label: 'Chat', icon: <RiChat3Line className="w-4 h-4" /> },
    { id: 'trending' as const, label: 'Trending', icon: <RiFireLine className="w-4 h-4" /> },
    { id: 'profile' as const, label: 'Profile', icon: <RiUserLine className="w-4 h-4" /> },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden sw-dot-grid">
        {/* Floating gradient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] sw-orb-drift" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-cyan-600/10 blur-[100px] sw-orb-drift" style={{ animationDelay: '-7s' }} />
          <div className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-pink-600/8 blur-[100px] sw-orb-drift" style={{ animationDelay: '-14s' }} />
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 sw-glass-strong">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center sw-pulse-glow">
                <RiShieldKeyholeLine className="w-4.5 h-4.5 text-white" />
              </div>
              <h1 className="text-lg font-bold sw-gradient-text">Secret Wall</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Sample Data toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#a78bfa] hidden sm:inline">Sample Data</span>
                <button
                  onClick={() => setShowSampleData(prev => !prev)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${showSampleData ? 'bg-purple-600' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${showSampleData ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Username */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <RiEyeOffLine className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span className="text-xs text-[#c4b5fd] font-medium">{username || 'Anonymous'}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${activeTab === tab.id ? 'bg-purple-600/30 text-purple-300 shadow-lg shadow-purple-500/10' : 'text-[#a78bfa] hover:bg-white/5 hover:text-white'}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-4xl mx-auto px-4 pt-28 pb-8 sw-scrollbar" style={{ minHeight: '100vh' }}>

          {/* ─── WALL TAB ─── */}
          {activeTab === 'wall' && (
            <div className="space-y-4 sw-slide-up">
              {/* Confession Composer */}
              <div className="sw-glass-strong rounded-2xl p-5 sw-gradient-border">
                <div className="flex items-center gap-2 mb-3">
                  <RiSparklingLine className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">Share Anonymously</span>
                </div>

                <textarea
                  value={newConfession}
                  onChange={(e) => setNewConfession(e.target.value)}
                  placeholder="What's on your mind? Your identity stays hidden..."
                  maxLength={500}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#a78bfa]/50 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                />

                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 text-[11px] rounded-full border transition-all duration-200 ${selectedCategory === cat ? CATEGORY_COLORS[cat] + ' ring-1 ring-white/20' : 'border-white/10 text-[#a78bfa]/70 hover:border-white/20 hover:text-[#a78bfa]'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <span className={`text-[11px] ${newConfession.length > 450 ? 'text-red-400' : 'text-[#a78bfa]/50'}`}>
                    {newConfession.length}/500
                  </span>
                </div>

                <button
                  onClick={handlePost}
                  disabled={!newConfession.trim() || isPosting}
                  className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-2"
                >
                  {isPosting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Moderating...
                    </>
                  ) : (
                    <>
                      <RiSendPlane2Fill className="w-4 h-4" />
                      Post Anonymously
                    </>
                  )}
                </button>

                {/* Moderation status text */}
                {moderationStatus && (
                  <p className="mt-2 text-xs text-[#a78bfa] text-center">{moderationStatus}</p>
                )}
              </div>

              {/* Moderation Result Banner */}
              <ModerationBanner
                result={moderationResult}
                onDismiss={() => { setModerationResult(null); setModerationStatus(''); }}
              />

              {/* Report Status */}
              {reportStatus && (
                <div className="sw-slide-up rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300 flex items-center gap-2">
                  <RiAlertLine className="w-4 h-4 flex-shrink-0" />
                  {reportStatus.message}
                </div>
              )}

              {/* Category Filter */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterCategory('All')}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${filterCategory === 'All' ? 'bg-purple-600/30 text-purple-300 border-purple-500/30' : 'border-white/10 text-[#a78bfa]/60 hover:border-white/20'}`}
                >
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${filterCategory === cat ? CATEGORY_COLORS[cat] : 'border-white/10 text-[#a78bfa]/60 hover:border-white/20'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Confession Feed */}
              {filteredConfessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <RiGhostLine className="w-16 h-16 text-[#a78bfa]/30 mb-4 sw-float" />
                  <p className="text-[#a78bfa]/60 text-sm">No confessions yet. Be the first to share!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConfessions.map((confession, idx) => (
                    <div key={confession.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <ConfessionCard
                        confession={confession}
                        isLiked={likedPosts.has(confession.id)}
                        onLike={() => handleLike(confession.id)}
                        onReport={() => handleReport(confession)}
                        animateLikeId={animateLikeId}
                      />
                      {reportLoading === confession.id && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-[#a78bfa] pl-12">
                          <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                          Checking with AI moderator...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── CHAT TAB ─── */}
          {activeTab === 'chat' && (
            <div className="sw-slide-up flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
              {/* Disclaimer */}
              <div className="flex items-center gap-2 py-2 px-3 mb-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <RiShieldCheckLine className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <p className="text-[11px] text-[#c4b5fd]">Messages are anonymous and moderated by AI</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto sw-scrollbar space-y-3 pr-1">
                {displayChatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.isOwn ? 'order-1' : 'order-1'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                        {!msg.isOwn && (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${msg.username === 'System' ? 'bg-yellow-500/30' : getAvatarColor(msg.username)}`}>
                            {msg.username === 'System' ? (
                              <RiAlertLine className="w-3 h-3 text-yellow-300" />
                            ) : (
                              <RiGhostLine className="w-3 h-3 text-white" />
                            )}
                          </div>
                        )}
                        <span className="text-[10px] text-[#a78bfa]/60">{msg.username}</span>
                        <span className="text-[10px] text-[#a78bfa]/40">{getRelativeTime(msg.timestamp)}</span>
                      </div>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${msg.isOwn ? 'bg-purple-600/40 text-white rounded-tr-sm border border-purple-500/30' : msg.username === 'System' ? 'bg-yellow-500/10 text-yellow-200 border border-yellow-500/20 rounded-tl-sm' : 'sw-glass text-white/90 rounded-tl-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}

                {showTyping && (
                  <div className="flex justify-start">
                    <div className="sw-glass rounded-2xl rounded-tl-sm px-3 py-2">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="mt-3 flex gap-2">
                <div className="flex-1 sw-gradient-border rounded-xl">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                    placeholder="Type a message..."
                    maxLength={300}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-[#a78bfa]/40 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 flex items-center justify-center"
                >
                  {isSendingChat ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <RiSendPlane2Fill className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── TRENDING TAB ─── */}
          {activeTab === 'trending' && (
            <div className="space-y-6 sw-slide-up">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<RiMegaphoneLine className="w-6 h-6" />}
                  label="Total Confessions"
                  value={confessions.length}
                />
                <StatCard
                  icon={<RiUserLine className="w-6 h-6" />}
                  label="Active Users"
                  value={Math.floor(confessions.length * 12.7)}
                />
                <StatCard
                  icon={<RiTrophyLine className="w-6 h-6" />}
                  label="Most Popular"
                  value={mostPopularCat}
                />
              </div>

              {/* Category Breakdown */}
              <div className="sw-glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <RiBarChartBoxLine className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Category Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {categoryStats.map(stat => {
                    const barWidth = maxCatCount > 0 ? (stat.count / maxCatCount) * 100 : 0
                    const catColor = CATEGORY_COLORS[stat.category] ?? ''
                    const barColorMap: Record<string, string> = {
                      Crush: 'bg-pink-500',
                      Academic: 'bg-blue-500',
                      Rant: 'bg-red-500',
                      Funny: 'bg-yellow-500',
                      Secret: 'bg-purple-500',
                      Advice: 'bg-emerald-500',
                    }
                    return (
                      <div key={stat.category}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] ${catColor}`}>{stat.category}</span>
                          <span className="text-[#a78bfa]">{stat.count} posts</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full sw-bar-grow ${barColorMap[stat.category] ?? 'bg-purple-500'}`}
                            style={{ '--bar-width': `${barWidth}%`, width: `${barWidth}%` } as React.CSSProperties}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[#a78bfa]">
                  <span>Total Likes Across All Posts</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    <RiHeart3Fill className="w-3.5 h-3.5 text-pink-400" />
                    {totalLikes}
                  </span>
                </div>
              </div>

              {/* Top Confessions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <RiFireLine className="w-5 h-5 text-orange-400" />
                  <h3 className="text-sm font-semibold text-white">Top Confessions</h3>
                </div>
                <div className="space-y-3">
                  {trendingConfessions.slice(0, 5).map((confession, idx) => (
                    <ConfessionCard
                      key={confession.id}
                      confession={confession}
                      isLiked={likedPosts.has(confession.id)}
                      onLike={() => handleLike(confession.id)}
                      onReport={() => handleReport(confession)}
                      animateLikeId={animateLikeId}
                      showHotBadge={idx < 3}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <div className="space-y-5 sw-slide-up">
              {/* Profile Card */}
              <div className="sw-glass-strong rounded-2xl p-6 text-center sw-neon-hover">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 sw-pulse-glow">
                  <RiGhostLine className="w-10 h-10 text-white" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-lg font-bold sw-gradient-text">{username || 'Anonymous'}</h2>
                  <button
                    onClick={refreshUsername}
                    className="text-[#a78bfa] hover:text-purple-300 transition-colors"
                    title="Generate new alias"
                  >
                    <RiRefreshLine className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#a78bfa]">Anonymous Identity</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<RiMegaphoneLine className="w-5 h-5" />}
                  label="Posts Made"
                  value={myPostCount}
                />
                <StatCard
                  icon={<RiHeart3Fill className="w-5 h-5" />}
                  label="Likes Received"
                  value={myLikesReceived}
                />
                <StatCard
                  icon={<RiTimeLine className="w-5 h-5" />}
                  label="Days Active"
                  value={1}
                />
              </div>

              {/* My Posts */}
              <div className="sw-glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <RiMegaphoneLine className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Your Posts</h3>
                </div>
                {confessions.filter(c => c.username === username).length === 0 ? (
                  <div className="text-center py-8">
                    <RiGhostLine className="w-10 h-10 text-[#a78bfa]/20 mx-auto mb-2" />
                    <p className="text-xs text-[#a78bfa]/50">You have not posted anything yet. Go to The Wall to share!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {confessions.filter(c => c.username === username).map(confession => (
                      <ConfessionCard
                        key={confession.id}
                        confession={confession}
                        isLiked={likedPosts.has(confession.id)}
                        onLike={() => handleLike(confession.id)}
                        onReport={() => handleReport(confession)}
                        animateLikeId={animateLikeId}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="sw-glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <RiEyeOffLine className="w-4 h-4 text-[#a78bfa]" />
                      <span className="text-sm text-[#c4b5fd]">Dark Mode</span>
                    </div>
                    <div className="w-10 h-5 rounded-full bg-purple-600 relative cursor-not-allowed">
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <RiShieldCheckLine className="w-4 h-4 text-[#a78bfa]" />
                      <span className="text-sm text-[#c4b5fd]">Content Filter (High)</span>
                    </div>
                    <div className="w-10 h-5 rounded-full bg-purple-600 relative cursor-not-allowed">
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Moderation Info */}
              <div className="sw-glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <RiShieldKeyholeLine className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">AI Content Moderation</h3>
                </div>
                <div className="space-y-2 text-xs text-[#c4b5fd] leading-relaxed">
                  <p>Every post and message is analyzed by our AI moderation agent before appearing on the platform.</p>
                  <p>The system checks for toxicity, hate speech, bullying, and other harmful content. Content is scored on a 0-1 scale and either approved, flagged, or rejected.</p>
                  <p>When flagged, content may be posted with a censored version. Rejected content is blocked with an explanation.</p>
                </div>
              </div>

              {/* About */}
              <div className="sw-glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <RiSparklingLine className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">About Secret Wall</h3>
                </div>
                <p className="text-xs text-[#c4b5fd] leading-relaxed">
                  Secret Wall is a university-exclusive anonymous social platform. Share confessions, chat with peers, and express yourself freely — all while staying completely anonymous. Your identity is never stored or tracked. Every interaction is moderated by AI to keep the community safe and respectful.
                </p>
              </div>
            </div>
          )}

          {/* ─── Agent Status ─── */}
          <div className="mt-8 sw-glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <RiShieldCheckLine className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Agent Status</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-emerald-400 animate-pulse' : 'bg-[#a78bfa]/40'}`} />
              <div className="flex-1">
                <p className="text-xs text-[#c4b5fd]">Content Moderation Agent</p>
                <p className="text-[10px] text-[#a78bfa]/50 font-mono">{AGENT_ID}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeAgentId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-[#a78bfa]/50 border border-white/10'}`}>
                {activeAgentId ? 'Processing' : 'Idle'}
              </span>
            </div>
          </div>

        </main>
      </div>
    </ErrorBoundary>
  )
}
