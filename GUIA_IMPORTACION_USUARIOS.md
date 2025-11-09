# Guía de Importación de Usuarios

## 🎯 Nueva Interfaz de Importación Mejorada

Se ha implementado un sistema avanzado de importación de usuarios con validación paso a paso que facilita la carga masiva de los 400 colaboradores.

## ✨ Características Principales

### 1. **Mapeo Automático de Columnas**
   - Detecta automáticamente las columnas de tu Excel
   - Mapea campos basándose en nombres comunes
   - Permite ajuste manual si es necesario

### 2. **Vista Previa Antes de Importar**
   - Muestra las primeras 10 filas procesadas
   - Permite verificar que los datos se están leyendo correctamente
   - Identifica errores antes de importar todo el archivo

### 3. **Barra de Progreso**
   - Importación en lotes de 50 usuarios
   - Indicador visual del progreso en tiempo real
   - No se bloquea la interfaz durante la importación

### 4. **Reporte Detallado**
   - Muestra cuántos usuarios se importaron exitosamente
   - Lista los errores específicos por usuario
   - Permite identificar y corregir problemas

## 📋 Flujo de Importación (5 Pasos)

### **Paso 1: Cargar Archivo**
1. Ir a `/admin/usuarios`
2. Click en botón **"Importar Usuarios"**
3. Click en el área de carga o arrastrar archivo Excel
4. Formatos soportados: `.xlsx`, `.xls`, `.csv`

### **Paso 2: Mapeo de Columnas**
El sistema detecta automáticamente las columnas y las mapea a los campos del sistema:

| Campo del Sistema | Columnas Excel Detectadas | Requerido |
|-------------------|----------------------------|-----------|
| DPI | "DPI", "DOCUMENTO", "CEDULA" | ✅ Sí |
| Nombre Completo | "NOMBRE", "NOMBRE COMPLETO" | ✅ Sí |
| Fecha de Nacimiento | "FECHA DE NACIMIENTO", "NACIMIENTO" | ✅ Sí |
| Nivel de Puesto | "NIVEL DE PUESTO", "CODIGO NIVEL" | ✅ Sí |
| Puesto/Cargo | "PUESTO", "CARGO" | ✅ Sí |
| Área/Departamento | "DEPARTAMENTO O DEPENDENCIA", "AREA", "DIRECCION O UNIDAD" | ✅ Sí |
| Fecha de Ingreso | "FECHA DE INICIO LABORAL", "FECHA INGRESO" | ⭕ Opcional |
| Sexo/Género | "SEXO", "GENERO" | ⭕ Opcional |

**¿Qué hacer si el mapeo automático falló?**
- Revisar cada campo marcado con *
- Seleccionar manualmente la columna correcta del dropdown
- El botón "Vista Previa" se habilita cuando todos los campos requeridos están mapeados

### **Paso 3: Vista Previa**
- Se muestran las primeras 10 filas procesadas
- **Verificar:**
  - ✅ DPI se lee correctamente (sin espacios extra)
  - ✅ Nombres y apellidos están separados
  - ✅ Nivel de puesto tiene el código correcto (O2, A1, D1, etc.)
  - ✅ Cargo y área se leen correctamente

**Si encuentras errores:**
- Click en "Ajustar Mapeo" para volver al paso 2
- Cambiar la columna mapeada
- Volver a preview

**Si todo está bien:**
- Click en "Importar X Usuarios"
- El número X indica cuántas filas se procesarán

### **Paso 4: Importando**
- **Barra de progreso** muestra el avance
- Se importan en lotes de 50 usuarios
- **NO CERRAR** la ventana durante este proceso
- Tiempo estimado: ~30 segundos para 400 usuarios

### **Paso 5: Resultados**
Se muestran dos escenarios:

#### ✅ **Importación Exitosa** (0 errores)
- Icono verde con mensaje de éxito
- "X usuarios importados exitosamente"
- Click en "Cerrar" para finalizar

#### ⚠️ **Importación con Advertencias** (algunos errores)
- Icono amarillo con advertencia
- "X usuarios importados, Y con errores"
- Lista detallada de errores por usuario:
  - DPI, nombre y motivo del error
  - Permite identificar qué filas corregir en el Excel

## 📊 Formato del Excel

### Columnas Soportadas (de tu plantilla actual)

```
No. | DIRECCION O UNIDAD | DEPARTAMENTO O DEPENDENCIA | RENGLON | NOMBRE |
FECHA DE NACIMIENTO | EDAD | DPI | PUESTO | PROFESION |
FECHA DE INICIO LABORAL | Sexo | Nivel de puesto | Nivel
```

### Ejemplo de Datos Válidos

| No. | NOMBRE | FECHA DE NACIMIENTO | DPI | PUESTO | DEPARTAMENTO O DEPENDENCIA | Sexo | Nivel de puesto |
|-----|--------|---------------------|-----|--------|----------------------------|------|-----------------|
| 1 | Juana Cazanga Díaz | 24/06/1973 | 1636 35625 2007 | Conserje | CONSERVACIÓN EDIFICIO(S) PÚBLICOS | Femenino | O2 |
| 2 | Gabriel Erazo Mejía | 05/03/1959 | 1594 40688 2007 | Conserje | CONSERVACIÓN EDIFICIO(S) PÚBLICOS | Masculino | O2 |

