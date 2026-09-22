import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

export default function ReadAloud({ text, className = '' }) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    return () => {
      if (canSpeak()) window.speechSynthesis.cancel()
    }
  }, [])

  if (!canSpeak() || !text) return null

  const stop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const start = () => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.92
    utterance.pitch = 1
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  const toggle = () => {
    if (speaking) stop()
    else start()
  }

  return (
    <button
      type="button"
      className={`read-aloud-btn${speaking ? ' speaking' : ''} ${className}`.trim()}
      onClick={toggle}
      aria-pressed={speaking}
      aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
      title={speaking ? 'Stop reading aloud' : 'Read the text aloud'}
    >
      {speaking ? <VolumeX size={22} /> : <Volume2 size={22} />}
      <span className="nav-label">{speaking ? 'Stop reading' : 'Read aloud'}</span>
    </button>
  )
}