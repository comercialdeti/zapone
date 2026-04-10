'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Settings, MessageSquare, Users, BarChart3, Shield, Key, Webhook } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  waPhoneNumberId?: string
  waBusinessAccountId?: string
  waAccessToken?: string
  waWebhookSecret?: string
  createdAt: string
  updatedAt: string
  _count: {
    users: number
    contacts: number
    conversations: number
    messages: number
  }
}

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    name: '',
    waPhoneNumberId: '',
    waBusinessAccountId: '',
    waAccessToken: '',
    waWebhookSecret: ''
  })
  const queryClient = useQueryClient()

  // Buscar configurações
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Erro ao buscar configurações')
      return res.json()
    },
    onSuccess: (data) => {
      const tenant: Tenant = data.tenant
      setFormData({
        name: tenant.name,
        waPhoneNumberId: tenant.waPhoneNumberId || '',
        waBusinessAccountId: tenant.waBusinessAccountId || '',
        waAccessToken: tenant.waAccessToken || '',
        waWebhookSecret: tenant.waWebhookSecret || ''
      })
    }
  })

  const tenant: Tenant | undefined = settingsData?.tenant

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Erro ao atualizar configurações')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSettingsMutation.mutate(formData)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const planColors = {
    FREE: 'bg-gray-500',
    STARTER: 'bg-blue-500',
    PRO: 'bg-purple-500',
    ENTERPRISE: 'bg-green-500'
  }

  const planNames = {
    FREE: 'Gratuito',
    STARTER: 'Starter',
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise'
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-[#52525b]">Carregando configurações...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-[#25d366]" />
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estatísticas */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#111113] rounded-lg border border-[#1f1f23] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Visão Geral</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#25d366]" />
                  <span className="text-[#52525b]">Usuários</span>
                </div>
                <span className="text-white font-medium">{tenant?._count.users || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#25d366]" />
                  <span className="text-[#52525b]">Contatos</span>
                </div>
                <span className="text-white font-medium">{tenant?._count.contacts || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#25d366]" />
                  <span className="text-[#52525b]">Conversas</span>
                </div>
                <span className="text-white font-medium">{tenant?._count.conversations || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#25d366]" />
                  <span className="text-[#52525b]">Mensagens</span>
                </div>
                <span className="text-white font-medium">{tenant?._count.messages || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111113] rounded-lg border border-[#1f1f23] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Plano Atual</h3>

            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${planColors[tenant?.plan as keyof typeof planColors] || 'bg-gray-500'}`} />
              <span className="text-white font-medium">
                {planNames[tenant?.plan as keyof typeof planNames] || tenant?.plan}
              </span>
            </div>

            <p className="text-[#52525b] text-sm mt-2">
              Criado em {tenant ? new Date(tenant.createdAt).toLocaleDateString('pt-BR') : ''}
            </p>
          </div>
        </div>

        {/* Configurações */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Gerais */}
            <div className="bg-[#111113] rounded-lg border border-[#1f1f23] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Informações Gerais
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#52525b] mb-1">
                    Slug (URL)
                  </label>
                  <input
                    type="text"
                    value={tenant?.slug || ''}
                    disabled
                    className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-[#52525b] cursor-not-allowed"
                  />
                  <p className="text-xs text-[#52525b] mt-1">
                    O slug não pode ser alterado
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Business API */}
            <div className="bg-[#111113] rounded-lg border border-[#1f1f23] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#25d366]" />
                WhatsApp Business API
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={formData.waPhoneNumberId}
                    onChange={(e) => handleInputChange('waPhoneNumberId', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
                    placeholder="123456789012345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Business Account ID
                  </label>
                  <input
                    type="text"
                    value={formData.waBusinessAccountId}
                    onChange={(e) => handleInputChange('waBusinessAccountId', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366]"
                    placeholder="123456789012345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={formData.waAccessToken}
                    onChange={(e) => handleInputChange('waAccessToken', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366] font-mono text-sm"
                    placeholder="EAA..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Webhook Secret
                  </label>
                  <input
                    type="password"
                    value={formData.waWebhookSecret}
                    onChange={(e) => handleInputChange('waWebhookSecret', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f0f10] border border-[#1f1f23] rounded-lg text-white placeholder-[#52525b] focus:outline-none focus:border-[#25d366] font-mono text-sm"
                    placeholder="seu_webhook_secret"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-[#1a1a1c] rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">Como configurar:</h4>
                <ol className="text-sm text-[#52525b] space-y-1 list-decimal list-inside">
                  <li>Acesse <a href="https://developers.facebook.com" className="text-[#25d366] hover:underline" target="_blank" rel="noopener noreferrer">Facebook Developers</a></li>
                  <li>Crie um app do WhatsApp Business</li>
                  <li>Configure o webhook para apontar para seu domínio</li>
                  <li>Copie os valores acima do painel do Facebook</li>
                </ol>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="flex items-center gap-2 bg-[#25d366] hover:bg-[#25d366]/90 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}