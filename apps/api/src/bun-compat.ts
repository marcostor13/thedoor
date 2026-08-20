// bson@7 (dependencia de mongoose) llama a `v8.startupSnapshot.isBuildingSnapshot()`
// dentro de un bloque `static {}`, sin protegerlo. Bun 1.3 todavía no implementa
// ese método y lanza ERR_NOT_IMPLEMENTED, con lo que el módulo entero falla al
// evaluarse y mongoose no llega a cargar.
//
// La respuesta correcta fuera de un snapshot de arranque es `false`, así que se
// rellena solo cuando la llamada real falla. El día que Bun lo implemente, este
// módulo deja de tocar nada por sí mismo.
//
// Tiene que importarse antes que cualquier cosa que arrastre mongoose.
const startupSnapshot = (
  process.getBuiltinModule?.('v8') as
    | { startupSnapshot?: Record<string, unknown> }
    | undefined
)?.startupSnapshot

if (startupSnapshot && typeof startupSnapshot.isBuildingSnapshot === 'function') {
  try {
    ;(startupSnapshot.isBuildingSnapshot as () => boolean)()
  } catch {
    startupSnapshot.isBuildingSnapshot = (): boolean => false
  }
}

export {}
