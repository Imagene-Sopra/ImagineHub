import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, collectionGroup, where } from "firebase/firestore";
import { db } from "../firebase";
import { News, Initiative, Task, Session } from "../types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Rocket, CheckCircle2, MessageSquare, Calendar as CalendarIcon, ArrowRight, AlertTriangle, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

const NewsIcon = ({ type }: { type: News["tipo"] }) => {
  switch (type) {
    case "iniciativa": return <Rocket size={18} className="text-blue-500" />;
    case "tarea": return <CheckCircle2 size={18} className="text-green-500" />;
    case "foro": return <MessageSquare size={18} className="text-purple-500" />;
    case "sesion": return <CalendarIcon size={18} className="text-amber-500" />;
    default: return null;
  }
};

export const Dashboard: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [latestInitiatives, setLatestInitiatives] = useState<Initiative[]>([]);
  const [activeInitiativesCount, setActiveInitiativesCount] = useState<number>(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState<number>(0);
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);
  const [upcomingSessionsCount, setUpcomingSessionsCount] = useState<number>(0);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [initiativesMap, setInitiativesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const qNews = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(10));
    const unsubNews = onSnapshot(qNews, (snap) => {
      setNews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    });

    const qLatestInit = query(collection(db, "initiatives"), orderBy("createdAt", "desc"), limit(3));
    const unsubLatestInit = onSnapshot(qLatestInit, (snap) => {
      setLatestInitiatives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative)));
    });

    // Count active initiatives (treating missing estado as active)
    const unsubActiveInit = onSnapshot(collection(db, "initiatives"), (snap) => {
      const activeCount = snap.docs.filter(doc => doc.data().estado !== "closed").length;
      setActiveInitiativesCount(activeCount);

      const initMap: Record<string, string> = {};
      snap.docs.forEach(doc => {
        initMap[doc.id] = doc.data().nombre || "";
      });
      setInitiativesMap(initMap);
    });

    // Count active projects (treating missing estado as active)
    const unsubActiveProj = onSnapshot(collection(db, "projects"), (snap) => {
      const activeCount = snap.docs.filter(doc => doc.data().estado !== "closed").length;
      setActiveProjectsCount(activeCount);

      const projMap: Record<string, string> = {};
      snap.docs.forEach(doc => {
        projMap[doc.id] = doc.data().nombre || "";
      });
      setProjectsMap(projMap);
    });

    // Count in-progress tasks across all initiatives using collectionGroup
    const qTasks = query(
      collectionGroup(db, "tasks"), 
      where("estado", "==", "in_progress")
    );
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setActiveTasksCount(snap.size);
    });

    // Count upcoming sessions
    const now = new Date().toISOString();
    const qSessions = query(
      collection(db, "sessions"),
      where("fechaInicio", ">=", now)
    );
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      setUpcomingSessionsCount(snap.size);
    });

    // Load pending tasks (todo or in_progress) to calculate pending scores
    const qPendingTasks = query(
      collectionGroup(db, "tasks"),
      where("estado", "in", ["todo", "in_progress"])
    );
    const unsubPendingTasks = onSnapshot(qPendingTasks, (snap) => {
      setPendingTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    return () => {
      unsubNews();
      unsubLatestInit();
      unsubActiveInit();
      unsubActiveProj();
      unsubTasks();
      unsubSessions();
      unsubPendingTasks();
    };
  }, []);

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
        daysDiffMessage = `Quedan ${diffDays} día${diffDays === 1 ? '' : 's'}`;
      } else {
        const pastDays = Math.abs(diffDays);
        score = baseScore + pastDays;
        daysDiffMessage = `Vencido hace ${pastDays} día${pastDays === 1 ? '' : 's'}`;
      }
    }

    return {
      criticidad,
      score,
      daysDiffMessage,
      dotColorClass: tipo === "PoC" ? "bg-indigo-300 border border-indigo-400"                       // Lavanda
                   : tipo === "Presentation" || tipo === "Presentación" ? "bg-purple-200 border border-purple-300" // Morado clarito
                   : tipo === "Build" ? "bg-amber-600 border border-amber-700"                   // Amarillo oscuro
                   : tipo === "Run" ? "bg-red-400 border border-red-500"                         // Rojo tenue
                   : "bg-zinc-350"
    };
  };

  const filteredTasks = pendingTasks
    .filter(task => {
      const hasFechaFin = !!task.fechaFin;
      const hasTipo = !!task.tipo;
      const isPending = task.estado === "todo" || task.estado === "in_progress";
      return hasFechaFin && hasTipo && isPending;
    })
    .map(task => {
      const details = getTaskDetails(task);
      const parentName = task.proyectoId 
        ? (projectsMap[task.proyectoId] || "") 
        : (task.iniciativaId ? (initiativesMap[task.iniciativaId] || "") : "");
      const fullTitle = parentName ? `${parentName} - ${task.titulo}` : task.titulo;
      return {
        ...task,
        ...details,
        fullTitle
      };
    })
    .sort((a, b) => b.score - a.score);

  const getTaskStatusMeta = (estado: Task["estado"]) => {
    if (estado === "in_progress") {
      return {
        label: "En curso",
        className: "bg-blue-50 border-blue-200 text-blue-700"
      };
    }

    if (estado === "done") {
      return {
        label: "Completada",
        className: "bg-emerald-50 border-emerald-200 text-emerald-700"
      };
    }

    return {
      label: "Pendiente",
      className: "bg-zinc-100 border-zinc-200 text-zinc-700"
    };
  };

  const getTaskScoreAlert = (tipo: Task["tipo"], score: number) => {
    if (tipo === "Run") {
      if (score > 100) return "danger";
      if (score >= 98 && score <= 100) return "warning";
      return null;
    }

    if (tipo === "Build") {
      if (score > 90) return "danger";
      if (score >= 88 && score <= 90) return "warning";
      return null;
    }

    if (tipo === "Presentation") {
      if (score > 80) return "danger";
      if (score >= 78 && score <= 80) return "warning";
      return null;
    }

    if (tipo === "PoC") {
      if (score > 70) return "danger";
      if (score >= 68 && score <= 70) return "warning";
      return null;
    }

    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Stats & Initiatives */}
        <div className="md:col-span-7 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">Últimas Iniciativas</h2>
              <Link to="/initiatives" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {latestInitiatives.map((init) => (
                <Link 
                  key={init.id} 
                  to={`/initiatives/${init.id}`}
                  className="p-5 border border-zinc-100 rounded-xl hover:border-zinc-300 transition-all bg-white shadow-sm group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Rocket size={20} />
                    </div>
                    <h3 className="font-bold text-zinc-900">{init.nombre}</h3>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{init.descripcion}</p>
                  <div className="text-xs text-zinc-400">
                    Creada {formatDistanceToNow(new Date(init.createdAt), { addSuffix: true, locale: es })}
                  </div>
                </Link>
              ))}
              {latestInitiatives.length === 0 && (
                <div className="col-span-2 p-8 border border-dashed border-zinc-200 rounded-xl text-center text-zinc-500">
                  No hay iniciativas activas. ¡Crea la primera!
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight mb-4">Actividad Reciente</h2>
            <div className="space-y-4">
              {news.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  <div className="mt-1">
                    <NewsIcon type={item.tipo} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">{item.titulo}</p>
                    <p className="text-sm text-zinc-500">{item.descripcion}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </motion.div>
              ))}
              {news.length === 0 && (
                <div className="p-8 text-center text-zinc-500">Sin actividad reciente.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Quick Actions / Summary */}
        <div className="md:col-span-5 space-y-8">
          <div className="p-6 bg-zinc-900 rounded-2xl text-white shadow-xl">
            <h3 className="text-lg font-bold mb-2">Estado de la Compañía</h3>
            <p className="text-zinc-400 text-sm mb-6">Resumen rápido de lo que está pasando hoy.</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Iniciativas activas</span>
                <span className="font-bold">{activeInitiativesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Proyectos activos</span>
                <span className="font-bold">{activeProjectsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Tareas en curso</span>
                <span className="font-bold">{activeTasksCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Próximas sesiones</span>
                <span className="font-bold">{upcomingSessionsCount}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-900 text-base">Tareas pendientes</h3>
              <div className="flex items-center gap-2">
                <Link
                  to="/roadmap"
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                >
                  Ver roadmap
                </Link>
                <span className="text-[10px] bg-zinc-100 px-2.5 py-0.5 rounded-full text-zinc-500 font-bold">
                  {filteredTasks.length}
                </span>
              </div>
            </div>
            
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-400">
                No hay tareas pendientes.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="px-6 py-2">Tarea</th>
                      <th className="px-3 py-2">Asignado</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                      <th className="px-3 py-2 text-center">Crit.</th>
                      <th className="px-6 py-2 text-right">Punt.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span 
                              className={cn(
                                "w-2.5 h-2.5 rounded-full shrink-0 shadow-sm",
                                task.dotColorClass
                              )}
                              title={(task.tipo as string) === 'Presentation' || (task.tipo as string) === 'Presentación' ? 'Presentación' : task.tipo}
                            />
                            <div className="min-w-0 max-w-[120px] sm:max-w-[140px] md:max-w-[110px] lg:max-w-[130px]">
                              <p className="text-xs font-semibold text-zinc-800 truncate" title={task.fullTitle}>
                                {task.fullTitle}
                              </p>
                              {task.daysDiffMessage && (
                                <p className="text-[9px] text-zinc-400 font-medium truncate">
                                  {task.daysDiffMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {task.asignadoA && task.asignadoA.length > 0 ? (
                            <div className="flex items-center -space-x-1.5">
                              {task.asignadoA.slice(0, 3).map((name: string) => (
                                <span
                                  key={name}
                                  title={name}
                                  className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-700 text-[9px] font-black flex items-center justify-center shrink-0 shadow-sm"
                                >
                                  {name.slice(0, 2).toUpperCase()}
                                </span>
                              ))}
                              {task.asignadoA.length > 3 && (
                                <span className="w-6 h-6 rounded-full bg-zinc-100 border-2 border-white text-zinc-500 text-[9px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                                  +{task.asignadoA.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap",
                            getTaskStatusMeta(task.estado).className
                          )}>
                            {getTaskStatusMeta(task.estado).label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-xs",
                            task.criticidad === "P1" && "bg-red-50 border-red-200 text-red-650",
                            task.criticidad === "P2" && "bg-amber-100 border-amber-300 text-amber-800",
                            task.criticidad === "P3" && "bg-purple-50 border-purple-200 text-purple-700",
                            task.criticidad === "P4" && "bg-indigo-55 border-indigo-200 text-indigo-700"
                          )}>
                            {task.criticidad}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1 max-w-full">
                            {getTaskScoreAlert(task.tipo, task.score) === "danger" && (
                              <ShieldAlert size={11} className="shrink-0 text-red-600" />
                            )}
                            {getTaskScoreAlert(task.tipo, task.score) === "warning" && (
                              <AlertTriangle size={11} className="shrink-0 text-orange-500" />
                            )}
                            <span className="text-xs font-bold font-mono text-zinc-900">
                              {task.score}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
