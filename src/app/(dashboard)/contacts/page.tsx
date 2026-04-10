'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, Phone, Mail, MessageCircle, MoreVertical, Edit, Trash2 } from 'lucide-react'

interface Contact {
  id: string
  phone: string
  name?: string
  email?: string
  avatar?: string
  notes?: string
  isBlocked: boolean
  createdAt: string
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string
    }
  }>
  conversations: Array<{
    id: string
    status: string
    unreadCount: number
    lastMessageAt?: string
  }>
}

interface Tag {
  id: string
  name: string
  color: string
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Buscar contatos
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts')
      if (!res.ok) throw new Error('Erro ao buscar contatos')
      return res.json()
    }
  })

  // Buscar tags
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags')
      if (!res.ok) throw new Error('Erro ao buscar tags')
      return res.json()
    }
  })

  const contacts: Contact[] = contactsData?.contacts || []
  const tags: Tag[] = tagsData?.tags || []

  // Filtrar contatos
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tagId =>
        contact.tags.some(ct => ct.tag.id === tagId)
      )

    return matchesSearch && matchesTags
  })

  // Mutation para criar contato
  const createContactMutation = useMutation({
    mutationFn: async (data: { phone: string; name?: string; email?: string; notes?: string }) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Erro ao criar contato')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowAddModal(false)
    }
  })

  const handleCreateContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const phone = formData.get('phone') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const notes = formData.get('notes') as string

    if (!phone) return

    createContactMutation.mutate({ phone, name: name || undefined, email: email || undefined, notes: notes || undefined })
  }

  const formatPhone = (phone: string) => {
    // Formatar telefone brasileiro
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const getLastMessageDate = (conversations: Contact['conversations']) => {
    if (!conversations.length) return null
    const lastConv = conversations.sort((a, b) =>
      new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
    )[0]
    return lastConv.lastMessageAt ? new Date(lastConv.lastMessageAt).toLocaleDateString('pt-BR') : null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Contatos</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#25d366] hover:bg-[#25d366]/90 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Contato
        </button>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#52525b] w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111113] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
          />
        </div>

        <div className="flex gap-2">
          {tags.slice(0, 5).map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTags(prev =>
                prev.includes(tag.id)
                  ? prev.filter(id => id !== tag.id)
                  : [...prev, tag.id]
              )}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag.id)
                  ? 'bg-opacity-20 text-white border'
                  : 'bg-[#1f1f23] text-[#52525b] hover:text-white'
              }`}
              style={{
                backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                borderColor: selectedTags.includes(tag.id) ? tag.color : undefined
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de contatos */}
      <div className="bg-[#111113] rounded-lg border border-[#1f1f23] overflow-hidden">
        {contactsLoading ? (
          <div className="p-8 text-center text-[#52525b]">Carregando contatos...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-[#52525b]">
            {contacts.length === 0 ? 'Nenhum contato encontrado' : 'Nenhum contato corresponde aos filtros'}
          </div>
        ) : (
          <div className="divide-y divide-[#1f1f23]">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="p-4 hover:bg-[#1a1a1c] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-[#25d366]/20 rounded-full flex items-center justify-center">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name || 'Contato'} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-[#25d366] font-bold text-sm">
                          {(contact.name || contact.phone).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">
                          {contact.name || 'Sem nome'}
                        </h3>
                        {contact.isBlocked && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                            Bloqueado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[#52525b] mt-1">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhone(contact.phone)}
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.conversations.length > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {contact.conversations.length} conversa{contact.conversations.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {contact.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {contact.tags.slice(0, 3).map(({ tag }) => (
                            <span
                              key={tag.id}
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="px-2 py-1 bg-[#1f1f23] text-[#52525b] rounded-full text-xs">
                              +{contact.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#52525b]">
                      {getLastMessageDate(contact.conversations) || 'Nunca conversou'}
                    </span>
                    <button className="p-1 hover:bg-[#1f1f23] rounded">
                      <MoreVertical className="w-4 h-4 text-[#52525b]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de adicionar contato */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111113] rounded-lg border border-[#1f1f23] p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Novo Contato</h2>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Nome do contato"
                  className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Observações
                </label>
                <textarea
                  name="notes"
                  placeholder="Observações sobre o contato..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-[#1f1f23] hover:bg-[#27272a] text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createContactMutation.isPending}
                  className="flex-1 px-4 py-2 bg-[#25d366] hover:bg-[#25d366]/90 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {createContactMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}