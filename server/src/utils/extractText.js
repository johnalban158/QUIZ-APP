import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

// Extract readable text from an uploaded source document.
// Supports: TXT, PDF (pdf-parse), DOCX (mammoth), PPTX (zip + slide XML).
// Legacy .ppt (OLE binary) cannot be parsed without heavy deps - we store
// the file but skip question generation for it with a clear message.
export async function extractSourceText(filePath, mimetype, originalName = '') {
  const ext = (path.extname(originalName || filePath) || '').toLowerCase()

  if (mimetype === 'text/plain' || ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8')
  }

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    const { default: pdfParse } = await import('pdf-parse')
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const { default: mammoth } = await import('mammoth')
    const { value } = await mammoth.extractRawText({ path: filePath })
    return value || ''
  }

  if (
    mimetype ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    ext === '.pptx'
  ) {
    const buffer = fs.readFileSync(filePath)
    const zip = await JSZip.loadAsync(buffer)
    const slideFiles = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort()
    let texts = []
    for (const name of slideFiles) {
      const xml = await zip.files[name].async('string')
      // Slide text lives in <a:t>…</a:t> nodes.
      const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || []
      const slideText = matches
        .map((m) => m.replace(/<\/?a:t>/g, ''))
        .join(' ')
        .trim()
      if (slideText) texts.push(slideText)
    }
    // Also pull shared strings / notes as fallback.
    if (texts.length === 0) {
      const shared = zip.files['ppt/sharedStrings.xml']
      if (shared) {
        const xml = await shared.async('string')
        const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || []
        const t = matches.map((m) => m.replace(/<\/?a:t>/g, '')).join(' ').trim()
        if (t) texts.push(t)
      }
    }
    return texts.join('\n\n')
  }

  if (mimetype === 'application/vnd.ms-powerpoint' || ext === '.ppt') {
    const err = new Error(
      'Legacy .ppt cannot be auto-parsed. Please re-save as .pptx for question generation. The file is still stored on the module.'
    )
    err.code = 'LEGACY_PPT'
    throw err
  }

  return ''
}

function splitSentences(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 280)
    .filter((s) => /[a-zA-Z]{4,}/.test(s))
    .slice(0, 200)
}

function collectKeywords(text) {
  const words = (text.match(/[A-Za-z][A-Za-z-]{5,}/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => !/^(about|after|before|between|could|should|would|their|there|these|those|which|while|with|from|that|this|have|has|were|been|also)$/.test(w))
  const freq = new Map()
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Heuristic fill-in-the-blank generator (no AI needed).
// Picks a long keyword from a key sentence, blanks it, and builds 4 options
// with exactly one correct answer so it passes normalizeOptions validation.
export function buildDraftQuestions(text, count = 8) {
  const sentences = splitSentences(text)
  const keywords = collectKeywords(text)
  if (sentences.length === 0 || keywords.length < 4) return []

  const drafts = []
  const used = new Set()
  for (const sentence of shuffle(sentences)) {
    if (drafts.length >= count) break
    const candidates = (sentence.match(/[A-Za-z][A-Za-z-]{5,}/g) || [])
      .map((w) => w.toLowerCase())
      .filter((w) => keywords.includes(w) && !used.has(sentence + w))
    if (candidates.length === 0) continue
    const answer = candidates.sort((a, b) => b.length - a.length)[0]
    const distractors = shuffle(keywords.filter((k) => k !== answer)).slice(0, 3)
    if (distractors.length < 3) continue
    const blanked = sentence.replace(new RegExp(answer, 'i'), '____')
    const options = shuffle([
      { text: answer, isCorrect: true },
      ...distractors.map((d) => ({ text: d, isCorrect: false })),
    ])
    drafts.push({ text: `Fill in the blank: ${blanked}`, options })
    used.add(sentence + answer)
  }
  return drafts
}
