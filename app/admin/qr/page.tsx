export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import type { QRCode, Partner } from '@/types'
import CreateQRForm from '@/components/admin/CreateQRForm'
import QRCard from '@/components/admin/QRCard'

interface QRWithPartner extends QRCode { partner_name: string }

export default async function QRPage() {
  const [{ data: qrCodes }, { data: partners }] = await Promise.all([
    supabaseAdmin.from('qr_codes').select('id,partner_id,slug,label,is_active,created_at').order('created_at', { ascending: false }).returns<QRCode[]>(),
    supabaseAdmin.from('partners').select('id,name,address,contact_name,contact_phone,is_active,created_at').eq('is_active', true).returns<Partner[]>(),
  ])

  const partnerMap = Object.fromEntries((partners ?? []).map((p) => [p.id, p.name]))
  const qrWithPartner: QRWithPartner[] = (qrCodes ?? []).map((q) => ({
    ...q,
    partner_name: partnerMap[q.partner_id] ?? '—',
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">QR Codes</h2>
        <CreateQRForm partners={partners ?? []} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {qrWithPartner.map((qr) => (
          <QRCard
            key={qr.id}
            id={qr.id}
            slug={qr.slug}
            label={qr.label}
            partnerName={qr.partner_name}
            isActive={qr.is_active}
          />
        ))}
        {qrWithPartner.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 py-8">No QR codes yet</p>
        )}
      </div>
    </div>
  )
}
