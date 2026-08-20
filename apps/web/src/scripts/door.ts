/**
 * Disparo de la entrada de la marca del hero (DoorMark con `staged`).
 *
 * La marca nace invisible y aquí se decide QUÉ entrada le toca:
 *
 *   · `dm-enter`  — apertura completa (se dibuja, se abre, se enciende).
 *                   Es lo que se ve cuando no ha habido secuencia de intro:
 *                   segunda visita en la misma sesión, o movimiento reducido.
 *   · `dm-settle` — solo asentarse. El overlay de Intro.astro acaba de contar
 *                   la apertura, así que repetirla entera sería redundante:
 *                   la puerta del hero recoge el gesto donde lo dejó.
 *
 * El orden en que Astro ejecuta los módulos no está garantizado, así que la
 * decisión se toma mirando el DOM (¿sigue ahí el overlay?) antes que ningún
 * estado guardado — es el único dato que no depende de quién arrancó primero.
 */
const INTRO_EVENT = 'thedoor:intro-done'
const FAILSAFE_MS = 6000

export type IntroState = 'played' | 'skipped'

export function initHeroDoor(): void {
  const mark = document.querySelector<SVGElement>('.doormark--staged')
  if (!mark) return

  let started = false

  const play = (state: IntroState): void => {
    if (started) return
    started = true

    const full = state !== 'played'
    mark.classList.add(full ? 'dm-enter' : 'dm-settle')

    // La sección que contiene la marca entra en escena con ella: el wordmark,
    // el filete y el texto se escalonan DETRÁS de la puerta, para que el hero
    // se lea como una sola pieza y no como una puerta más un fundido genérico.
    mark.closest<HTMLElement>('[data-door-scene]')?.classList.add(
      full ? 'scene--enter' : 'scene--settle',
    )
  }

  // Con movimiento reducido el CSS anula las animaciones; la clase se pone
  // igualmente para que la marca deje de estar invisible.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    play('skipped')
    return
  }

  // Hay páginas donde la puerta es el contenido y siempre tiene que abrirse
  // entera, haya pasado lo que haya pasado antes en la sesión.
  if (mark.dataset.doorEntrance === 'full') {
    play('skipped')
    return
  }

  // Overlay todavía en el documento: su secuencia manda, se espera al aviso.
  if (document.getElementById('intro')) {
    document.addEventListener(
      INTRO_EVENT,
      (event) => play((event as CustomEvent<{ state: IntroState }>).detail.state),
      { once: true },
    )

    // Si el aviso no llega nunca (script caído, pestaña en segundo plano),
    // la puerta no puede quedarse invisible para siempre.
    window.setTimeout(() => play('skipped'), FAILSAFE_MS)
    return
  }

  play((document.documentElement.dataset.intro as IntroState | undefined) ?? 'skipped')
}

/** Lo llama Intro.astro cuando la secuencia termina (o se salta). */
export function announceIntro(state: IntroState): void {
  document.documentElement.dataset.intro = state
  document.dispatchEvent(new CustomEvent(INTRO_EVENT, { detail: { state } }))
}
