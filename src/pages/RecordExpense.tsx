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
  const recognitionBaseTextRef = useRef('')
  const recognitionResultsRef = useRef<Array<{ transcript: string; isFinal: boolean }>>([])

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
    return () => recognitionRef.current?.abort()
  }, [])

  const startRecording = () => {
    setError('')
    if (!window.isSecureContext) {
      setError('Microphone access requires a secure connection. Open this app over HTTPS or on localhost.')
      return
    }

    const recognition = createRecognition()
    if (!recognition) {
      setSupported(false)
      setError('Speech-to-text is not supported in this browser. Use the latest Chrome or Edge over HTTPS.')
      return
    }

    recognitionBaseTextRef.current = finalTextRef.current
    recognitionResultsRef.current = []
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => setRecording(true)
    recognition.onresult = (event) => {
      const results = recognitionResultsRef.current
      results.length = event.results.length
      // Keep a copy of each result slot. Browsers may revise an interim slot
      // several times before finalizing it, so appending event text loses or
      // repeats words as the result index moves.
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        results[i] = {
          transcript: event.results[i][0].transcript,
          isFinal: event.results[i].isFinal,
        }
      }
      const finalTranscript = results.filter(result => result?.isFinal).map(result => result.transcript).join(' ').trim()
      const interimTranscript = results.filter(result => result && !result.isFinal).map(result => result.transcript).join(' ').trim()
      finalTextRef.current = [recognitionBaseTextRef.current, finalTranscript].filter(Boolean).join(' ')
      setText([finalTextRef.current, interimTranscript].filter(Boolean).join(' '))
    }
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        'audio-capture': 'No microphone was found. Connect a microphone and check your device input settings.',
        'language-not-supported': 'Speech recognition for English (India) is not supported by this browser.',
        'network': 'The speech recognition service could not be reached. Check your internet connection and try again.',
        'no-speech': 'No speech was detected. Check your microphone input and speak a little closer to it.',
        'not-allowed': 'Microphone access was blocked. Allow microphone access for this site in your browser settings, then try again.',
        'service-not-allowed': 'The browser blocked its speech recognition service. Use the latest Chrome or Edge and allow microphone access.',
      }
      if (event.error !== 'aborted') {
        setRecording(false)
        setError(messages[event.error] ?? `Speech recognition failed (${event.error}). Check microphone permissions and try again.`)
      }
    }
    recognition.onend = () => {
      setRecording(false)
      setText(finalTextRef.current)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err) {
      setRecording(false)
      setError(err instanceof Error ? `Could not start speech recognition: ${err.message}` : 'Could not start speech recognition. Check microphone permissions and try again.')
    }
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const recordAgain = () => {
    recognitionRef.current?.abort()
    setText('')
    finalTextRef.current = ''
    recognitionBaseTextRef.current = ''
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
      recognitionBaseTextRef.current = ''
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
