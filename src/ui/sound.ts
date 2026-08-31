let audioContext: AudioContext | null = null

export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  const browserWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
  const AudioContextConstructor = browserWindow.AudioContext || browserWindow.webkitAudioContext
  if (!AudioContextConstructor) return
  audioContext ||= new AudioContextConstructor()
  if (audioContext.state === 'suspended') void audioContext.resume()
}

export function playContinuationTone(): void {
  if (!audioContext) return
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(740, now)
  oscillator.frequency.setValueAtTime(980, now + 0.12)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.36)
}
