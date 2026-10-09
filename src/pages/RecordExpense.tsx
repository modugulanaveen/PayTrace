import { Mic, Square, RotateCcw, Volume2, Check, Pencil, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractAmount, saveExpense, type TransactionType } from '../lib/expenses'

type Selection = TransactionType | ''

function createRecognition() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export default function RecordExpense() {
  const [recording, setRecording] = useState(false)
  const [text, setText] = useState('')
  const [type, setType] = useState<Selection>('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalTextRef = useRef('')

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
    return () => recognitionRef.current?.abort()
  }, [])

  const startRecording = () => {
    setError('')
    const recognition = createRecognition()
    if (!recognition) {
      setSupported(false)
      setError('Speech-to-text is not supported in this browser. Please use a supported browser such as Chrome.')
      return
    }

    finalTextRef.current = text
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => setRecording(true)
    recognition.onresult = (event) => {
      let interim = ''
      let finalPart = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalPart += transcript
        else interim += transcript
      }
      if (finalPart) finalTextRef.current = `${finalTextRef.current} ${finalPart}`.trim()
      setText(`${finalTextRef.current}${interim ? ` ${interim}` : ''}`.trim())
    }
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') setError(`Microphone error: ${event.error}. Please try again.`)
    }
    recognition.onend = () => setRecording(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const recordAgain = () => {
    recognitionRef.current?.abort()
    setText('')
    finalTextRef.current = ''
    setType('')
    setError('')
    setTimeout(startRecording, 100)
  }

  const readBack = () => {
    if (!text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    window.speechSynthesis.speak(utterance)
  }

  const confirmAndSave = async () => {
    if (!text.trim() || !type) return
    setSaving(true)
    setError('')
    try {
      await saveExpense(text, type, extractAmount(text))
      setText('')
      finalTextRef.current = ''
      setType('')
      navigate('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content">
      <div className="section record-page">
        <div className="record-heading">
          <div><h2>Record Expense</h2><p className="muted">Speak naturally. The audio is never saved.</p></div>
          <span className="privacy-badge">Text only</span>
        </div>

        <div className={`record-box ${recording ? 'recording' : ''}`}>
          <div className="wave-row" aria-hidden="true">
            {[16,28,42,24,52,34,18,38,26,46,20].map((height, index) => <span key={index} style={{ height }} />)}
          </div>
          <button className={`mic ${recording ? 'mic-recording' : ''}`} onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop recording' : 'Start recording'}>
            {recording ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}
          </button>
          <h3>{recording ? 'Recording…' : text ? 'Recording stopped' : 'Ready to record'}</h3>
          <p className="muted">{recording ? 'Speak clearly, then press Stop Recording.' : 'Press Start Recording when you are ready.'}</p>
          <button className={recording ? 'stop-button' : 'primary'} onClick={recording ? stopRecording : startRecording} disabled={!supported}>
            {recording ? <><Square size={16} fill="currentColor" /> STOP RECORDING</> : <><Mic size={16} /> START RECORDING</>}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="field">
          <div className="field-title"><label htmlFor="statement">Recorded Statement</label>{text && <span>Current date will be saved automatically</span>}</div>
          <textarea id="statement" value={text} onChange={(e) => { setText(e.target.value); finalTextRef.current = e.target.value }} placeholder="Your converted statement will appear here…" rows={5} />
        </div>

        {text && <div className="action-row">
          <button className="secondary" onClick={readBack}><Volume2 size={17} /> Read It Back</button>
          <button className="secondary" onClick={recordAgain}><RotateCcw size={17} /> Record Again</button>
          <button className="secondary" onClick={() => document.getElementById('statement')?.focus()}><Pencil size={17} /> Edit Text</button>
        </div>}

        <div className="type-section">
          <label>What happened?</label>
          <div className="type-grid">
            <button className={`type-card paid ${type === 'PAID' ? 'selected' : ''}`} onClick={() => setType('PAID')}><span>✓</span><div><strong>PAID</strong><small>Paid on behalf of the company</small></div></button>
            <button className={`type-card taken ${type === 'TAKEN' ? 'selected' : ''}`} onClick={() => setType('TAKEN')}><span>↓</span><div><strong>TAKEN</strong><small>Money taken from the company</small></div></button>
          </div>
        </div>

        <button className="confirm-button" disabled={!text.trim() || !type || saving} onClick={confirmAndSave}>{saving ? <><LoaderCircle size={18} className="spin" /> Saving…</> : <><Check size={18} /> Confirm & Save</>}</button>
        <p className="save-note">The current date and time are saved automatically. Audio is never stored.</p>
      </div>
    </div>
  )
}
