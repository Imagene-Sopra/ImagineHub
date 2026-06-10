import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, collectionGroup, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Project, Task } from "../types";
import { Briefcase, Plus, Search, Calendar, Trash2, Pencil, User, X, Clock, Rocket, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CONFIRM_DELETE_PROJECT, SECTION_NAMES } from "../lib/constants";
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

const SortableProjectCard = ({ project, taskCounts, handleEdit, setShowDeleteConfirm, showDeleteConfirm, handleDelete }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id });

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
      className="group p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-zinc-200 transition-all flex flex-col h-full relative"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <button 
            {...attributes} 
            {...listeners}
            className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={20} />
          </button>
          <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
            <Briefcase size={24} />
          </div>
          <h3 className="text-lg font-bold leading-tight">{project.nombre}</h3>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => handleEdit(project)}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(project.id)}
            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <Link to={`/projects/${project.id}`} className="flex-1">
        <p className="text-zinc-500 text-sm line-clamp-3 mb-4">{project.descripcion}</p>
        
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
            <Clock size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-700">{taskCounts[project.id]?.todo || 0} To Do</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
            <Rocket size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700">{taskCounts[project.id]?.in_progress || 0} En Progreso</span>
          </div>
        </div>

        {project.responsable && (
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-4 bg-zinc-50 px-2 py-1.5 rounded-lg w-fit">
            <User size={14} className="text-zinc-400" />
            <span className="font-medium">Responsable:</span>
            <span>{project.responsable}</span>
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-50 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{format(new Date(project.createdAt), "d MMM, yyyy", { locale: es })}</span>
        </div>
        <Link to={`/projects/${project.id}`} className="font-medium text-zinc-900 hover:underline">
          Ver detalles →
        </Link>
      </div>

      {showDeleteConfirm === project.id && (
        <div className="absolute inset-0 bg-white/95 rounded-2xl flex items-center justify-center p-6 z-10 animate-in fade-in zoom-in duration-200">
          <div className="text-center">
            <p className="font-bold text-zinc-900 mb-1">{CONFIRM_DELETE_PROJECT.message}</p>
            <p className="text-xs text-zinc-500 mb-4">{CONFIRM_DELETE_PROJECT.warning}</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                {CONFIRM_DELETE_PROJECT.cancel}
              </button>
              <button 
                onClick={() => handleDelete(project.id)}
                className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                {CONFIRM_DELETE_PROJECT.accept}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { todo: number, in_progress: number }>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ nombre: "", descripcion: "", responsable: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const projList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      // Client-side sort to ensure projects without 'orden' aren't hidden
      projList.sort((a, b) => {
        const orderA = a.orden ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.orden ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // desc
      });
      setProjects(projList);
    });

    const qTasks = query(collectionGroup(db, "tasks"));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const counts: Record<string, { todo: number, in_progress: number }> = {};
      snap.docs.forEach(doc => {
        const data = doc.data() as Task;
        if (data.proyectoId) {
          if (!counts[data.proyectoId]) {
            counts[data.proyectoId] = { todo: 0, in_progress: 0 };
          }
          if (data.estado === "todo") counts[data.proyectoId].todo++;
          if (data.estado === "in_progress") counts[data.proyectoId].in_progress++;
        }
      });
      setTaskCounts(counts);
    });

    return () => {
      unsub();
      unsubTasks();
    };
  }, []);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex(p => p.id === active.id);
    const newIndex = projects.findIndex(p => p.id === over.id);

    const newProjects = arrayMove(projects, oldIndex, newIndex);
    setProjects(newProjects);

    const batch = writeBatch(db);
    newProjects.forEach((proj, index) => {
      batch.update(doc(db, "projects", proj.id), { orden: index });
    });

    await batch.commit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const projectData = {
      nombre: newProject.nombre,
      descripcion: newProject.descripcion,
      responsable: newProject.responsable,
      updatedAt: new Date().toISOString(),
    };

    if (editingProject) {
      await updateDoc(doc(db, "projects", editingProject.id), projectData);
    } else {
      const maxOrder = projects.length > 0 ? Math.max(...projects.map(p => p.orden || 0)) : 0;
      
      const docRef = await addDoc(collection(db, "projects"), {
        ...projectData,
        estado: "active",
        createdBy: "guest",
        createdAt: new Date().toISOString(),
        orden: maxOrder + 1,
      });

      // Create news
      await addDoc(collection(db, "news"), {
        titulo: `Nuevo SQUAD: ${newProject.nombre}`,
        descripcion: `Se ha iniciado un nuevo SQUAD estratégico.`,
        tipo: "squad",
        referenciaId: docRef.id,
        usuarioId: "guest",
        createdAt: new Date().toISOString(),
      });
    }

    setNewProject({ nombre: "", descripcion: "", responsable: "" });
    setEditingProject(null);
    setShowModal(false);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setNewProject({
      nombre: project.nombre,
      descripcion: project.descripcion,
      responsable: project.responsable || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "projects", id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{SECTION_NAMES.squad}</h2>
          <p className="text-zinc-500">Gestión de proyectos y entregables.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProject(null);
            setNewProject({ nombre: "", descripcion: "", responsable: "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus size={20} />
          <span>Nuevo SQUAD</span>
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SortableContext 
            items={projects.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {projects.map((project) => (
              <SortableProjectCard 
                key={project.id}
                project={project}
                taskCounts={taskCounts}
                handleEdit={handleEdit}
                setShowDeleteConfirm={setShowDeleteConfirm}
                showDeleteConfirm={showDeleteConfirm}
                handleDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingProject ? "Editar SQUAD" : "Crear SQUAD"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-900">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  value={newProject.nombre}
                  onChange={e => setNewProject({...newProject, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  placeholder="Ej: Proyecto de Transformación Digital"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Responsable</label>
                <input 
                  type="text" 
                  value={newProject.responsable}
                  onChange={e => setNewProject({...newProject, responsable: e.target.value})}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  placeholder="Nombre del responsable..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Descripción</label>
                <textarea 
                  required
                  rows={4}
                  value={newProject.descripcion}
                  onChange={e => setNewProject({...newProject, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  placeholder="Describe los objetivos y alcance..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  {editingProject ? "Guardar Cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
