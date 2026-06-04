---
name: make-programa
description: Parsea un programa de Gestión de Programas desde un archivo Excel, genera su JSON, lo integra al seeder principal y mapea sus templates de evidencia.
---

# Skill: make-programa

Este skill permite leer un archivo Excel con la estructura de un Programa de Gestión de Programas, importarlo en el core del sistema y dejarlo disponible vinculándolo en la base de datos a través de los seeders y mapeos de evidencia.

## Estructura del Excel Esperado

El Excel debe contener las siguientes columnas (por defecto en la primera hoja):
1. **Número del Elemento** (ej: "1", "2")
2. **Nombre del Elemento** (ej: "Liderazgo y compromiso")
3. **Código de la Actividad** (ej: "1.1", "1.2")
4. **Descripción de la Actividad**
5. **Criterios de Aceptación**
6. **Frecuencia** (mensual, trimestral, semestral, anual, cuando_aplique)
7. **Requiere Evidencia** (SI/NO o 1/0)
8. **Nombre del Template de Evidencia** (opcional, ej: `template_evidencia_registro_asistencia.xlsx`)

---

## Script del Skill: `scripts/parse-excel.js`

El script lee el archivo Excel, genera el archivo `.js` en `back/src/data/`, actualiza `back/src/data/evidence_map.json` y modifica `back/src/seed.js` para incluir el nuevo programa.

### Ejecución
Para ejecutar el script, ejecute el comando en la terminal:
```bash
node .agent/skills/make-programa/scripts/parse-excel.js <ruta_al_excel> <nombre_del_programa> [meta_cumplimiento]
```
