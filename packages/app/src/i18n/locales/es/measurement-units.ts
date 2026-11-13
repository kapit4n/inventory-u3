export const measurementUnits = {
  'measurementUnits.list.title': 'Unidades de medida',
  'measurementUnits.list.description':
    'Unidades usadas para contar compras, inventario, producción y ventas.',
  'measurementUnits.list.empty': 'Todavía no hay unidades de medida.',
  'measurementUnits.list.emptyDescription':
    'Crea las unidades que usa el negocio antes de agregar productos.',
  'measurementUnits.loading': 'Cargando unidades de medida…',
  'measurementUnits.loadFailure': 'No se pudieron cargar las unidades de medida.',
  'measurementUnits.retry': 'Reintentar',
  'measurementUnits.new': 'Nueva unidad',
  'measurementUnits.column.code': 'Código',
  'measurementUnits.column.name': 'Unidad',
  'measurementUnits.column.status': 'Estado',
  'measurementUnits.column.actions': 'Acciones',
  'measurementUnits.status.active': 'Activa',
  'measurementUnits.status.inactive': 'Inactiva',
  'measurementUnits.edit': 'Editar',
  'measurementUnits.readOnly': 'Solo un administrador puede crear o editar unidades de medida.',
  'measurementUnits.form.createTitle': 'Nueva unidad de medida',
  'measurementUnits.form.createDescription': 'Agrega una unidad como kilogramo, unidad o charola.',
  'measurementUnits.form.editTitle': 'Editar unidad de medida',
  'measurementUnits.form.editDescription':
    'Cambia el código, el nombre o el estado activo de la unidad de medida.',
  'measurementUnits.form.code': 'Código',
  'measurementUnits.form.codeHint':
    'Entre 1 y 32 caracteres, por ejemplo kg. Los códigos deben ser únicos.',
  'measurementUnits.form.name': 'Nombre',
  'measurementUnits.form.nameHint': 'Entre 1 y 80 caracteres.',
  'measurementUnits.form.status': 'Estado',
  'measurementUnits.form.create': 'Crear unidad',
  'measurementUnits.form.save': 'Guardar cambios',
  'measurementUnits.form.saving': 'Guardando…',
  'measurementUnits.form.failure': 'No se pudo guardar la unidad de medida.',
  'measurementUnits.form.failure.validation': 'Revisa los campos e inténtalo de nuevo.',
  'measurementUnits.form.failure.forbidden':
    'Solo un administrador puede cambiar unidades de medida.',
  'measurementUnits.form.failure.network':
    'No se pudo conectar con la API. Revisa la conexión e inténtalo de nuevo.',
  'measurementUnits.form.failure.duplicate': 'Ya existe una unidad de medida con ese código.',
  'measurementUnits.form.codeRequired': 'El código de la unidad es obligatorio.',
  'measurementUnits.form.nameRequired': 'El nombre de la unidad es obligatorio.',
} as const;
