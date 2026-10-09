interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}
declare const SpeechRecognition: { new (): SpeechRecognitionInstance }
declare const webkitSpeechRecognition: { new (): SpeechRecognitionInstance }
interface Window {
  SpeechRecognition?: { new (): SpeechRecognitionInstance }
  webkitSpeechRecognition?: { new (): SpeechRecognitionInstance }
}
