/**
 * Revelado de elementos al entrar en el viewport.
 *
 * Se apoya en IntersectionObserver y deja de observar cada elemento en cuanto
 * se revela, para no mantener trabajo por scroll. Con `prefers-reduced-motion`
 * el efecto se desactiva por completo: los elementos quedan visibles de una vez.
 *
 * El escalonado se declara en el contenedor, no en cada hijo:
 *
 *   <div class="stat-grid" data-reveal-stagger="90">
 *     <div data-reveal>…</div>   ← 0ms
 *     <div data-reveal>…</div>   ← 90ms
 *
 * El retardo se calcula por posición dentro del grupo, así que añadir o quitar
 * elementos no obliga a renumerar nada.
 */
export function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]')
  if (targets.length === 0) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'))
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
  )

  // Contador por grupo: el índice tiene que ser la posición del elemento
  // *dentro de su contenedor escalonado*, no dentro del documento, o el último
  // grupo de la página arrancaría con segundos de retardo.
  const counters = new Map<HTMLElement, number>()

  targets.forEach((el) => {
    const group = el.closest<HTMLElement>('[data-reveal-stagger]')

    if (group) {
      const step = Number(group.dataset.revealStagger) || 0
      const index = counters.get(group) ?? 0
      counters.set(group, index + 1)
      if (step > 0) el.style.setProperty('--reveal-delay', `${index * step}ms`)
    }

    observer.observe(el)
  })
}