### ⚠️ Notas Importantes sobre los Datos

1. **Columna "Nivel de puesto"** debe contener el **CÓDIGO** (O2, A1, D1), NO el nombre completo
2. **Fecha de Nacimiento** acepta múltiples formatos:
   - DD/MM/YYYY (ej: 24/06/1973)
   - DD-MM-YYYY
   - Número de serie de Excel
3. **DPI** acepta espacios, se limpian automáticamente
4. **Nombre** puede estar completo, se separa en nombre y apellidos
5. **Sexo** reconoce: Masculino/Femenino/Otro/Prefiero no decir

## 🔍 Errores Comunes y Soluciones

### Error: "DPI inválido o faltante"
**Causa:** Celda vacía o DPI muy corto
**Solución:** Verificar que cada fila tenga un DPI de al menos 10 caracteres

### Error: "Fecha de nacimiento faltante"
**Causa:** Celda vacía en la columna de fecha
**Solución:** Completar todas las fechas de nacimiento

### Error: "No se pudo convertir fecha de nacimiento"
**Causa:** Formato de fecha no reconocido
**Solución:**
- Usar formato DD/MM/YYYY
- O convertir la columna a fecha en Excel

### Error: "Nivel de puesto no válido"
**Causa:** Código de nivel que no existe en job_levels
**Solución:**
- Verificar que el nivel exista en `/admin/niveles`
- Códigos válidos: A1, A2, S2, D1, D2, E1, E2, A3, A4, OTE, O1, O2, OS
- Asegurarse de usar el CÓDIGO, no el nombre

### Error: "Nombre faltante" o "Área faltante"
**Causa:** Campos requeridos vacíos
**Solución:** Completar todos los campos marcados como requeridos

## 🚀 Proceso Recomendado para 400 Usuarios

### Preparación

1. **Verificar Niveles de Puesto**
   - Ir a `/admin/niveles`
   - Verificar que existen los 13 niveles
   - Si falta alguno, crearlo antes de importar

2. **Preparar Excel**
   - Abrir tu archivo de 400 usuarios
   - Verificar que la columna "Nivel de puesto" tiene códigos (O2, A1, etc.)
   - Verificar que no hay filas vacías entre los datos
   - Verificar que las fechas están en formato DD/MM/YYYY

3. **Hacer Backup (Opcional pero Recomendado)**
   - Exportar usuarios actuales desde `/admin/usuarios`
   - O hacer backup de la base de datos en Supabase

### Importación

4. **Prueba Inicial (Recomendado)**
   - Crear un Excel con solo las primeras 20 filas
   - Importar estas 20 como prueba
   - Verificar que se importaron correctamente
   - Si todo está bien, proceder con los 400

5. **Importación Completa**
   - Cargar el archivo completo (400 usuarios)
   - Revisar el mapeo automático
   - Ver preview de 10 filas
   - Si todo está correcto, importar
   - Esperar a que termine (30-60 segundos)

6. **Verificación Post-Importación**
   - Revisar el reporte de resultados
   - Si hay errores, anotarlos
   - Corregir filas con error en el Excel
   - Volver a importar solo las filas corregidas

## 📝 Checklist Pre-Importación

Antes de importar los 400 usuarios, verificar:

- [ ] Migración SQL `013_job_levels_system.sql` ejecutada
- [ ] Los 13 niveles existen en `/admin/niveles`
- [ ] Columna "Nivel de puesto" tiene CÓDIGOS (no nombres)
- [ ] Todas las fechas están en formato DD/MM/YYYY
- [ ] No hay filas completamente vacías
- [ ] Todos los DPI tienen al menos 10 caracteres
- [ ] Campo "Nombre" está completo en todas las filas
- [ ] Hice backup de la base de datos (opcional)
- [ ] Probé con 10-20 usuarios primero (recomendado)

## 💡 Consejos

### Para Importaciones Grandes
- Si tienes más de 500 usuarios, considera dividir en lotes de 200
- Esto facilita identificar y corregir errores
- El sistema maneja bien 400 usuarios, pero por seguridad

### Si la Importación Falla
- No te preocupes, el sistema es transaccional
- Los usuarios que se importaron correctamente quedan guardados
- Los que fallaron no se guardan
- Puedes corregir y volver a importar solo los que fallaron

### Optimización
- El campo "tipo_puesto" se asigna AUTOMÁTICAMENTE
- No necesitas incluir una columna "tipo_puesto" en tu Excel
- Se calcula desde el nivel de puesto vía trigger SQL

## 🆘 Soporte

Si encuentras problemas:
1. Revisar la lista de errores en el paso 5
2. Corregir las filas problemáticas en el Excel
3. Volver a intentar solo con esas filas
4. Si el error persiste, verificar los logs de Supabase

## 📞 Contacto

Para problemas técnicos o dudas sobre la importación, contactar al equipo de desarrollo.

---

**Última actualización:** 2025-11-09
**Versión del importador:** 2.0 (con validación y preview)
