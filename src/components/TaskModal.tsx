import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Tag as TagIcon, Trash2, User } from "lucide-react";
import { CONFIRM_DELETE_TASK, TASK_FIELDS } from "../lib/constants";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { titulo: string; descripcion: string; tags: string[]; asignadoA: string[]; fechaInicio?: string; fechaFin?: string; tipo?: "PoC" | "Presentation" | "Run" | "Build" | ""; estado?: "todo" | "in_progress" | "done" }) => void;
  onDelete?: () => void;
  contextType: "initiative" | "project";
  showStatusSelector?: boolean;
  initialData?: {
    titulo: string;
    descripcion: string;
    tags: string[];
    asignadoA?: string[];
    fechaInicio?: string;
    fechaFin?: string;
    tipo?: string;
    estado?: "todo" | "in_progress" | "done";
  };
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, onDelete, contextType, showStatusSelector = false, initialData }) => {
  const [title, setTitle] = useState(initialData?.titulo || "");
  const [description, setDescription] = useState(initialData?.descripcion || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [asignadoA, setAsignadoA] = useState<string[]>(initialData?.asignadoA || []);
  const [startDate, setStartDate] = useState(initialData?.fechaInicio || "");
  const [endDate, setEndDate] = useState(initialData?.fechaFin || "");
  const [tipo, setTipo] = useState<"PoC" | "Presentation" | "Run" | "Build" | "">(initialData?.tipo as any || "");
  const [estado, setEstado] = useState<"todo" | "in_progress" | "done">(initialData?.estado || "todo");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.titulo || "");
      setDescription(initialData?.descripcion || "");
      setTags(initialData?.tags || []);
      setAsignadoA(initialData?.asignadoA || []);
      setStartDate(initialData?.fechaInicio || "");
      setEndDate(initialData?.fechaFin || "");
      setTipo(initialData?.tipo as any || "");
      setEstado(initialData?.estado || "todo");
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialData]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddAssignee = (name: string) => {
    if (name && !asignadoA.includes(name)) {
      setAsignadoA([...asignadoA, name]);
    }
  };

  const removeAssignee = (name: string) => {
    setAsignadoA(asignadoA.filter(a => a !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({
        titulo: title.trim(),
        descripcion: description.trim(),
        tags,
        asignadoA,
        fechaInicio: startDate,
        fechaFin: endDate,
        tipo,
        estado: showStatusSelector ? estado : undefined,
      });
      setTitle("");
      setDescription("");
      setTags([]);
      setAsignadoA([]);
      setStartDate("");
      setEndDate("");
      setTipo("");
      setEstado("todo");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">
                {initialData ? "Editar Tarea" : "Nueva Tarea"}
              </h2>
              <div className="flex items-center gap-2">
                {initialData && onDelete && (
                  <button 
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Borrar tarea"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {showDeleteConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-sm font-bold text-red-700">{CONFIRM_DELETE_TASK.message}</p>
                  <p className="text-xs text-red-500">{CONFIRM_DELETE_TASK.warning}</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-xs font-bold border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      {CONFIRM_DELETE_TASK.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDelete!(); onClose(); }}
                      className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      {CONFIRM_DELETE_TASK.accept}
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Título</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="¿Qué hay que hacer?"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Añade más detalles..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tipo de Tarea</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-all cursor-pointer font-medium"
                >
                  <option value="">Seleccione un tipo...</option>
                  {contextType === "initiative" ? (
                    <>
                      <option value="PoC">PoC</option>
                      <option value="Presentation">Presentación</option>
                    </>
                  ) : (
                    <>
                      <option value="Run">Run</option>
                      <option value="Build">Build</option>
                    </>
                  )}
                </select>
              </div>

              {showStatusSelector && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Estado</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as "todo" | "in_progress" | "done")}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-all cursor-pointer font-medium"
                  >
                    <option value="todo">Por iniciar</option>
                    <option value="in_progress">En curso</option>
                    <option value="done">Completada</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{TASK_FIELDS.assignedTo}</label>
                <select
                  value=""
                  onChange={(e) => handleAddAssignee(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-all cursor-pointer font-medium"
                >
                  <option value="">{TASK_FIELDS.assignedToPlaceholder}</option>
                  {TASK_FIELDS.assignees
                    .filter((name) => !asignadoA.includes(name))
                    .map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>

                <div className="flex flex-wrap gap-2 mt-3">
                  {asignadoA.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200 group"
                    >
                      <User size={12} className="text-blue-400" />
                      {name}
                      <button
                        type="button"
                        onClick={() => removeAssignee(name)}
                        className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Etiquetas</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Añadir etiqueta..."
                    className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium border border-zinc-200 group"
                    >
                      <TagIcon size={12} className="text-zinc-400" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10"
                >
                  {initialData ? "Guardar Cambios" : "Crear Tarea"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
