# ✅ Verificación de Rollback Bancard

## ¿Cómo verificar si el rollback se efectuó correctamente?

### Respuesta Exitosa (Código 200)

Cuando el rollback es **exitoso**, Bancard devuelve:

```json
{
  "status": "success",
  "messages": [
    {
      "key": "RollbackSuccessful",
      "level": "info",
      "dsc": "Rollback correcto."
    }
  ]
}
```

**Esto significa:**
- ✅ El rollback se procesó correctamente
- ✅ El dinero será devuelto al cliente
- ✅ La transacción fue marcada como revertida en el sistema

### Respuestas de Error Comunes

1. **TransactionAlreadyConfirmed** (Código 409)
   - La transacción ya fue confirmada (cuponada)
   - No se puede revertir automáticamente
   - Requiere reversión manual a través del portal de comercios

2. **AlreadyRollbackedError** (Código 409)
   - Ya existe un rollback previo
   - No se puede realizar otro rollback

3. **PaymentNotFoundError** (Código 404)
   - No existe un pedido de pago para esta transacción
   - El cliente no completó el pago

## Verificación en el Sistema

Para verificar si el rollback fue exitoso, revisa:

1. **Respuesta del endpoint:**
   - `success: true` = Rollback exitoso
   - `rollback_confirmed: true` = Confirmado por Bancard
   - `rollback_successful: true` = Procesado correctamente

2. **En la base de datos:**
   - Campo `is_rolled_back: true`
   - Campo `status: 'rolled_back'`
   - Campo `rollback_date` con fecha de reversión

## Logs del Sistema

El sistema ahora registra:
- 🔄 Envío de rollback a Bancard
- 📥 Respuesta completa de Bancard
- 🔍 Verificación de éxito/fallo
- ✅ Actualización en base de datos

