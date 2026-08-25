/**
 * Verja de «próximamente».
 *
 * La portada se sirve tapada por una página de espera (components/ComingSoon)
 * y la web entera solo se levanta con `?develop=true` en la URL. El permiso se
 * guarda en `sessionStorage`, así que basta escribirlo una vez: el resto de la
 * sesión —enlaces internos, recargas— sigue viendo el sitio. Con
 * `?develop=false` se vuelve a bajar la verja.
 *
 * Quién hace qué:
 *   · El script en línea de Layout.astro escribe `data-develop` en <html>
 *     ANTES de pintar, que es lo que evita el parpadeo. Es la única copia de
 *     esta lógica que corre antes del primer fotograma.
 *   · Este módulo la repite para las navegaciones del ClientRouter, donde los
 *     atributos de <html> llegan del documento nuevo y el permiso se perdería.
 */
const STORAGE_KEY = 'thedoor:develop'

/** ¿Toca enseñar la web? Lee la URL, la recuerda y responde. */
function hasAccess(): boolean {
  const requested = new URLSearchParams(window.location.search).get('develop')

  try {
    if (requested === 'true') sessionStorage.setItem(STORAGE_KEY, '1')
    else if (requested === 'false') sessionStorage.removeItem(STORAGE_KEY)

    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Navegador con el almacenamiento capado: el permiso dura lo que la página.
    return requested === 'true'
  }
}

/** Marca (o desmarca) el documento como «con acceso de desarrollo». */
function stampAccess(target: Document): void {
  if (hasAccess()) target.documentElement.dataset.develop = 'true'
  else delete target.documentElement.dataset.develop
}

let wired = false

export function initGate(): void {
  stampAccess(document)

  // El ClientRouter estrena el <html> del documento entrante: si no se sella
  // antes del intercambio, la verja aparecería un fotograma en cada salto.
  if (!wired) {
    wired = true
    document.addEventListener('astro:before-swap', (event) => {
      stampAccess(event.newDocument)
    })
  }

  // Con acceso, la verja se retira del DOM —y no solo se oculta— antes de que
  // scripts/door.ts busque la puerta que tiene que animar: si se quedara,
  // sería la primera marca `staged` del documento y se llevaría la entrada
  // que le toca a la del hero.
  if (document.documentElement.hasAttribute('data-develop')) {
    document.getElementById('soon')?.remove()
  }
}
