'use client'

import { useState } from 'react'

interface Contact { id: string; phone: string; name?: string }
interface Card {
  id: string; contactId: string; contact: Contact
  lastMessage?: string; lastMessageAt?: string
  unreadCount: number; assigneeName?: string
}
interface Column { id: string; title: string; color: string; cards: Card[] }

function Avatar({ name, size = 32 }: { name?: string; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#25d366']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.37, fontWeight: 600, color: 'white' }}>
      {initials}
    </div>
  )
}

function formatTime(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const INITIAL_COLUMNS: Column[] = [
  {
    id: 'NEW', title: 'Novo', color: '#3b82f6',
    cards: [
      { id: '1', contactId: 'c1', contact: { id: 'c1', phone: '+5511999990001', name: 'João Silva' }, lastMessage: 'Olá, preciso de ajuda!', lastMessageAt: new Date().toISOString(), unreadCount: 2 },
      { id: '2', contactId: 'c2', contact: { id: 'c2', phone: '+5511999990002', name: 'Maria Souza' }, lastMessage: 'Quando meu pedido chega?', lastMessageAt: new Date(Date.now() - 300000).toISOString(), unreadCount: 1 },
    ],
  },
  {
    id: 'IN_PROGRESS', title: 'Em Atendimento', color: '#f59e0b',
    cards: [
      { id: '3', contactId: 'c3', contact: { id: 'c3', phone: '+5511999990003', name: 'Carlos Lima' }, lastMessage: 'Vou verificar agora...', lastMessageAt: new Date(Date.now() - 600000).toISOString(), unreadCount: 0, assigneeName: 'Agente Ana' },
      { id: '4', contactId: 'c4', contact: { id: 'c4', phone: '+5511999990004', name: 'Fernanda Costa' }, lastMessage: 'Obrigada pela atenção!', lastMessageAt: new Date(Date.now() - 1200000).toISOString(), unreadCount: 0, assigneeName: 'Agente Pedro' },
    ],
  },
  {
    id: 'WAITING', title: 'Aguardando', color: '#8b5cf6',
    cards: [
      { id: '5', contactId: 'c5', contact: { id: 'c5', phone: '+5511999990005', name: 'Roberto Alves' }, lastMessage: 'Aguardando retorno...', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0 },
    ],
  },
  {
    id: 'RESOLVED', title: 'Resolvido', color: '#25d366',
    cards: [
      { id: '6', contactId: 'c6', contact: { id: 'c6', phone: '+5511999990006', name: 'Lucia Martins' }, lastMessage: 'Problema resolvido!', lastMessageAt: new Date(Date.now() - 7200000).toISOString(), unreadCount: 0 },
    ],
  },
]

export default function KanbanPage() {
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS)
  const [dragging, setDragging] = useState<{ cardId: string; fromCol: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  function onDragStart(cardId: string, fromCol: string) {
    setDragging({ cardId, fromCol })
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    setDragOver(colId)
  }

  function onDrop(toColId: string) {
    if (!dragging || dragging.fromCol === toColId) {
      setDragging(null); setDragOver(null); return
    }
    setColumns(prev => {
      const next = prev.map(col => ({ ...col, cards: [...col.cards] }))
      const fromCol = next.find(c => c.id === dragging.fromCol)!
      const toCol = next.find(c => c.id === toColId)!
      const cardIdx = fromCol.cards.findIndex(c => c.id === dragging.cardId)
      const [card] = fromCol.cards.splice(cardIdx, 1)
      toCol.cards.push(card)
      // TODO: chamar PATCH /api/conversations/:id { kanbanCol: toColId }
      return next
    })
    setDragging(null); setDragOver(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23]">
        <div>
          <h1 className="text-white font-semibold text-lg">Kanban</h1>
          <p className="text-[#71717a] text-xs mt-0.5">Arraste as conversas entre as colunas</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar contato..."
            className="px-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]/50 w-48"
          />
          <button className="px-3 py-1.5 bg-[#25d366] hover:bg-[#1da851] text-white text-sm font-medium rounded-lg transition-colors">
            + Nova conversa
          </button>
        </div>
      </div>

      {/* Colunas */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(col => (
            <div
              key={col.id}
              className={`flex flex-col w-72 rounded-xl transition-colors ${dragOver === col.id ? 'bg-[#25d366]/5' : ''}`}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={() => onDrop(col.id)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Cabeçalho da coluna */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                <h2 className="text-sm font-semibold text-[#d4d4d8]">{col.title}</h2>
                <span className="ml-auto text-xs bg-[#27272a] text-[#71717a] px-2 py-0.5 rounded-full">
                  {col.cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                {col.cards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => onDragStart(card.id, col.id)}
                    className={`bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-[#3f3f46] transition-all select-none ${dragging?.cardId === card.id ? 'opacity-40 scale-95' : ''}`}
                  >
                    {/* Topo do card */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <Avatar name={card.contact.name || card.contact.phone} size={34} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {card.contact.name || card.contact.phone}
                        </p>
                        <p className="text-[#52525b] text-xs truncate">{card.contact.phone}</p>
                      </div>
                      {card.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {card.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Última mensagem */}
                    {card.lastMessage && (
                      <p className="text-[#71717a] text-xs line-clamp-2 mb-2.5 leading-relaxed">
                        {card.lastMessage}
                      </p>
                    )}

                    {/* Footer do card */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#52525b] text-[11px]">{formatTime(card.lastMessageAt)}</span>
                      {card.assigneeName ? (
                        <span className="flex items-center gap-1 text-[11px] text-[#71717a]">
                          <div className="w-4 h-4 rounded-full bg-[#6366f1] flex items-center justify-center text-[8px] text-white font-bold">
                            {card.assigneeName[0]}
                          </div>
                          {card.assigneeName.replace('Agente ', '')}
                        </span>
                      ) : (
                        <button className="text-[11px] text-[#52525b] hover:text-[#25d366] transition-colors">
                          + Atribuir
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Drop zone vazia */}
                {col.cards.length === 0 && (
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragOver === col.id ? 'border-[#25d366]/50 bg-[#25d366]/5' : 'border-[#27272a]'
                  }`}>
                    <p className="text-[#52525b] text-xs">Arraste aqui</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
