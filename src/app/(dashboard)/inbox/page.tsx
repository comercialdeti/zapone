'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Contact { id: string; phone: string; name?: string; avatar?: string }
interface Message {
  id: string; content: string; direction: 'INBOUND' | 'OUTBOUND'
  sentAt: string; status?: string
  sender?: { name: string; avatar?: string }
}
interface Conversation {
  id: string; status: string; unreadCount: number; lastMessageAt?: string
  contact: Contact
  assignments?: { user: { id: string; name: string } }[]
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'mine', label: 'Meus' },
  { key: 'open', label: 'Abertos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'resolved', label: 'Resolvidos' },
]

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#25d366']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.38, fontWeight: 600, color: 'white' }}>
      {initials}
    </div>
  )
}

// ─── Formato de hora ──────────────────────────────────────────────────────────

function formatTime(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Carrega conversas (mock inicial)
  useEffect(() => {
    const mock: Conversation[] = [
      { id: '1', status: 'OPEN', unreadCount: 3, lastMessageAt: new Date().toISOString(), contact: { id: 'c1', phone: '+5511999990001', name: 'João Silva' } },
      { id: '2', status: 'OPEN', unreadCount: 0, lastMessageAt: new Date(Date.now() - 300000).toISOString(), contact: { id: 'c2', phone: '+5511999990002', name: 'Maria Souza' } },
      { id: '3', status: 'PENDING', unreadCount: 1, lastMessageAt: new Date(Date.now() - 1800000).toISOString(), contact: { id: 'c3', phone: '+5511999990003', name: 'Carlos Lima' } },
      { id: '4', status: 'OPEN', unreadCount: 0, lastMessageAt: new Date(Date.now() - 7200000).toISOString(), contact: { id: 'c4', phone: '+5511999990004', name: 'Ana Paula' } },
      { id: '5', status: 'RESOLVED', unreadCount: 0, lastMessageAt: new Date(Date.now() - 86400000).toISOString(), contact: { id: 'c5', phone: '+5511999990005' } },
    ]
    setConversations(mock)
  }, [])

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Carrega mensagens da conversa selecionada
  function selectConversation(conv: Conversation) {
    setSelected(conv)
    const mock: Message[] = [
      { id: 'm1', content: 'Olá! Preciso de ajuda com meu pedido.', direction: 'INBOUND', sentAt: new Date(Date.now() - 600000).toISOString() },
      { id: 'm2', content: 'Olá! Claro, pode me informar o número do pedido?', direction: 'OUTBOUND', sentAt: new Date(Date.now() - 540000).toISOString(), sender: { name: 'Agente' } },
      { id: 'm3', content: 'Meu pedido é #12345', direction: 'INBOUND', sentAt: new Date(Date.now() - 480000).toISOString() },
      { id: 'm4', content: 'Encontrei seu pedido! Ele está em separação e será enviado amanhã. 📦', direction: 'OUTBOUND', sentAt: new Date(Date.now() - 420000).toISOString(), sender: { name: 'Agente' } },
      { id: 'm5', content: 'Ótimo, obrigado!', direction: 'INBOUND', sentAt: new Date(Date.now() - 360000).toISOString() },
    ]
    setMessages(mock)
    // Marca como lido
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c))
  }

  async function sendMessage() {
    if (!text.trim() || !selected || sending) return
    setSending(true)
    const newMsg: Message = {
      id: Date.now().toString(),
      content: text.trim(),
      direction: 'OUTBOUND',
      sentAt: new Date().toISOString(),
      status: 'SENT',
      sender: { name: 'Você' },
    }
    setMessages(prev => [...prev, newMsg])
    setText('')
    // TODO: chamar API real: POST /api/messages
    setSending(false)
  }

  const filtered = conversations.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter.toUpperCase() || (filter === 'mine')
    const matchSearch = !search || c.contact.name?.toLowerCase().includes(search.toLowerCase()) || c.contact.phone.includes(search)
    return matchFilter && matchSearch
  })

  return (
    <div className="flex h-full">
      {/* ── Lista de conversas ─────────────────────────────────────── */}
      <div className="w-80 flex flex-col border-r border-[#1f1f23] bg-[#111113]">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-semibold text-lg">Inbox</h1>
            <span className="text-xs bg-[#25d366]/15 text-[#25d366] px-2 py-0.5 rounded-full font-medium">
              {conversations.filter(c => c.unreadCount > 0).length} novo{conversations.filter(c => c.unreadCount > 0).length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Busca */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]/50"
            />
          </div>
          {/* Filtros */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.key
                    ? 'bg-[#25d366]/15 text-[#25d366]'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-4 py-3 border-b border-[#1f1f23] flex items-center gap-3 transition-colors ${
                selected?.id === conv.id ? 'bg-[#25d366]/8' : 'hover:bg-[#18181b]'
              }`}
            >
              <div className="relative">
                <Avatar name={conv.contact.name || conv.contact.phone} size={40} />
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-white' : 'text-[#d4d4d8]'}`}>
                    {conv.contact.name || conv.contact.phone}
                  </span>
                  <span className="text-[11px] text-[#52525b] flex-shrink-0 ml-1">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
                    {conv.contact.phone}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                    conv.status === 'OPEN' ? 'bg-green-500/10 text-green-400' :
                    conv.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    {conv.status === 'OPEN' ? 'aberto' : conv.status === 'PENDING' ? 'pendente' : 'resolvido'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Área de chat ───────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Header do chat */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1f1f23] bg-[#111113]">
            <Avatar name={selected.contact.name || selected.contact.phone} size={36} />
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{selected.contact.name || selected.contact.phone}</p>
              <p className="text-[#71717a] text-xs">{selected.contact.phone}</p>
            </div>
            {/* Ações */}
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white rounded-lg transition-colors">
                Resolver
              </button>
              <button className="px-3 py-1.5 text-xs bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white rounded-lg transition-colors">
                Atribuir
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-[#52525b] hover:text-white hover:bg-[#27272a] rounded-lg transition-colors">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                {msg.direction === 'INBOUND' && (
                  <div className="mr-2 mt-1">
                    <Avatar name={selected.contact.name} size={28} />
                  </div>
                )}
                <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.direction === 'OUTBOUND'
                    ? 'bg-[#25d366] text-white rounded-br-sm'
                    : 'bg-[#18181b] text-[#e4e4e7] rounded-bl-sm'
                }`}>
                  <p>{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'OUTBOUND' ? 'justify-end' : ''}`}>
                    <span className={`text-[11px] ${msg.direction === 'OUTBOUND' ? 'text-white/60' : 'text-[#52525b]'}`}>
                      {formatTime(msg.sentAt)}
                    </span>
                    {msg.direction === 'OUTBOUND' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.6">
                        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensagem */}
          <div className="px-4 py-3 border-t border-[#1f1f23] bg-[#111113]">
            <div className="flex items-end gap-2 bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2">
              <button className="text-[#52525b] hover:text-[#25d366] transition-colors pb-0.5">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
              </button>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Digite uma mensagem... (Enter para enviar)"
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-[#52525b] resize-none focus:outline-none max-h-32"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="w-8 h-8 flex items-center justify-center bg-[#25d366] hover:bg-[#1da851] disabled:opacity-40 rounded-lg transition-colors flex-shrink-0"
              >
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Estado vazio */
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#25d366]/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" fill="none" stroke="#25d366" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <p className="text-[#d4d4d8] font-medium">Selecione uma conversa</p>
          <p className="text-[#52525b] text-sm mt-1">Escolha uma conversa para começar a atender</p>
        </div>
      )}
    </div>
  )
}
