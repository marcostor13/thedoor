# Línea gráfica — The Door PR

Análisis de la web completa (portada, `/registro`, `/invitacion`, verja
«Coming Soon») y las reglas que salen de él. Los valores viven en
`apps/web/src/styles/tokens.css`; aquí se explica cómo se usan.

---

## 1. Lo que funciona

- **Una sola imagen de marca, fuerte:** la puerta de neón (`DoorMark`) sobre
  negro puro. Todo el sitio gira en torno a ella y a la rendija de luz.
- **Contraste de voces:** un display de lujo (Italiana), un mono técnico
  (JetBrains Mono) para la trastienda y un rojo neón único. Se lee a club
  privado, no a agencia genérica.
- **Negro + crema cálido + rojo:** paleta corta y con carácter. El crema
  (`#f4f1ea`) evita el blanco quirúrgico y suaviza el rojo.

## 2. Lo que no funcionaba (y se ha corregido)

| Problema | Dónde | Corrección |
|---|---|---|
| **Cursiva falsa.** Italiana solo existe en redonda; cada `font-style: italic` hacía que el navegador la inclinara a la fuerza y deformara el dibujo. | «Or are you out?», «We’ll answer», «The list starts here», títulos de servicios, tagline del hero | El acento en rojo pasa a **Cormorant Garamond itálica**, que es una cursiva real y comparte con Italiana el contraste alto de trazo. Los titulares van siempre en redonda. |
| **Guiones invisibles.** El «—» de Italiana existe pero viene vacío: cada guion de un titular se pintaba como un hueco. | Tagline del hero, manifiesto | Fuente de 880 bytes (`public/fonts/display-dashes.woff2`, guion de Cormorant) que solo cubre U+2013–2014 y va delante de Italiana. |
| **La misma frase con dos letras.** «Are you in? / Or are you out?» iba en Italiana en la portada y en Cormorant gris en el pie. | Pie | Misma composición en los dos sitios. |
| **Párrafos en letra de titular.** Las descripciones de servicios iban en Italiana fina y gris: cinco líneas se leían con esfuerzo. | Servicios | Archivo, como el resto de párrafos del sitio. |
| **Demasiado rojo.** Etiquetas largas de servicios, etiquetas del pie… el rojo competía con el acento del titular. | Servicios, pie | Rojo reservado (ver §4); las etiquetas pasan a gris y solo la flecha conserva el rojo. |
| **Resplandores sin criterio.** Cuatro variantes del brillo rojo escritas a mano (0.35, 0.4, 0.4 + 0.2…) y el del idioma activo al 100 %. | Varios | Dos tokens: `--glow-text` (titulares) y `--glow-label` (etiquetas). |
| **Estilos duplicados.** El antetítulo («— The question») estaba copiado en tres archivos. | Portada, registro, formulario | Clase global `.eyebrow`. |
| **Dos logos distintos.** El pie usaba el glifo compacto de la cabecera junto a un wordmark en tres líneas que no aparecía en ningún otro sitio. | Pie | El pie usa el mismo lockup del hero: puerta de neón, `THE ◆ DOOR ◆ PR` y filete rojo. |
| Token inexistente `--fs-md`. | Invitación | `--fs-lg`. |

## 3. Tipografía — cuatro papeles

| Familia | Papel | Nunca |
|---|---|---|
| **Italiana** (`--font-display`) | Titulares, wordmark, cifras, frases de marca | En cursiva ni en párrafos |
| **Cormorant Garamond itálica** (`--font-accent`) | La palabra encendida de un titular; el «&» de los títulos | Como texto corrido |
| **Archivo** (`--font-body`) | Todo lo que se lee en párrafo | En titulares |
| **JetBrains Mono** (`--font-mono`) | Etiquetas, navegación, metadatos — en mayúsculas | En frases largas |

El acento se escribe con un `<em>` dentro de un titular (o de una línea con
la clase `.display`); `global.css` le da la letra, el color y el brillo. No
hay que estilarlo en cada componente.

## 4. Color en el texto

| Color | Token | Para |
|---|---|---|
| Crema | `--c-fg` | Lo que se lee: titulares, datos, enlaces |
| Gris cálido | `--c-fg-muted` | Lo que acompaña: párrafos, etiquetas, notas |
| Rojo neón | `--c-accent` | Lo que marca: el acento del titular, los antetítulos, los índices (`01 /`), el estado activo |

Nada más va en rojo. Si todo brilla, nada brilla.

## 5. Logo

- **Lockup principal** (hero, registro, invitación, verja, pie): `DoorMark`
  arriba, `Logo` (wordmark con rombos rojos) debajo y un filete rojo de
  2,5 rem. Siempre centrado y en ese orden.
- **Glifo compacto** (`DoorGlyph`): solo donde la puerta grande no se lee —
  cabecera y favicon, por debajo de ~48 px de alto.
