/**
 * ZapOne - Worker de Disparo em Massa
 * Processa fila de mensagens com rate limiting e agendamento
 */

import { Worker, Queue, QueueEvents } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { sendTextMessage, sendMediaMessage } from '@/lib/whatsapp'

// ─── Filas ────────────────────────────────────────────────────────────────────

export const blastQueue = new Queue('blast', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export const blastQueueEvents = new QueueEvents('blast', { connection: redis })

// ─── Worker ───────────────────────────────────────────────────────────────────

export function startBlastWorker() {
  const worker = new Worker(
    'blast',
    async (job) => {
      const { campaignId, recipientId, phone, message, mediaUrl, phoneNumberId, accessToken } =
        job.data

      try {
        // Envia a mensagem
        if (mediaUrl) {
          await sendMediaMessage({
            phoneNumberId,
            accessToken,
            to: phone,
            type: 'image',
            mediaUrl,
            caption: message,
          })
        } else {
          await sendTextMessage({
            phoneNumberId,
            accessToken,
            to: phone,
            text: message,
          })
        }

        // Atualiza status do destinatário
        await prisma.blastRecipient.update({
          where: { id: recipientId },
          data: { status: 'SENT', sentAt: new Date() },
        })

        // Incrementa contador
        await prisma.blastCampaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        })
      } catch (error) {
        // Marca como falhou
        await prisma.blastRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          },
        })

        await prisma.blastCampaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        })

        throw error
      }
    },
    {
      connection: redis,
      concurrency: 5, // 5 mensagens simultâneas
      limiter: {
        max: 80,      // máx 80 mensagens
        duration: 60000, // por minuto (respeita limites da Meta)
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`[Blast] Job ${job.id} concluído - ${job.data.phone}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Blast] Job ${job?.id} falhou:`, err.message)
  })

  return worker
}

// ─── Agendar campanha ─────────────────────────────────────────────────────────

export async function scheduleCampaign(campaignId: string, scheduledAt?: Date) {
  const campaign = await prisma.blastCampaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true, tenant: true },
  })

  if (!campaign) throw new Error('Campanha não encontrada')
  if (!campaign.tenant.waPhoneNumberId || !campaign.tenant.waAccessToken) {
    throw new Error('WhatsApp não configurado para este tenant')
  }

  const delay = scheduledAt
    ? Math.max(0, scheduledAt.getTime() - Date.now())
    : 0

  // Adiciona cada destinatário na fila
  const jobs = campaign.recipients.map((recipient) => ({
    name: 'send-blast',
    data: {
      campaignId: campaign.id,
      recipientId: recipient.id,
      phone: recipient.phone,
      message: campaign.message,
      mediaUrl: campaign.mediaUrl,
      phoneNumberId: campaign.tenant.waPhoneNumberId,
      accessToken: campaign.tenant.waAccessToken,
    },
    opts: {
      delay,
      jobId: `blast-${campaign.id}-${recipient.id}`,
    },
  }))

  await blastQueue.addBulk(jobs)

  // Atualiza status da campanha
  await prisma.blastCampaign.update({
    where: { id: campaignId },
    data: {
      status: scheduledAt ? 'SCHEDULED' : 'RUNNING',
      scheduledAt: scheduledAt || null,
      startedAt: scheduledAt ? null : new Date(),
    },
  })
}
