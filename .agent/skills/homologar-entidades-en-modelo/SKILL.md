---
name: homologar-entidades-en-modelo
description: Analiza y homologa la estructura de pertenencias y relaciones infiriendo el modelo de datos desde migraciones, seeders y modelos.
---

# Homologador de Entidades en Modelo

La rutina debe sumar la experticia de un revisor especializado en modelos de datos. 
Su tarea es analizar y homologar la estructura de pertenencias dentro de una aplicación Node.js/React con backend y frontend separados en un monorepo.

## Entrada:
- Migraciones, seeders y modelos definidos en el proyecto (JavaScript o SQL).
- Convenciones de pertenencia establecidas en el diagrama conceptual (relaciones 1:N, N:1, 1:1, etc.).

## Objetivos:
1. Inferir el modelo de datos directamente a partir de las migraciones, seeders y modelos existentes en el proyecto.
2. Identificar las entidades presentes y sus atributos principales.
3. Comparar las relaciones entre entidades según el modelo inferido y las convenciones del diagrama conceptual.
4. Detectar inconsistencias:
   - Relaciones faltantes o incorrectas.
   - Claves foráneas mal definidas.
   - Cardinalidades no coincidentes.
5. Generar un informe de diferencias con detalle de:
   - Entidades faltantes o adicionales.
   - Relaciones que no coinciden con el diagrama.
   - Campos o claves que requieren ajuste.
6. Aplicar ajustes automáticos para homologar la estructura:
   - Actualizar migraciones para reflejar las relaciones correctas.
   - Ajustar seeders para mantener coherencia con las nuevas relaciones.
7. Ejecutar el seeder para poblar los datos iniciales.
8. Aplicar los ajustes posteriores al seeder:
   - Validar que las relaciones creadas coincidan con el diagrama conceptual.
   - Reasignar claves foráneas o referencias si el seeder generó datos inconsistentes.
   - Actualizar registros o relaciones en la base de datos para garantizar integridad referencial.
9. Emitir un resumen final con los cambios realizados y el estado del modelo tras la homologación.

## Formato esperado de salida:
```json
{
  "entidades_inferidas": [...],
  "relaciones_comparadas": [...],
  "diferencias_encontradas": [...],
  "ajustes_realizados": [...],
  "post_seeder_aplicaciones": [...],
  "estado_final": "homologado" | "pendiente"
}
```

## Consideraciones:
- El modelo de datos debe ser inferido directamente de migraciones, seeders y modelos, sin depender de un archivo externo.
- Las relaciones deben respetar las jerarquías del diagrama conceptual (Gerencia → Subgerencia → Servicio → Vinculación → Registro de Cumplimiento).
- Los contratos en las vinculaciones son únicos y deben mantenerse como identificadores principales.
- Los registros de cumplimiento deben vincularse por número de contrato.
- Los ajustes post-seeder deben garantizar que los datos iniciales reflejen la estructura homologada.
