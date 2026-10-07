# Registro de cambios para el proyecto "preenroll"

Este archivo documenta todos los cambios, archivos creados y modificados relacionados con la integración del prerregistro (botón y modal) en la pantalla de login de la Moodle App custom.

## Estructura y control de cambios

### Archivos a modificar
- `src/core/features/login/components/login-methods/login-methods.html`  
  (Agregar botón de prerregistro)
- `src/core/features/login/components/login-methods/login-methods.ts`  
  (Agregar lógica para abrir el modal)

### Archivos a crear
- `src/core/features/login/components/preenroll-modal/preenroll-modal.component.ts`
- `src/core/features/login/components/preenroll-modal/preenroll-modal.component.html`
- `src/core/features/login/components/preenroll-modal/preenroll-modal.component.scss` (opcional)
- (Registrar el nuevo componente en el módulo correspondiente)

### Descripción funcional
- El botón de prerregistro abrirá un modal nativo Ionic.
- El modal contendrá un formulario con los campos: Apellidos y RFC.
- El formulario solo validará datos en el front; la llamada al webservice se documentará cuando se integre.

### Notas de control
- Todos los cambios deben registrarse aquí antes de hacer merge a la rama principal.
- El nombre de proyecto para esta funcionalidad es: **preenroll**

---

> Actualiza este archivo con cada cambio relevante para mantener el control y trazabilidad del desarrollo.
