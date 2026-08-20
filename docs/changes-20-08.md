# Especificaciones de Cambios para la Plataforma "The Door PR"

Este documento detalla las correcciones, ajustes de texto, modificaciones de diseño y correcciones de maquetación/layout identificadas en las capturas de pantalla de la plataforma `thedoor-pr.netlify.app`.

---

## 1. Modificaciones de Copys y Textos (Copywriting)

### 1.1. Sección Hero / Header Principal
* **Texto Actual (Marcado para cambio):**
  > *"Doors don't open for everyone. Ours do — for the right people, on the right nights."*
* **Instrucción de Cambio:** 
  * Modificar o reemplazar esta frase por la versión aprobada/actualizada según las indicaciones (*"Doors don’t open for everyone, but we can open them for you..."*).
  * Asegurar consistencia del tono de marca (Public Relations, curaduría de audiencias VIP para *hospitality* y *nightlife*).

### 1.2. Subtítulo / Descripción Principal
* **Texto Circulado:**
  > *"A PUBLIC RELATIONS HOUSE FOR HOSPITALITY, NIGHTLIFE AND THE PEOPLE WHO FILL THE ROOMS."*
* **Instrucción de Cambio:**
  * Modificar a la nueva propuesta de valor:
    > *"The Door PR – Public Relations Agency that curates the right people for the right places. An event is not just about quantity; it’s about quality, ambiance and vibes…"*

### 1.3. Sección "What We Do" (Sección 01 / Venue Programming)
* **Texto Modificado/Subrayado:**
  > *"FOUR THINGS, ON REPEAT — FOR VENUES THAT TAKE THE DOOR SERIOUSLY."*
* **Texto Subrayado en la descripción:**
  > *"...tu sala no se apaga un martes."*
* **Instrucción de Cambio:**
  * Revisar y ajustar el encabezado del bloque. Cambiar *"FOUR THINGS..."* por la estructura exacta o número de pilares definitivo si han cambiado las líneas de servicio.
  * Corregir/revisar el texto descriptivo del martes para asegurar que encaje con la narrativa de marca deseada.

### 1.4. Sección "The Question" / Cierre
* **Texto Ajustado:**
  > *"Anyone can fill a room. We fill it with the people who come back."* / *"Anyone can just 'fill a room', but we will fill it with the right people that will come back."*
* **Instrucción de Cambio:**
  * Actualizar la frase final para mantener el mensaje uniforme de retención y calidad sobre cantidad.

---

## 2. Correcciones de UI / UX, Visuales y Layout

### 2.1. Solución de Superposición de Texto y Relleno (Layout Overlap)
* **Problema Detectado (Imagen de métricas/stats - "1.2K", "24/7"):**
  * Existe una severa superposición entre los textos e imágenes de fondo.
  * El texto *"De clientes VIP en nuestra base de datos completamente curada..."* y *"Tu lo necesitas, nosotros lo crear..."* quedan encimados con los números grandes (`1.2 K`, `24/7`) y fondos oscuros.
* **Instrucciones de Corrección:**
  * **Flexbox / Grid Layout:** Corregir el z-index, position (avoid absolute positioning con px fijos) y paddings/margins.
  * **Responsive Breakpoints:** Asegurar que en pantallas móviles pequeñas el bloque de estadísticas pase a un layout vertical (*stacking*) limpio.
  * **Contraste:** Aumentar el contraste o agregar un *overlay* oscuro uniforme detrás del texto para garantizar la legibilidad de la tipografía blanca/gris sobre los elementos circulares del fondo.

### 2.2. Botón / Elemento "BAJA" / Navegación Indicadora
* **Elemento Circulado:** `AFTER HOURS / 01 - 03  BAJA`
* **Instrucción de Cambio:**
  * Ajustar el estilo visual de la barra roja y el texto indicativo de desplazamiento (*scroll indicator* / "Baja").
  * Asegurar que el alineamiento y el interlineado de los elementos de navegación no tapen ni interfieran con el contenido adyacente.

---

## 3. Lista de Verificación (Checklist) para Desarrollo

- [x] **Hero Section:** Actualizar el slogan principal y el subtítulo corporativo.
- [x] **Section "What We Do":** Actualizar el titular y ajustar los textos descriptivos de la sección *Venue Programming*.
- [x] **Sección de Métricas / Stats (1.2K & 24/7):** ~~Refactorizar el CSS/Layout~~ — **no aplica a esta implementación**, ver nota abajo.
- [x] **Sección "The Question":** Homologar el copy final sobre la curaduría de público.
- [x] **Revisión General Mobile:** Verificar interlineados (*line-height*), espaciados (*padding/margin*) y desbordamientos en resoluciones de pantalla entre 320px y 430px.
- [x] **Indicador de scroll (2.2):** rediseñado.

---

## Nota sobre el punto 2.1 (superposición en las métricas)

El problema descrito pertenece al sitio de referencia `thedoor-pr.netlify.app`,
no a esta implementación. Comprobado a 320 / 375 / 430 px:

* Las métricas de este sitio son `60+`, `4.2K`, `1:1` y `00` — no `1.2K` ni `24/7`,
  y los textos citados («De clientes VIP en nuestra base de datos…») no existen aquí.
* `.stat-grid` es un grid con `repeat(auto-fit, minmax(13rem, 1fr))`: en móvil
  apila solo, en una columna limpia, sin posicionamiento absoluto ni z-index.
* Medido: separación de **+7 px** entre el número y su descripción en los tres
  anchos. Cero superposición.

Lo que sí salió de esa revisión y se corrigió: el hero se pasaba entre 3 y 9 px
de la altura de pantalla en móvil, obligando a hacer scroll solo para ver el
indicador. Ajustado el relleno vertical por debajo de 600 px.