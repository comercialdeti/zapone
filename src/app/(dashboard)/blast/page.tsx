'use client'

import { useState } from 'react'

interface Campaign {
  id: string; name: string; message: string
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'FAILED'
  totalCount: number; sentCount: number; failedCount: number
  scheduledAt?: string; createdAt: string
}

const STATUS_MAP = {
  DRAFT: { label: 'Rascunho', color: 'text-zinc-400 bg-zinc-500/10' },
  SCHEDULED: { label: 'Agendado', color: 'text-blue-400 bg-blue-500/10' },
  RUNNING: { label: 'Enviando', color: 'text-yellow-400 bg-yellow-500/10' },
  FINISHED: { label: 'Concluído', color: 'text-green-400 bg-green-500/10' },
  FAILED: { label: 'Falhou', color: 'text-red-400 bg-red-500/10' },
}

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Promoção Black Friday', message: 'Aproveite 50% OFF em todos os produtos! 🔥', status: 'FINISHED', totalCount: 1500, sentCount: 1487, failedCount: 13, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '2', name: 'Lembrete de renovação', message: 'Seu plano vence em 7 dias. Renove agora!', status: 'SCHEDULED', totalCount: 230, sentCount: 0, failedCount: 0, scheduledAt: new Date(Date.now() + 3600000 * 5).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', name: 'Boas-vindas novos clientes', message: 'Bem-vindo à ZapOne! 🎉 Estamos aqui para ajudar.', status: 'DRAFT', totalCount: 50, sentCount: 0, failedCount: 0, createdAt: new Date().toISOString() },
]

export default function BlastPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', message: '', phones: '', scheduledAt: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const phones = form.phones.split('\n').map(p => p.trim()).filter(Boolean)
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: form.name,
      message: form.message,
      status: form.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      totalCount: phones.length,
      sentCount: 0, failedCount: 0,
      scheduledAt: form.scheduledAt || undefined,
      createdAt: new Date().toISOString(),
    }
    setCampaigns(prev => [newCampaign, ...prev])
    setForm({ name: '', message: '', phones: '', scheduledAt: '' })
    setCreating(false)
    // TODO: POST /api/blast
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f23]">
        <div>
          <h1 className="text-white font-semibold text-lg">Disparos em Massa</h1>
          <p className="text-[#71717a] text-xs mt-0.5">Envie mensagens para listas de contatos</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-[#25d366] hover:bg-[#1da851] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Nova Campanha
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats rápidos */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total enviados', value: '1.487', icon: '📤' },
            { label: 'Taxa de entrega', value: '99.1%', icon: '✅' },
            { label: 'Agendados', value: '1', icon: '🕐' },
            { label: 'Campanhas', value: campaigns.length.toString(), icon: '📊' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-[#71717a] text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de campanhas */}
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const pct = campaign.totalCount > 0 ? Math.round((campaign.sentCount / campaign.totalCount) * 100) : 0
            const st = STATUS_MAP[campaign.status]
            return (
              <div key={campaign.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 hover:border-[#3f3f46] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium truncate">{campaign.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-[#71717a] text-sm truncate mb-3">{campaign.message}</p>

                    {/* Progress bar */}
                    {campaign.status !== 'DRAFT' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-[#52525b]">
                          <span>{campaign.sentCount} enviados</span>
                          <span>{campaign.totalCount} total</span>
                        </div>
                        <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#25d366] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {campaign.failedCount > 0 && (
                          <p className="text-red-400 text-xs">{campaign.failedCount} falhas</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[#52525b] text-xs">
                      {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    {campaign.scheduledAt && (
                      <p className="text-blue-400 text-xs mt-1">
                        ⏰ {new Date(campaign.scheduledAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 justify-end">
                      {campaign.status === 'DRAFT' && (
                        <button className="text-xs px-2.5 py-1 bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 rounded-lg transition-colors">
                          Disparar
                        </button>
                      )}
                      <button className="text-xs px-2.5 py-1 bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46] rounded-lg transition-colors">
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal criação */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a]">
              <h2 className="text-white font-semibold">Nova Campanha</h2>
              <button onClick={() => setCreating(false)} className="text-[#52525b] hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1.5">Nome da campanha</label>
                <input type="text" required placeholder="Ex: Promoção de Natal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272a] rounded-lg text-white text-sm placeholder-[#52525b] focus:outline-none focus:border-[#25d366]/50" />
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1.5">Mensagem</label>
                <textarea required placeholder="Digite a mensagem que será enviada..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272a] rounded-lg text-white text-sm placeholder-[#52525b] focus:outline-none focus:border-[#25d366]/50 resize-none" />
                <p className="text-[#52525b] text-xs mt-1">{form.message.length} caracteres</p>
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1.5">Números de telefone <span className="text-[#52525b]">(um por linha)</span></label>
                <textarea required placeholder="+5511999990001&#10;+5511999990002&#10;+5511999990003" value={form.phones} onChange={e => setForm(f => ({ ...f, phones: e.target.value }))} rows={4}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272a] rounded-lg text-white text-sm placeholder-[#52525b] focus:outline-none focus:border-[#25d366]/50 resize-none font-mono" />
                <p className="text-[#52525b] text-xs mt-1">{form.phones.split('\n').filter(p => p.trim()).length} contatos</p>
              </div>
              <div>
                <label className="block text-sm text-[#a1a1aa] mb-1.5">Agendar para <span className="text-[#52525b]">(opcional)</span></label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#111113] border border-[#27272a] rounded-lg text-white text-sm focus:outline-none focus:border-[#25d366]/50" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreating(false)} className="flex-1 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#25d366] hover:bg-[#1da851] text-white text-sm font-semibold rounded-lg transition-colors">
                  {form.scheduledAt ? 'Agendar' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
