import type { SoundModel } from '@/types'

function ctx() {
  return new AudioContext()
}

/** Sino de balcão de metal — batida seca + overtones inarmônicos longos */
function playBalcao() {
  const ac = ctx()
  const t  = ac.currentTime

  // Partials de um sino de serviço real (inarmônicos, como metal percutido)
  // [frequência, volume relativo, decaimento em segundos]
  const partials: [number, number, number][] = [
    [2637, 0.55, 1.8],  // fundamental brilhante
    [3951, 0.30, 1.2],  // 3/2 do fundamental
    [5274, 0.18, 0.9],  // 2x
    [7040, 0.10, 0.6],  // brilho metálico alto
    [1319, 0.20, 2.4],  // sub-tom de ressonância
  ]

  // Ruído de impacto curtíssimo (dá o "tac" da batida no metal)
  const bufSize = ac.sampleRate * 0.025
  const buffer  = ac.createBuffer(1, bufSize, ac.sampleRate)
  const data    = buffer.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize)
  const noise     = ac.createBufferSource()
  const noiseGain = ac.createGain()
  const noiseHp   = ac.createBiquadFilter()
  noise.buffer    = buffer
  noiseHp.type    = 'highpass'
  noiseHp.frequency.value = 3000
  noiseGain.gain.setValueAtTime(0.25, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025)
  noise.connect(noiseHp)
  noiseHp.connect(noiseGain)
  noiseGain.connect(ac.destination)
  noise.start(t)

  // Parciais tonais
  partials.forEach(([freq, vol, decay]) => {
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(t)
    osc.stop(t + decay + 0.05)
  })

  setTimeout(() => ac.close(), 3000)
}

/** Chime — três notas cristalinas descendentes */
function playChime() {
  const ac = ctx()
  const notes = [1046.50, 880, 698.46] // C6 → A5 → F5
  notes.forEach((freq, i) => {
    const start = ac.currentTime + i * 0.22
    const osc   = ac.createOscillator()
    const gain  = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.4, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.8)
  })
  setTimeout(() => ac.close(), 1500)
}

/** Ding — um único toque suave de campainha */
function playDing() {
  const ac = ctx()
  const t  = ac.currentTime

  const osc  = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1318.51, t) // E6
  osc.frequency.exponentialRampToValueAtTime(1108.73, t + 0.8) // leve glissando
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.5, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 1.5)
  setTimeout(() => ac.close(), 1800)
}

/** Melodia — três notas ascendentes (som original) */
function playMelodia() {
  const ac    = ctx()
  const notes = [329.63, 415.30, 493.88]
  const dur   = 0.18
  notes.forEach((freq, i) => {
    const start = ac.currentTime + i * 0.24
    const osc   = ac.createOscillator()
    const gain  = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.45, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  })
  setTimeout(() => ac.close(), 1200)
}

/** Alerta — pulso agressivo para pedido atrasado */
function playAlerta() {
  const ac = ctx()

  ;[
    [0, 1046.5],
    [0.16, 784],
    [0.32, 1046.5],
    [0.48, 784],
  ].forEach(([offset, frequency]) => {
    const start = ac.currentTime + offset
    const osc   = ac.createOscillator()
    const gain  = ac.createGain()
    const filter = ac.createBiquadFilter()

    osc.type = 'square'
    osc.frequency.setValueAtTime(frequency, start)
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1400, start)
    filter.Q.setValueAtTime(5, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.28, start + 0.008)
    gain.gain.setValueAtTime(0.28, start + 0.09)
    gain.gain.linearRampToValueAtTime(0, start + 0.13)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.15)
  })

  const noiseStart = ac.currentTime
  const bufferSize = ac.sampleRate * 0.18
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)

  const noise = ac.createBufferSource()
  const noiseGain = ac.createGain()
  const noiseFilter = ac.createBiquadFilter()
  noise.buffer = buffer
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.setValueAtTime(1800, noiseStart)
  noiseGain.gain.setValueAtTime(0.08, noiseStart)
  noiseGain.gain.linearRampToValueAtTime(0, noiseStart + 0.18)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ac.destination)
  noise.start(noiseStart)

  setTimeout(() => ac.close(), 1200)
}

/** Sirene — varredura curta e insistente */
function playSirene() {
  const ac = ctx()
  const t = ac.currentTime

  ;[0, 0.32].forEach((offset) => {
    const start = t + offset
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const filter = ac.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(620, start)
    osc.frequency.linearRampToValueAtTime(1280, start + 0.16)
    osc.frequency.linearRampToValueAtTime(760, start + 0.3)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2200, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02)
    gain.gain.setValueAtTime(0.22, start + 0.24)
    gain.gain.linearRampToValueAtTime(0, start + 0.3)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.32)
  })

  setTimeout(() => ac.close(), 1200)
}

/** Crítico — pulsos secos de alta pressão */
function playCritico() {
  const ac = ctx()
  const t = ac.currentTime

  ;[
    [0, 1180],
    [0.11, 1180],
    [0.22, 620],
    [0.34, 1180],
    [0.45, 620],
  ].forEach(([offset, frequency]) => {
    const start = t + offset
    const osc = ac.createOscillator()
    const gain = ac.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.32, start + 0.006)
    gain.gain.setValueAtTime(0.32, start + 0.055)
    gain.gain.linearRampToValueAtTime(0, start + 0.085)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.1)
  })

  setTimeout(() => ac.close(), 1000)
}

export function playOrderSound(model: SoundModel = 'balcao') {
  try {
    if (model === 'balcao')   return playBalcao()
    if (model === 'chime')    return playChime()
    if (model === 'ding')     return playDing()
    if (model === 'melodia')  return playMelodia()
    if (model === 'alerta')   return playAlerta()
    if (model === 'sirene')   return playSirene()
    if (model === 'critico')  return playCritico()
  } catch {
    // fail silently — AudioContext may be blocked before user interaction
  }
}

export const SOUND_MODELS: { id: SoundModel; label: string; description: string }[] = [
  { id: 'balcao',  label: 'Sino de balcão', description: 'Tom metálico longo, igual a sino de bar'   },
  { id: 'chime',   label: 'Chime',          description: 'Três notas cristalinas descendentes'       },
  { id: 'ding',    label: 'Ding',           description: 'Toque único suave de campainha'            },
  { id: 'melodia', label: 'Melodia',        description: 'Três notas ascendentes (padrão anterior)'  },
]

export const LATE_ORDER_SOUND_MODELS: { id: SoundModel; label: string; description: string }[] = [
  { id: 'alerta',  label: 'Alerta forte',   description: 'Quatro pulsos fortes e bem secos'          },
  { id: 'sirene',  label: 'Sirene curta',   description: 'Varredura aguda para atraso operacional'   },
  { id: 'critico', label: 'Crítico',        description: 'Pulsos rápidos de alta pressão'            },
]
