import { useEffect, useState } from 'react'
import { HardDrive, TriangleAlert } from 'lucide-react'
import { api } from '../api'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** i
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export default function StorageMeter() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api('/admin/storage')
      .then((d) => { if (alive) setData(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  if (failed) {
    return (
      <div className="card storage-card">
        <p className="storage-head"><HardDrive size={16} /> Media storage</p>
        <p className="storage-note">Could not load storage usage.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card storage-card">
        <p className="storage-head"><HardDrive size={16} /> Media storage</p>
        <p className="storage-note">Checking usage…</p>
      </div>
    )
  }

  if (!data.configured) {
    return (
      <div className="card storage-card">
        <p className="storage-head"><HardDrive size={16} /> Media storage</p>
        <p className="storage-note">Cloudinary isn&apos;t set up yet — add its keys to <code>server/.env</code>.</p>
      </div>
    )
  }

  const percent = Number(data.usedPercent) || 0
  const tone = percent >= 90 ? 'danger' : percent >= 75 ? 'warn' : 'ok'

  return (
    <div className="card storage-card">
      <p className="storage-head">
        <HardDrive size={16} /> Media storage
        <span className="storage-plan">{data.plan || 'Free'} plan</span>
      </p>

      <div className="storage-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`storage-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(percent, percent > 0 ? 1.5 : 0))}%` }} />
      </div>

      <p className="storage-meta">
        {formatBytes(data.bytesUsed)} of {formatBytes(data.quotaBytes)} used
        <span className="storage-dot">·</span>
        {data.objects} file{data.objects === 1 ? '' : 's'}
      </p>

      {tone !== 'ok' && (
        <p className={`storage-warn ${tone}`}>
          <TriangleAlert size={14} /> Running low on space — delete unused media.
        </p>
      )}
    </div>
  )
}
