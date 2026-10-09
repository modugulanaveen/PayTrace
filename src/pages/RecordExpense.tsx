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
  const [speaking, setSpeaking] = useState(false)
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
  const shouldContinueRef = useRef(false)
  const restartTimerRef = useRef<number | null>(null)
  const startTimeoutRef = useRef<number | null>(null)
  const resultTimeoutRef = useRef<number | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    const hasRecognition = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    setSupported(hasRecognition)
    if (!hasRecognition) setError('This browser does not provide speech recognition. On your phone, tap the statement box and use the microphone on its keyboard to dictate.')
    return () => {
      shouldContinueRef.current = false
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current)
      if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
      if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const startRecording = () => {
    setError('')
    if (!window.isSecureContext) {
      setError('This page is not using HTTPS. Phones block speech recognition on local network addresses such as 192.168.x.x, even when microphone permission is granted. Open the deployed HTTPS address; phone localhost is not your computer.')
      return
    }
    const recognition = createRecognition()
    if (!recognition) {
      setSupported(false)
      setError('Speech recognition is unavailable here. Open this site in Chrome over HTTPS, or tap the statement box and use your phone keyboard microphone.')
      return
    }

    shouldContinueRef.current = true
    recognitionBaseTextRef.current = finalTextRef.current
    recognitionResultsRef.current = []
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => {
      if (recognitionRef.current !== recognition || !shouldContinueRef.current) return
      hasStartedRef.current = true
      if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
      if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = window.setTimeout(() => {
        if (recognitionRef.current === recognition && shouldContinueRef.current) {
          setError('The browser started listening but returned no words. Check internet and Android Speech Services, or use your keyboard microphone to dictate.')
        }
      }, 12000)
      setRecording(true)
      setError('')
    }
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return
      if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
      setError('')
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
      if (recognitionRef.current !== recognition) return
      const messages: Record<string, string> = {
        'audio-capture': 'No microphone was found. Connect a microphone and check your device input settings.',
        'language-not-supported': 'Speech recognition for English (India) is not supported by this browser.',
        'network': 'The browser speech service could not be reached. Check your internet connection; microphone permission alone does not enable speech recognition.',
        'no-speech': 'No speech was detected. Check your microphone input and speak a little closer to it.',
        'not-allowed': 'Browser speech recognition was blocked. Check site and phone microphone permissions. If this page uses a local network HTTP address, open its HTTPS URL instead.',
        'service-not-allowed': 'This browser or its speech service does not allow recognition here. Use the microphone on your phone keyboard to dictate into the statement box.',
      }
      if (event.error !== 'aborted') {
        setError(messages[event.error] ?? `Speech recognition failed (${event.error}). Check microphone permissions and try again.`)
        if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
        if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
        if (event.error !== 'no-speech') {
          shouldContinueRef.current = false
          setRecording(false)
        }
      }
    }
    const armStartTimeout = () => {
      startTimeoutRef.current = window.setTimeout(() => {
        if (recognitionRef.current !== recognition || !shouldContinueRef.current || hasStartedRef.current) return
        shouldContinueRef.current = false
        setRecording(false)
        setError('The phone did not start its speech service. Open this site over HTTPS in Chrome and check that Google Speech Services is available, or use your keyboard microphone to dictate.')
        recognition.abort()
      }, 8000)
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
      if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
      setText(finalTextRef.current)
      if (!shouldContinueRef.current) {
        setRecording(false)
        return
      }

      // Mobile Chrome can end a recognition session after a pause. Start a
      // fresh session while the user still has recording turned on.
      recognitionBaseTextRef.current = finalTextRef.current
      recognitionResultsRef.current = []
      restartTimerRef.current = window.setTimeout(() => {
        if (!shouldContinueRef.current || recognitionRef.current !== recognition) return
        try {
          hasStartedRef.current = false
          recognition.start()
          armStartTimeout()
        } catch (err) {
          shouldContinueRef.current = false
          if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
          setRecording(false)
          setError(err instanceof Error ? `Could not resume speech recognition: ${err.message}` : 'Could not resume speech recognition. Tap Start Recording to try again.')
        }
      }, 250)
    }
    recognitionRef.current = recognition

    try {
      // Start synchronously inside the tap handler. Mobile browsers may reject
      // recognition if microphone setup has awaited first.
      hasStartedRef.current = false
      recognition.start()
      armStartTimeout()
    } catch (err) {
      shouldContinueRef.current = false
      if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
      if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
      setRecording(false)
      setError(err instanceof Error ? `Could not start speech recognition: ${err.message}` : 'Could not start speech recognition. Check microphone permissions and try again.')
    }
  }

  const stopRecording = () => {
    shouldContinueRef.current = false
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current)
    if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
    if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const recordAgain = () => {
    shouldContinueRef.current = false
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current)
    if (startTimeoutRef.current !== null) window.clearTimeout(startTimeoutRef.current)
    if (resultTimeoutRef.current !== null) window.clearTimeout(resultTimeoutRef.current)
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setRecording(false)
    setText('')
    finalTextRef.current = ''
    recognitionBaseTextRef.current = ''
    setType('')
    setError('')
  }

  const usePhoneDictation = () => {
    setError('The statement field is ready. Tap the microphone icon on your phone keyboard to dictate.')
    document.getElementById('statement')?.focus()
  }

  const readBack = () => {
    if (!text.trim()) return
    if (!window.speechSynthesis) {
      setError('Text-to-speech is not available in this browser.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find(voice => voice.lang.toLowerCase() === 'en-in')
      ?? voices.find(voice => voice.lang.toLowerCase().startsWith('en'))
      ?? null
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => {
      setSpeaking(false)
      setError('Could not read the statement aloud. Check that text-to-speech is enabled on your phone.')
    }
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const stopReadBack = () => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
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
          <div><h2>Record Expense</h2><p className="muted">Tap Start Recording and speak naturally. Your browser may process audio for recognition; this app does not store it.</p></div>
          <span className="privacy-badge">Text only</span>
        </div>

        <div className={`record-box ${recording ? 'recording' : ''}`}>
          <div className="wave-row" aria-hidden="true">
            {[16,28,42,24,52,34,18,38,26,46,20].map((height, index) => <span key={index} style={{ height }} />)}
          </div>
          <button className={`mic ${recording ? 'mic-recording' : ''}`} onClick={recording ? stopRecording : startRecording} disabled={!supported} aria-label={recording ? 'Stop recording' : 'Start recording'}>
            {recording ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}
          </button>
          <h3>{recording ? 'Recording…' : text ? 'Recording stopped' : 'Ready to record'}</h3>
          <p className="muted">{recording ? 'Speak naturally, then press Stop Recording.' : 'Press Start Recording when you are ready.'}</p>
          <p className="phone-voice-hint">On a phone, open the HTTPS site in Chrome. Local network HTTP addresses can block recognition even after microphone access is allowed.</p>
          <button className={recording ? 'stop-button' : 'primary'} onClick={recording ? stopRecording : startRecording} disabled={!supported}>
            {recording ? <><Square size={16} fill="currentColor" /> STOP RECORDING</> : <><Mic size={16} /> START RECORDING</>}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="field">
          <div className="field-title"><label htmlFor="statement">Recorded Statement</label>{text && <span>Current date will be saved automatically</span>}<button type="button" className="secondary phone-dictation" onClick={usePhoneDictation}><Mic size={15} /> Use phone voice typing</button></div>
          <textarea id="statement" value={text} onChange={(e) => { setText(e.target.value); finalTextRef.current = e.target.value }} placeholder="Your converted statement will appear here…" rows={5} />
        </div>

        {text && <div className="action-row">
          <button className="secondary" onClick={speaking ? stopReadBack : readBack}>{speaking ? <Square size={16} /> : <Volume2 size={17} />} {speaking ? 'Stop Reading' : 'Read It Back'}</button>
          <button className="secondary" onClick={recordAgain}><RotateCcw size={17} /> Clear & Start Over</button>
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
        <p className="save-note">The current date and time are saved automatically. Audio is not stored by this app.</p>
      </div>
    </div>
  )
}
