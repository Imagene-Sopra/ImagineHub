import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, orderBy, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Initiative, Task } from "../types";
import { Plus, Sparkles, ChevronLeft, Trash2, Loader2, Pencil, Lock, Unlock, User, GripVertical } from "lucide-react";
import { geminiService } from "../services/geminiService";
import { cn } from "../lib/utils";
import { CONFIRM_DELETE_TASK } from "../lib/constants";
import { TaskModal } from "../components/TaskModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableTaskCard = ({ task, status, onMove, onDelete, onGenerate, onEditTask }: any) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="p-4 bg-white border border-zinc-100 rounded-xl shadow-sm hover:border-zinc-300 transition-all group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-start gap-2 flex-1">
          <button 
            {...attributes} 
            {...listeners}
            className="mt-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          <h4 className="font-bold text-zinc-900 leading-tight">{task.titulo}</h4>
        </div>
        <div className="flex items-center gap-1 transition-all">
          <button 
            onClick={() => onEditTask(task)}
            className="p-1 text-zinc-400 hover:text-blue-500"
            title="Editar tarea"
          >
            <Pencil size={14} />
          </button>
          <button 
            onClick={() => setConfirmDelete(true)}
            className="p-1 text-zinc-400 hover:text-red-500"
            title="Eliminar tarea"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="absolute inset-0 z-10 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-sm font-bold text-zinc-800">{CONFIRM_DELETE_TASK.message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs font-bold border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              {CONFIRM_DELETE_TASK.cancel}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {CONFIRM_DELETE_TASK.accept}
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-500 line-clamp-2 mb-4 ml-6">{task.descripcion || "Sin descripción"}</p>
      
      {task.tipo && (
        <div className="mb-4 ml-6 flex">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm",
            task.tipo === "PoC" && "bg-indigo-50 border-indigo-200 text-indigo-700",
            task.tipo === "Presentation" && "bg-purple-50 border-purple-200 text-purple-705",
            task.tipo === "Build" && "bg-amber-100 border-amber-300 text-amber-800",
            task.tipo === "Run" && "bg-red-50 border-red-200 text-red-600"
          )}>
            {task.tipo === "Presentation" ? "Presentación" : task.tipo}
          </span>
        </div>
      )}
      
      {(task.fechaInicio || task.fechaFin) && (
        <div className="flex items-center gap-3 mb-4 ml-6 text-[10px] text-zinc-500 font-medium">
          {task.fechaInicio && (
            <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              Inicio: {task.fechaInicio}
            </span>
          )}
          {task.fechaFin && (
            <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              Fin: {task.fechaFin}
            </span>
          )}
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4 ml-6">
          {task.tags.map((tag: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-medium border border-zinc-200">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between ml-6">
        <div className="flex gap-1">
          {status !== "todo" && (
            <button 
              onClick={() => onMove(task.id, status === "done" ? "in_progress" : "todo")}
              className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 bg-zinc-100 rounded hover:bg-zinc-200"
            >
              ←
            </button>
          )}
          {status !== "done" && (
            <button 
              onClick={() => onMove(task.id, status === "todo" ? "in_progress" : "done")}
              className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 bg-zinc-100 rounded hover:bg-zinc-200"
            >
              →
            </button>
          )}
        </div>
        
        {!task.descripcion && (
          <button 
            onClick={() => onGenerate(task)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
          >
            <Sparkles size={10} /> AI DESC
          </button>
        )}
      </div>
    </div>
  );
};

const Column = ({ title, status, tasks, onMove, onAdd, onDelete, onGenerate, onEditTask }: any) => {
  return (
    <div className="flex-1 min-w-[300px] bg-zinc-50/50 rounded-2xl p-4 flex flex-col h-full border border-zinc-100">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">{title}</h3>
          <span className="bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full text-xs font-bold">{tasks.length}</span>
        </div>
        {status === "todo" && (
          <button onClick={onAdd} className="p-1 hover:bg-zinc-200 rounded-md transition-colors">
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        <SortableContext 
          items={tasks.map((t: Task) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task: Task) => (
            <SortableTaskCard 
              key={task.id}
              task={task}
              status={status}
              onMove={onMove}
              onDelete={onDelete}
              onGenerate={onGenerate}
              onEditTask={onEditTask}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export const InitiativeDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!id) return;

    const unsubInit = onSnapshot(doc(db, "initiatives", id), (snap) => {
      if (snap.exists()) {
        setInitiative({ id: snap.id, ...snap.data() } as Initiative);
      } else {
        navigate("/initiatives");
      }
    });

    const qTasks = query(collection(db, "initiatives", id, "tasks"), orderBy("createdAt", "asc"));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      // Client-side sort to ensure tasks without 'orden' aren't hidden
      taskList.sort((a, b) => {
        const orderA = a.orden ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.orden ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setTasks(taskList);
      setLoading(false);
    });

    return () => {
      unsubInit();
      unsubTasks();
    };
  }, [id, navigate]);

  const handleAddTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (data: { titulo: string; descripcion: string; tags: string[]; asignadoA: string[]; fechaInicio?: string; fechaFin?: string; tipo?: "PoC" | "Presentation" | "Run" | "Build" | "" }) => {
    if (!id) return;

    if (taskToEdit) {
      await updateDoc(doc(db, "initiatives", id, "tasks", taskToEdit.id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Find max order
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.orden || 0)) : 0;
      
      const docRef = await addDoc(collection(db, "initiatives", id, "tasks"), {
        ...data,
        estado: "todo",
        iniciativaId: id,
        creadorId: "guest",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        orden: maxOrder + 1,
      });

      await addDoc(collection(db, "news"), {
        titulo: `Nueva tarea en ${initiative?.nombre}`,
        descripcion: `Se ha añadido la tarea: ${data.titulo}`,
        tipo: "tarea",
        referenciaId: id,
        usuarioId: "guest",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: Task["estado"]) => {
    if (!id) return;
    const taskRef = doc(db, "initiatives", id, "tasks", taskId);
    
    await updateDoc(taskRef, {
      estado: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);

    if (!activeTask || !overTask || activeTask.estado !== overTask.estado) return;

    const columnTasks = tasks.filter(t => t.estado === activeTask.estado);
    const oldIndex = columnTasks.findIndex(t => t.id === active.id);
    const newIndex = columnTasks.findIndex(t => t.id === over.id);

    const newColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);
    
    // Update orders in Firestore
    const batch = writeBatch(db);
    newColumnTasks.forEach((task, index) => {
      const taskRef = doc(db, "initiatives", id, "tasks", task.id);
      batch.update(taskRef, { orden: index });
    });

    await batch.commit();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!id || !taskId) return;
    try {
      await deleteDoc(doc(db, "initiatives", id, "tasks", taskId));
      setIsTaskModalOpen(false);
      setTaskToEdit(null);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleGenerateDescription = async (task: Task) => {
    if (!id || isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await geminiService.generateTaskDescription(task.titulo);
      const fullDesc = `${result.descripcion}\n\n**Pasos:**\n${result.pasos.map((p: string) => `- ${p}`).join("\n")}\n\n**Documentación:**\n${result.documentacion}`;
      
      await updateDoc(doc(db, "initiatives", id, "tasks", task.id), {
        descripcion: fullDesc,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error generating description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleToggleCloseInitiative = async () => {
    if (!id || !initiative) return;
    const newStatus = initiative.estado === "closed" ? "active" : "closed";
    await updateDoc(doc(db, "initiatives", id), {
      estado: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-zinc-400" /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <button 
          onClick={() => navigate("/initiatives")}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 mb-4 text-sm font-medium"
        >
          <ChevronLeft size={16} /> Volver a iniciativas
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight">{initiative?.nombre}</h2>
                {initiative?.estado === "closed" && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-500 rounded-md text-xs font-bold uppercase border border-zinc-200">
                    <Lock size={12} /> Cerrada
                  </span>
                )}
              </div>
              {initiative?.responsable && (
                <div className="flex items-center gap-2 text-sm text-zinc-600 mt-1">
                  <User size={16} className="text-zinc-400" />
                  <span className="font-medium">Responsable:</span>
                  <span>{initiative.responsable}</span>
                </div>
              )}
              <p className="text-zinc-500 max-w-2xl mt-2">{initiative?.descripcion}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleCloseInitiative}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border",
                initiative?.estado === "closed" 
                  ? "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50" 
                  : "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"
              )}
            >
              {initiative?.estado === "closed" ? (
                <>
                  <Unlock size={16} /> Reabrir Iniciativa
                </>
              ) : (
                <>
                  <Lock size={16} /> Cerrar Iniciativa
                </>
              )}
            </button>
            {isGenerating && (
              <div className="flex items-center gap-2 text-blue-600 font-medium animate-pulse">
                <Sparkles size={20} />
                <span>IA Generando...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <div className={cn(
          "flex-1 flex gap-6 overflow-x-auto pb-4 transition-opacity",
          initiative?.estado === "closed" && "opacity-60 pointer-events-none grayscale-[0.5]"
        )}>
          <Column 
            title="Por hacer" 
            status="todo" 
            tasks={tasks.filter(t => t.estado === "todo")} 
            onMove={handleMoveTask}
            onAdd={handleAddTask}
            onDelete={handleDeleteTask}
            onGenerate={handleGenerateDescription}
            onEditTask={handleEditTask}
          />
          <Column 
            title="En progreso" 
            status="in_progress" 
            tasks={tasks.filter(t => t.estado === "in_progress")} 
            onMove={handleMoveTask}
            onDelete={handleDeleteTask}
            onGenerate={handleGenerateDescription}
            onEditTask={handleEditTask}
          />
          <Column 
            title="Completado" 
            status="done" 
            tasks={tasks.filter(t => t.estado === "done")} 
            onMove={handleMoveTask}
            onDelete={handleDeleteTask}
            onGenerate={handleGenerateDescription}
            onEditTask={handleEditTask}
          />
        </div>
      </DndContext>

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={() => taskToEdit && handleDeleteTask(taskToEdit.id)}
        contextType="initiative"
        initialData={taskToEdit ? {
          titulo: taskToEdit.titulo,
          descripcion: taskToEdit.descripcion || "",
          tags: taskToEdit.tags || [],
          asignadoA: taskToEdit.asignadoA || [],
          fechaInicio: taskToEdit.fechaInicio,
          fechaFin: taskToEdit.fechaFin,
          tipo: taskToEdit.tipo,
        } : undefined}
      />
    </div>
  );
};
