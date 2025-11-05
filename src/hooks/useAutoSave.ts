import { useEffect, useRef, useCallback } from "react";

/**
 * Hook personalizado para auto-guardado mejorado
 * - Guarda automáticamente después de que el usuario deja de escribir (debounce)
 * - Guarda antes de cerrar la página
 * - Guarda cuando la página pierde visibilidad
 * - Guarda periódicamente como respaldo
 */
export const useAutoSave = (
  saveFunction: () => void | Promise<void>,
  hasUnsavedChanges: boolean,
  options: {
    debounceMs?: number; // Tiempo de espera después de última edición (default: 2000ms)
    periodicSaveMs?: number; // Guardado periódico como respaldo (default: 30000ms)
    saveBeforeUnload?: boolean; // Guardar antes de cerrar página (default: true)
  } = {}
) => {
  const {
    debounceMs = 2000,
    periodicSaveMs = 30000,
    saveBeforeUnload = true,
  } = options;

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicSaveRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);

  // Función de guardado con debounce
  const debouncedSave = useCallback(() => {
    if (!hasUnsavedChanges) return;

    // Cancelar guardado anterior si existe
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Programar nuevo guardado
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveFunction();
        lastSaveRef.current = Date.now();
      } catch (error) {
        console.error("Error en auto-guardado:", error);
      }
    }, debounceMs);
  }, [hasUnsavedChanges, saveFunction, debounceMs]);

  // Guardar inmediatamente cuando cambian los datos
  useEffect(() => {
    if (hasUnsavedChanges) {
      debouncedSave();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, debouncedSave]);

  // Guardado periódico como respaldo
  useEffect(() => {
    if (!hasUnsavedChanges) {
      if (periodicSaveRef.current) {
        clearInterval(periodicSaveRef.current);
      }
      return;
    }

    periodicSaveRef.current = setInterval(async () => {
      // Solo guardar si han pasado al menos debounceMs desde el último guardado
      const timeSinceLastSave = Date.now() - lastSaveRef.current;
      if (timeSinceLastSave >= debounceMs) {
        try {
          await saveFunction();
          lastSaveRef.current = Date.now();
        } catch (error) {
          console.error("Error en guardado periódico:", error);
        }
      }
    }, periodicSaveMs);

    return () => {
      if (periodicSaveRef.current) {
        clearInterval(periodicSaveRef.current);
      }
    };
  }, [hasUnsavedChanges, saveFunction, periodicSaveMs, debounceMs]);

  // Guardar antes de cerrar la página
  useEffect(() => {
    if (!saveBeforeUnload || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Guardar sincrónicamente antes de cerrar
      try {
        saveFunction();
      } catch (error) {
        console.error("Error guardando antes de cerrar:", error);
      }
    };

    const handleVisibilityChange = () => {
      // Guardar cuando la página pierde visibilidad (cambio de pestaña, minimizar, etc.)
      if (document.hidden && hasUnsavedChanges) {
        try {
          saveFunction();
        } catch (error) {
          console.error("Error guardando al perder visibilidad:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasUnsavedChanges, saveFunction, saveBeforeUnload]);
};

