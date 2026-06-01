import React, { useEffect, useMemo, useState } from "react";
import { collectionGroup, query, onSnapshot, where, collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Task } from "../types";
import { Map, Calendar, Clock, Rocket, Briefcase, AlertTriangle, ShieldAlert, Pencil } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "../lib/utils";
import { TaskModal } from "../components/TaskModal";

export const Roadmap: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [initiatives, setInitiatives] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoadmapFilters, setSelectedRoadmapFilters] = useState<string[]>([]);

  useEffect(() => {
    // Include both 'todo' and 'in_progress' tasks
    const q = query(collectionGroup(db, "tasks"), where("estado", "in", ["todo", "in_progress"]));
    const unsub = onSnapshot(q, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task))
        .filter(t => t.fechaInicio || t.fechaFin); // Only tasks with dates
      setTasks(taskList);
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      const projMap: Record<string, string> = {};
      snap.docs.forEach(doc => {
        projMap[doc.id] = doc.data().nombre || "";
      });
      setProjects(projMap);
    });

    const unsubInitiatives = onSnapshot(collection(db, "initiatives"), (snap) => {
      const initMap: Record<string, string> = {};
      snap.docs.forEach(doc => {
        initMap[doc.id] = doc.data().nombre || "";
      });
      setInitiatives(initMap);
    });

    return () => {
      unsub();
      unsubProjects();
      unsubInitiatives();
    };
  }, []);

  const getParentName = (task: Task) => {
    if (task.proyectoId) {
      return projects[task.proyectoId] || "";
    }
    if (task.iniciativaId) {
      return initiatives[task.iniciativaId] || "";
    }
    return "";
  };

  const { startDate, endDate, months } = useMemo(() => {
    const taskDates = tasks
      .flatMap((task) => [task.fechaInicio, task.fechaFin])
      .filter((value): value is string => !!value)
      .map((value) => parseISO(value))
      .filter((date) => isValid(date));

    if (taskDates.length === 0) {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return {
        startDate: monthStart,
        endDate: monthEnd,
        months: eachMonthOfInterval({ start: monthStart, end: monthEnd }),
      };
    }

    let minDate = taskDates[0];
    let maxDate = taskDates[0];

    taskDates.forEach((date) => {
      if (date.getTime() < minDate.getTime()) minDate = date;
      if (date.getTime() > maxDate.getTime()) maxDate = date;
    });

    const rangeStart = startOfMonth(minDate);
    const rangeEnd = endOfMonth(maxDate);

    return {
      startDate: rangeStart,
      endDate: rangeEnd,
      months: eachMonthOfInterval({ start: rangeStart, end: rangeEnd }),
    };
  }, [tasks]);

  const getTaskPosition = (task: Task) => {
    if (!task.fechaInicio && !task.fechaFin) return null;

    const tStart = task.fechaInicio ? parseISO(task.fechaInicio) : parseISO(task.fechaFin!);
    const tEnd = task.fechaFin ? parseISO(task.fechaFin) : parseISO(task.fechaInicio!);

    if (!isValid(tStart) || !isValid(tEnd)) return null;

    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Clamp to roadmap bounds
    const startOffset = Math.max(0, (tStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const endOffset = Math.min(totalDays, (tEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (startOffset > totalDays || endOffset < 0) return null;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${((endOffset - startOffset) / totalDays) * 100}%`,
    };
  };

  const getTaskColorClasses = (tipo?: string) => {
    switch (tipo) {
      case "PoC":
        return "bg-indigo-100 hover:bg-indigo-200 border-indigo-300 text-indigo-950"; // Lavender/Indigo
      case "Presentation":
      case "Presentación":
        return "bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-950"; // Light Purple
      case "Build":
        return "bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-950"; // Dark Yellow/Amber
      case "Run":
        return "bg-red-100/80 hover:bg-red-200/80 border-red-300 text-red-950"; // Soft Red
      default:
        return "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-950"; // Default Gray
    }
  };

  const getTaskDetails = (task: Task) => {
    const tipo = (task.tipo as string) || "";
    let criticidad = "-";
    let baseScore = 0;

    if (tipo === "Run") {
      criticidad = "P1";
      baseScore = 100;
    } else if (tipo === "Build") {
      criticidad = "P2";
      baseScore = 90;
    } else if (tipo === "Presentation" || tipo === "Presentación") {
      criticidad = "P3";
      baseScore = 80;
    } else if (tipo === "PoC") {
      criticidad = "P4";
      baseScore = 70;
    }

    let score = baseScore;
    let daysDiffMessage = "";

    if (task.fechaFin) {
      const today = new Date();
      const end = new Date(task.fechaFin);

      const d1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const d2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

      const millisecondsPerDay = 1000 * 60 * 60 * 24;
      const diffDays = Math.floor((d2 - d1) / millisecondsPerDay);

      if (diffDays >= 0) {
        score = baseScore - diffDays;
        daysDiffMessage = `Quedan ${diffDays} día${diffDays === 1 ? "" : "s"}`;
      } else {
        const pastDays = Math.abs(diffDays);
        score = baseScore + pastDays;
        daysDiffMessage = `Vencido hace ${pastDays} día${pastDays === 1 ? "" : "s"}`;
      }
    }

    return {
      criticidad,
      score,
      daysDiffMessage,
    };
  };

  const roadmapTasks = tasks
    .map((task) => {
      const details = getTaskDetails(task);
      return {
        ...task,
        ...details,
      };
    })
    .sort((a, b) => b.score - a.score);

  const ganttTasks = roadmapTasks.filter((task) => !!getTaskPosition(task));

  const representedParentIds = new Set(
    ganttTasks
      .map((task) =>
        task.proyectoId
          ? `project:${task.proyectoId}`
          : task.iniciativaId
            ? `initiative:${task.iniciativaId}`
            : null
      )
      .filter((value): value is string => !!value)
  );

  const roadmapFilterOptions = [
    ...Object.entries(projects)
      .filter(([id, name]) => !!name && representedParentIds.has(`project:${id}`))
      .map(([id, name]) => ({ id: `project:${id}`, type: "project" as const, label: name })),
    ...Object.entries(initiatives)
      .filter(([id, name]) => !!name && representedParentIds.has(`initiative:${id}`))
      .map(([id, name]) => ({ id: `initiative:${id}`, type: "initiative" as const, label: name }))
  ].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

  const filteredRoadmapTasks = ganttTasks.filter((task) => {
    if (selectedRoadmapFilters.length === 0) return true;
    const parentFilterId = task.proyectoId
      ? `project:${task.proyectoId}`
      : task.iniciativaId
        ? `initiative:${task.iniciativaId}`
        : null;
    if (!parentFilterId) return false;
    return selectedRoadmapFilters.includes(parentFilterId);
  });

  const toggleRoadmapFilter = (filterId: string) => {
    setSelectedRoadmapFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (data: { titulo: string; descripcion: string; tags: string[]; fechaInicio?: string; fechaFin?: string; tipo?: "PoC" | "Presentation" | "Run" | "Build" | "" }) => {
    if (!selectedTask) return;
    const taskPath = selectedTask.iniciativaId
      ? doc(db, "initiatives", selectedTask.iniciativaId, "tasks", selectedTask.id)
      : selectedTask.proyectoId
        ? doc(db, "projects", selectedTask.proyectoId, "tasks", selectedTask.id)
        : null;
    if (!taskPath) return;
    await updateDoc(taskPath, { ...data, updatedAt: new Date().toISOString() });
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    const taskPath = selectedTask.iniciativaId
      ? doc(db, "initiatives", selectedTask.iniciativaId, "tasks", selectedTask.id)
      : selectedTask.proyectoId
        ? doc(db, "projects", selectedTask.proyectoId, "tasks", selectedTask.id)
        : null;
    if (!taskPath) return;
    await deleteDoc(taskPath);
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const getTaskStatusLabel = (estado: Task["estado"]) => {
    if (estado === "in_progress") return "En curso";
    if (estado === "done") return "Completada";
    return "Por iniciar";
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden">
      <div className="p-8 border-b border-zinc-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Map size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Roadmap de Tareas</h1>
              <p className="text-zinc-500 text-sm">Visualización temporal de tareas por iniciar y en curso</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <details className="relative group">
              <summary className="list-none cursor-pointer text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 bg-white transition-colors">
                Filtrar
                {selectedRoadmapFilters.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-zinc-900 text-white text-[9px] leading-none">
                    {selectedRoadmapFilters.length}
                  </span>
                )}
              </summary>
              <div className="absolute right-0 top-full mt-2 w-72 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl z-20 p-2">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Proyectos e iniciativas
                </div>
                {roadmapFilterOptions.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-zinc-500">No hay elementos para filtrar.</div>
                ) : (
                  roadmapFilterOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoadmapFilters.includes(option.id)}
                        onChange={() => toggleRoadmapFilter(option.id)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                      />
                      <span className="text-xs text-zinc-700 truncate">{option.label}</span>
                      <span className="text-[9px] text-zinc-400 uppercase ml-auto">{option.type === "project" ? "Proyecto" : "Iniciativa"}</span>
                    </label>
                  ))
                )}
              </div>
            </details>

            {/* Core Legend of Types */}
            <div className="flex flex-wrap items-center gap-2 bg-zinc-50 p-3 rounded-2xl border border-zinc-150">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mr-1">Leyenda:</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-red-50 border-red-200 text-red-600">Run</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-amber-100 border-amber-300 text-amber-800">Build</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-purple-50 border-purple-200 text-purple-700">Presentación</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-indigo-50 border-indigo-200 text-indigo-700">PoC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Clock className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-dashed border-zinc-200">
            <Calendar className="text-zinc-200 mb-4" size={48} />
            <p className="text-zinc-500 font-medium">No hay tareas por iniciar o en curso con fechas programadas</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Header Months */}
                <div className="flex border-b border-zinc-200">
                  <div className="w-64 border-r border-zinc-200 p-4 font-bold text-zinc-500 text-xs uppercase tracking-wider sticky left-0 bg-white z-10">
                    Tarea / Proyecto
                  </div>
                  {months.map((month, idx) => (
                    <div key={idx} className="w-44 shrink-0 p-4 border-r border-zinc-200 text-center font-bold text-zinc-900 border-b-2 border-transparent">
                      <span className="capitalize">{format(month, "MMMM", { locale: es })}</span>
                      <span className="text-[10px] text-zinc-400 block tracking-widest">{format(month, "yyyy")}</span>
                    </div>
                  ))}
                </div>

                {/* Timeline View */}
                <div className="relative">
                  {/* Grid Lines with high visibility */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    <div className="w-64 border-r border-zinc-200 sticky left-0 bg-white z-10 transition-colors"></div>
                    {months.map((_, idx) => (
                      <div key={idx} className="w-44 shrink-0 border-r border-zinc-200/70"></div>
                    ))}
                  </div>

                  {/* Today Line Overlay */}
                  <div className="absolute inset-y-0 left-0 right-0 pointer-events-none flex" style={{ zIndex: 5 }}>
                    <div className="w-64 sticky left-0 bg-transparent flex-shrink-0"></div>
                    <div className="flex-1 relative h-full">
                      <div
                        className="absolute inset-y-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] flex flex-col items-center"
                        style={{
                          left: `${(Math.max(0, Math.min(1, (new Date().getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())))) * 100}%`
                        }}
                      >
                        <div className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-md whitespace-nowrap mt-2 transform -translate-y-1">
                          HOY
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks with high visibility horizontal separation lines */}
                  <div className="divide-y divide-zinc-200">
                    {filteredRoadmapTasks.map((task) => {
                      const pos = getTaskPosition(task);
                      if (!pos) return null;
                      const parentName = getParentName(task);
                      const fullTitle = parentName ? `${parentName} - ${task.titulo}` : task.titulo;

                      return (
                        <div key={task.id} className="flex items-center group hover:bg-zinc-50 border-b border-zinc-200/60 last:border-b-0 transition-colors">
                          <div className="w-64 border-r border-zinc-200 p-4 sticky left-0 bg-white z-10 group-hover:bg-zinc-50 transition-colors flex-shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                              {task.proyectoId ? (
                                <Briefcase size={12} className="text-zinc-450" />
                              ) : (
                                <Rocket size={12} className="text-zinc-450" />
                              )}
                              <button
                                onClick={() => handleEditTask(task)}
                                className="flex items-center gap-1 group/title min-w-0"
                                title={`Editar: ${fullTitle}`}
                              >
                                <h4 className="text-xs font-bold text-zinc-900 truncate group-hover/title:text-blue-600 transition-colors">
                                  {fullTitle}
                                </h4>
                                <Pencil size={10} className="shrink-0 text-zinc-300 group-hover/title:text-blue-500 transition-colors" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1 items-center">
                              <div className="flex items-center gap-1">
                                {task.tipo === "Run" && task.score > 100 && (
                                  <ShieldAlert size={12} className="shrink-0 text-red-600" />
                                )}
                                {task.tipo === "Run" && task.score >= 98 && task.score <= 100 && (
                                  <AlertTriangle size={12} className="shrink-0 text-orange-500" />
                                )}
                                {task.tipo === "Build" && task.score > 90 && (
                                  <ShieldAlert size={12} className="shrink-0 text-red-600" />
                                )}
                                {task.tipo === "Build" && task.score >= 88 && task.score <= 90 && (
                                  <AlertTriangle size={12} className="shrink-0 text-orange-500" />
                                )}
                                {task.tipo === "Presentation" && task.score > 80 && (
                                  <ShieldAlert size={12} className="shrink-0 text-red-600" />
                                )}
                                {task.tipo === "Presentation" && task.score >= 78 && task.score <= 80 && (
                                  <AlertTriangle size={12} className="shrink-0 text-orange-500" />
                                )}
                                {task.tipo === "PoC" && task.score > 70 && (
                                  <ShieldAlert size={12} className="shrink-0 text-red-600" />
                                )}
                                {task.tipo === "PoC" && task.score >= 68 && task.score <= 70 && (
                                  <AlertTriangle size={12} className="shrink-0 text-orange-500" />
                                )}
                                <span className={cn(
                                  "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm",
                                  task.tipo === "PoC" && "bg-indigo-50 border-indigo-200 text-indigo-700",
                                  task.tipo === "Presentation" && "bg-purple-50 border-purple-200 text-purple-700",
                                  task.tipo === "Run" && "bg-red-50 border-red-200 text-red-600",
                                  task.tipo === "Build" && "bg-amber-100 border-amber-300 text-amber-800",
                                  !task.tipo && "bg-zinc-100 border-zinc-200 text-zinc-600"
                                )}>
                                  Punt. {task.score}
                                </span>
                              </div>
                              {task.tags?.slice(0, 2).map((tag, i) => (
                                <span key={i} className="text-[9px] bg-zinc-100 px-1 rounded text-zinc-500 border border-zinc-200/40">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex-1 relative h-12 flex items-center bg-zinc-50/20">
                            <div
                              className={cn(
                                "absolute h-6 rounded-lg shadow-sm flex items-center justify-center border transition-all cursor-pointer",
                                getTaskColorClasses(task.tipo)
                              )}
                              style={{
                                left: pos.left,
                                width: pos.width,
                              }}
                              title={`${fullTitle} (${getTaskStatusLabel(task.estado)}) | Punt.: ${task.score}${task.tipo ? ` | Tipo: ${task.tipo === 'Presentation' ? 'Presentación' : task.tipo}` : ''}`}
                            >
                              <span className="px-2 text-[9px] font-bold uppercase tracking-wide truncate max-w-full whitespace-nowrap">
                                {getTaskStatusLabel(task.estado)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedTask(null); }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          contextType={selectedTask.proyectoId ? "project" : "initiative"}
          initialData={{
            titulo: selectedTask.titulo,
            descripcion: selectedTask.descripcion || "",
            tags: selectedTask.tags || [],
            fechaInicio: selectedTask.fechaInicio,
            fechaFin: selectedTask.fechaFin,
            tipo: selectedTask.tipo,
          }}
        />
      )}
    </div>
  );
};
