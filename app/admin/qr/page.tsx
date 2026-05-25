import { supabaseAdmin } from '@/lib/supabase'
import type { QRCode, Partner } from '@/types'
import CreateQRForm from '@/components/admin/CreateQRForm'

interface QRWithPartner extends QRCode {
  partner_name: string
}

export default async function QRPage() {
  const [{ data: qrCodes }, { data: partners }] = await Promise.all([
    supabaseAdmin.from('qr_codes').select().order('created_at', { ascending: false }).returns<QRCode[]>(),
    supabaseAdmin.from('partners').select().eq('is_active', true).returns<Partner[]>(),
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {qrWithPartner.map((qr) => (
          <div key={qr.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{qr.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{qr.partner_name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${qr.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                {qr.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex justify-center bg-white rounded-xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/image?slug=${qr.slug}`}
                alt={`QR ${qr.label}`}
                className="w-32 h-32"
              />
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono text-center truncate">{qr.slug}</div>
            <a
              href={`/api/qr/image?slug=${qr.slug}`}
              download={`qr-${qr.slug}.png`}
              className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Télécharger le QR
            </a>
          </div>
        ))}
        {qrWithPartner.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-8">Aucun QR code</p>
        )}
      </div>
    </div>
  )
}
