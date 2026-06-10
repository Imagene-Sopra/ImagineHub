export const CONFIRM_DELETE = {
  warning: "Esta acción no se puede deshacer.",
  cancel: "Cancelar",
  accept: "Aceptar",
};

export const CONFIRM_DELETE_TASK = {
  message: "¿Eliminar esta tarea?",
  ...CONFIRM_DELETE,
};

export const CONFIRM_DELETE_INITIATIVE = {
  message: "¿Eliminar LAB?",
  ...CONFIRM_DELETE,
};

export const CONFIRM_DELETE_PROJECT = {
  message: "¿Eliminar SQUAD?",
  ...CONFIRM_DELETE,
};

export const SECTION_NAMES = {
  initiative: "LAB",
  project: "SQUAD",
};

export const TASK_FIELDS = {
  assignedTo: "Asignado a",
  assignedToPlaceholder: "Seleccionar persona...",
  assignees: ["Aarón", "Yanran", "Guillermo", "Carlos", "Daviz"],
};
