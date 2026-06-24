import React, { useEffect, useMemo, useRef, useState } from "react";
import { collectionGroup, query, onSnapshot, where, collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Task } from "../types";
import { Map, Calendar, Clock, Rocket, Briefcase, AlertTriangle, ShieldAlert, Pencil } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { calculateStartDate, cn } from "../lib/utils";
import { TaskModal } from "../components/TaskModal";

export const Roadmap: React.FC = () => {
  const MONTH_COLUMN_WIDTH = 176;
  const MIN_VISIBLE_MONTHS = 6;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [initiatives, setInitiatives] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoadmapFilters, setSelectedRoadmapFilters] = useState<string[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const parseTaskDate = (value?: string) => {
    if (!value) return null;
    const isoDate = parseISO(value);
    if (isValid(isoDate)) return isoDate;
    const fallbackDate = new Date(value);
    return isValid(fallbackDate) ? fallbackDate : null;
  };

  useEffect(() => {
    // Include both 'todo' and 'in_progress' tasks
    const q = query(collectionGroup(db, "tasks"), where("estado", "in", ["todo", "in_progress"]));
    const unsub = onSnapshot(q, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task))
        .filter(t => t.fechaInicio || t.fechaFin || (t.estimacion && t.fechaFin)); // Keep tasks visible when only end date + duration are provided
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

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      const target = event.target as Node;
      if (!filterMenuRef.current.contains(target)) {
        setIsFilterMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
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
      .map((value) => parseTaskDate(value))
      .filter((date): date is Date => !!date);

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
    const minEndByWindow = endOfMonth(addMonths(rangeStart, MIN_VISIBLE_MONTHS - 1));
    const finalEnd = minEndByWindow.getTime() > rangeEnd.getTime() ? minEndByWindow : rangeEnd;

    return {
      startDate: rangeStart,
      endDate: finalEnd,
      months: eachMonthOfInterval({ start: rangeStart, end: finalEnd }),
    };
  }, [tasks]);

  const roadmapRangeLabel =
    months.length > 0
      ? `${format(months[0], "MMMM yyyy", { locale: es })} - ${format(months[months.length - 1], "MMMM yyyy", { locale: es })}`
      : "";

  const timelineGridTemplate = `repeat(${months.length}, minmax(${MONTH_COLUMN_WIDTH}px, 1fr))`;

  const getRangePosition = (rangeStart: Date, rangeEnd: Date) => {
    const clampedStart = rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd;
    const clampedEnd = rangeStart.getTime() <= rangeEnd.getTime() ? rangeEnd : rangeStart;

    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (totalDays <= 0) return null;

    const startOffset = Math.min(
      totalDays,
      Math.max(0, (clampedStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const endOffset = Math.min(totalDays, (clampedEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (startOffset > totalDays || endOffset < 0) return null;

    const rawWidth = ((endOffset - startOffset) / totalDays) * 100;
    const width = rawWidth <= 0 ? 0.6 : rawWidth;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${width}%`,
    };
  };

  const getTaskRanges = (task: Task) => {
    const plannedStart = task.fechaInicio ? parseTaskDate(task.fechaInicio) : null;
    const plannedEnd = task.fechaFin ? parseTaskDate(task.fechaFin) : null;
    const fallbackDate = plannedEnd || plannedStart;
    const showOnlyDuration = !plannedStart && !!plannedEnd && !!task.estimacion && task.estimacion > 0;

    const plannedRange = showOnlyDuration
      ? null
      : plannedStart && plannedEnd
        ? getRangePosition(plannedStart, plannedEnd)
        : fallbackDate
          ? getRangePosition(fallbackDate, fallbackDate)
          : null;

    // Duration is anchored on end date and rendered even when start date is missing.
    const durationRange = task.estimacion && task.estimacion > 0 && plannedEnd
      ? getRangePosition(calculateStartDate(plannedEnd, task.estimacion), plannedEnd)
      : null;

    return {
      plannedRange,
      durationRange,
      hasAnyRange: !!plannedRange || !!durationRange,
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

  const getTaskDurationColorClasses = (tipo?: string) => {
    switch (tipo) {
      case "PoC":
        return "bg-indigo-300 border-indigo-500 text-indigo-950";
      case "Presentation":
      case "Presentación":
        return "bg-purple-300 border-purple-500 text-purple-950";
      case "Build":
        return "bg-amber-300 border-amber-500 text-amber-950";
      case "Run":
        return "bg-red-300 border-red-500 text-red-950";
      default:
        return "bg-zinc-300 border-zinc-500 text-zinc-950";
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

  const ganttTasks = roadmapTasks.filter((task) => getTaskRanges(task).hasAnyRange);

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

  const representedAssignees = new Set(
    ganttTasks.flatMap((task) => task.asignadoA || []).filter((name) => !!name)
  );

  const roadmapFilterOptions = [
    ...Object.entries(projects)
      .filter(([id, name]) => !!name && representedParentIds.has(`project:${id}`))
      .map(([id, name]) => ({ id: `project:${id}`, type: "project" as const, label: name })),
    ...Object.entries(initiatives)
      .filter(([id, name]) => !!name && representedParentIds.has(`initiative:${id}`))
      .map(([id, name]) => ({ id: `initiative:${id}`, type: "initiative" as const, label: name })),
    ...Array.from(representedAssignees)
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .map((name) => ({ id: `assignee:${name}`, type: "assignee" as const, label: name }))
  ].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

  const filteredRoadmapTasks = ganttTasks.filter((task) => {
    if (selectedRoadmapFilters.length === 0) return true;
    const parentFilterId = task.proyectoId
      ? `project:${task.proyectoId}`
      : task.iniciativaId
        ? `initiative:${task.iniciativaId}`
        : null;
    const assigneeFilterIds = (task.asignadoA || []).map((name) => `assignee:${name}`);
    const taskFilterIds = [parentFilterId, ...assigneeFilterIds].filter((value): value is string => !!value);
    if (taskFilterIds.length === 0) return false;
    return taskFilterIds.some((filterId) => selectedRoadmapFilters.includes(filterId));
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

  const handleSaveTask = async (data: { titulo: string; descripcion: string; tags: string[]; asignadoA: string[]; fechaInicio?: string; fechaFin?: string; tipo?: "PoC" | "Presentation" | "Run" | "Build" | ""; estado?: Task["estado"]; estimacion?: number }) => {
    if (!selectedTask) return;
    const taskPath = selectedTask.iniciativaId
      ? doc(db, "initiatives", selectedTask.iniciativaId, "tasks", selectedTask.id)
      : selectedTask.proyectoId
        ? doc(db, "projects", selectedTask.proyectoId, "tasks", selectedTask.id)
        : null;
    if (!taskPath) return;
    const { estado, ...taskData } = data;
    await updateDoc(taskPath, { ...taskData, ...(estado ? { estado } : {}), updatedAt: new Date().toISOString() });
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
              <p className="text-zinc-400 text-xs mt-1 capitalize">Rango visible: {roadmapRangeLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                className="cursor-pointer text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 bg-white transition-colors"
              >
                Filtrar
                {selectedRoadmapFilters.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-zinc-900 text-white text-[9px] leading-none">
                    {selectedRoadmapFilters.length}
                  </span>
                )}
              </button>
              {isFilterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl z-20 p-2">

                {roadmapFilterOptions.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-zinc-500">No hay elementos para filtrar.</div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Proyectos e iniciativas
                      </div>
                      {roadmapFilterOptions.filter((option) => option.type !== "assignee").length === 0 ? (
                        <div className="px-2 py-2 text-xs text-zinc-500">No hay elementos para filtrar.</div>
                      ) : (
                        roadmapFilterOptions
                          .filter((option) => option.type !== "assignee")
                          .map((option) => (
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
                              <span className="text-[9px] text-zinc-400 uppercase ml-auto">
                                {option.type === "project" ? "Proyecto" : "Iniciativa"}
                              </span>
                            </label>
                          ))
                      )}
                    </div>

                    <div className="border-t border-zinc-100 pt-2">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Asignado a
                      </div>
                      {roadmapFilterOptions.filter((option) => option.type === "assignee").length === 0 ? (
                        <div className="px-2 py-2 text-xs text-zinc-500">No hay personas asignadas para filtrar.</div>
                      ) : (
                        roadmapFilterOptions
                          .filter((option) => option.type === "assignee")
                          .map((option) => (
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
                              <span className="text-[9px] text-zinc-400 uppercase ml-auto">Asignado</span>
                            </label>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>

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
                  <div className="grid flex-1" style={{ gridTemplateColumns: timelineGridTemplate }}>
                    {months.map((month, idx) => (
                      <div
                        key={idx}
                        className="p-4 border-r border-zinc-200 text-center font-bold text-zinc-900 border-b-2 border-transparent"
                      >
                        <span className="capitalize">{format(month, "MMMM", { locale: es })}</span>
                        <span className="text-[10px] text-zinc-400 block tracking-widest">{format(month, "yyyy")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline View */}
                <div className="relative">
                  {/* Grid Lines with high visibility */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    <div className="w-64 border-r border-zinc-200 sticky left-0 bg-white z-10 transition-colors"></div>
                    <div className="grid flex-1" style={{ gridTemplateColumns: timelineGridTemplate }}>
                      {months.map((_, idx) => (
                        <div key={idx} className="border-r border-zinc-200/70"></div>
                      ))}
                    </div>
                  </div>

                  {/* Today Line Overlay */}
                  <div className="absolute inset-y-0 left-0 right-0 pointer-events-none flex" style={{ zIndex: 5 }}>
                    <div className="w-64 sticky left-0 bg-transparent flex-shrink-0"></div>
                    <div className="flex-1 relative h-full min-w-0">
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
                      const { plannedRange, durationRange, hasAnyRange } = getTaskRanges(task);
                      if (!hasAnyRange) return null;
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
                                {task.estimacion && task.estimacion > 0 && (
                                  <span className="text-[9px] bg-orange-100 px-1 rounded text-orange-700 border border-orange-300/80 font-semibold">
                                    Duración: {task.estimacion}d
                                  </span>
                                )}
                              </div>
                              {task.tags?.map((tag, i) => (
                                <span key={i} className="text-[9px] bg-zinc-100 px-1 rounded text-zinc-500 border border-zinc-200/40">
                                  {tag}
                                </span>
                              ))}
                              {task.asignadoA?.map((name, i) => (
                                <span key={i} className="text-[9px] bg-blue-50 px-1 rounded text-blue-600 border border-blue-200/60">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex-1 relative h-14 flex items-center bg-zinc-50/20 min-w-0">
                            {plannedRange && (
                              <div
                                className={cn(
                                  "absolute h-5 top-2 rounded-md shadow-sm flex items-center justify-center border transition-all cursor-pointer",
                                  getTaskColorClasses(task.tipo)
                                )}
                                style={{
                                  left: plannedRange.left,
                                  width: plannedRange.width,
                                }}
                                title={`${fullTitle} (${getTaskStatusLabel(task.estado)}) | Plan: ${task.fechaInicio || "-"} - ${task.fechaFin || "-"} | Punt.: ${task.score}${task.tipo ? ` | Tipo: ${task.tipo === 'Presentation' ? 'Presentación' : task.tipo}` : ''}`}
                              >
                                <span className="px-2 text-[9px] font-bold uppercase tracking-wide truncate max-w-full whitespace-nowrap">
                                  {getTaskStatusLabel(task.estado)}
                                </span>
                              </div>
                            )}

                            {durationRange && (
                              <div
                                className={cn(
                                  "absolute h-5 top-7 rounded-md shadow-sm flex items-center justify-center border transition-all cursor-pointer",
                                  getTaskDurationColorClasses(task.tipo)
                                )}
                                style={{
                                  left: durationRange.left,
                                  width: durationRange.width,
                                }}
                                title={`${fullTitle} | Duración estimada: ${task.estimacion} día${task.estimacion === 1 ? "" : "s"} laborables (desde fecha fin)`}
                              >
                                <span className="px-2 text-[9px] font-black uppercase tracking-wide truncate max-w-full whitespace-nowrap">
                                  Dur. {task.estimacion}d
                                </span>
                              </div>
                            )}
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
          showStatusSelector
          initialData={{
            titulo: selectedTask.titulo,
            descripcion: selectedTask.descripcion || "",
            tags: selectedTask.tags || [],
            asignadoA: selectedTask.asignadoA || [],
            fechaInicio: selectedTask.fechaInicio,
            fechaFin: selectedTask.fechaFin,
            estimacion: selectedTask.estimacion,
            tipo: selectedTask.tipo,
            estado: selectedTask.estado,
          }}
        />
      )}
    </div>
  );
};
