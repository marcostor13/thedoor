/**
 * Revelado de elementos al entrar en el viewport.
 *
 * Se apoya en IntersectionObserver y deja de observar cada elemento en cuanto
 * se revela, para no mantener trabajo por scroll. Con `prefers-reduced-motion`
 * el efecto se desactiva por completo: los elementos quedan visibles de una vez.
 */
export function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]')
  if (targets.length === 0) return

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

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

  targets.forEach((el, index) => {
    // Escalonado dentro de cada grupo, para que las listas entren en cascada.
    const stagger = Number(el.dataset.revealStagger ?? 0)
    if (stagger > 0) {
      el.style.setProperty('--reveal-delay', `${index * stagger}ms`)
    }
    observer.observe(el)
  })
}
