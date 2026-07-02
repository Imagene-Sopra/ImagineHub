import React, { useEffect, useMemo, useRef, useState } from "react";
import { collectionGroup, query, onSnapshot, where, collection, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Task, Vacation } from "../types";
import { Map as MapIcon, Calendar, Clock, Rocket, Briefcase, AlertTriangle, ShieldAlert, Pencil, Umbrella, ChevronDown, ChevronRight, X, Plus, Minus } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isValid, differenceInCalendarMonths, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import { calculateStartDate, cn } from "../lib/utils";
import { TaskModal } from "../components/TaskModal";

const VACATION_PARENT_ID = "roadmap-vacations";
const vacationCollectionRef = () => collection(db, "initiatives", VACATION_PARENT_ID, "tasks");

export const Roadmap: React.FC = () => {
  const FALLBACK_MONTH_COLUMN_WIDTH = 176;
  const FIRST_COLUMN_WIDTH = 256;
  const INITIAL_VISIBLE_MONTHS = 3;
  const MIN_VISIBLE_MONTH_COLUMNS = 1;
  const MAX_VISIBLE_MONTH_COLUMNS = 12;
  const MIN_VISIBLE_MONTHS = 3;
  const LAYERS = {
    grid: 1,
    todayOverlay: 2,
    monthLabel: 10,
    monthGridLines: 20,
    stickyColumn: 30,
    rowDivider: 40,
    stickyHeader: 50,
    filterMenu: 70,
    modal: 80,
  } as const;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [initiatives, setInitiatives] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoadmapFilters, setSelectedRoadmapFilters] = useState<string[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [vacationsCollapsed, setVacationsCollapsed] = useState(true);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [vacationForm, setVacationForm] = useState({ persona: "", fechaInicio: "", fechaFin: "" });
  const [vacationFormError, setVacationFormError] = useState("");
  const [vacationSubmitting, setVacationSubmitting] = useState(false);
  const [noDateTasksCollapsed, setNoDateTasksCollapsed] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pendingTodayScroll, setPendingTodayScroll] = useState(false);
  const [visibleMonthColumns, setVisibleMonthColumns] = useState(INITIAL_VISIBLE_MONTHS);
  const roadmapScrollRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedRoadmapScroll = useRef(false);
  const [roadmapViewportWidth, setRoadmapViewportWidth] = useState(0);

  const parseTaskDate = (value?: string) => {
    if (!value) return null;
    const isoDate = parseISO(value);
    if (isValid(isoDate)) return isoDate;
    const fallbackDate = new Date(value);
    return isValid(fallbackDate) ? fallbackDate : null;
  };

  const getTaskDateInterval = (task: Task) => {
    const plannedStart = task.fechaInicio ? parseTaskDate(task.fechaInicio) : null;
    const plannedEnd = task.fechaFin ? parseTaskDate(task.fechaFin) : null;

    if (plannedStart && plannedEnd) {
      return plannedStart.getTime() <= plannedEnd.getTime()
        ? { start: plannedStart, end: plannedEnd }
        : { start: plannedEnd, end: plannedStart };
    }

    if (!plannedStart && plannedEnd && task.estimacion && task.estimacion > 0) {
      return { start: calculateStartDate(plannedEnd, task.estimacion), end: plannedEnd };
    }

    const fallbackDate = plannedStart || plannedEnd;
    return fallbackDate ? { start: fallbackDate, end: fallbackDate } : null;
  };

  useEffect(() => {
    // Include both 'todo' and 'in_progress' tasks
    const q = query(collectionGroup(db, "tasks"), where("estado", "in", ["todo", "in_progress"]));
    const unsub = onSnapshot(q, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
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

    const unsubVacations = onSnapshot(vacationCollectionRef(), (snap) => {
      setVacations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vacation)));
    });

    return () => {
      unsub();
      unsubProjects();
      unsubInitiatives();
      unsubVacations();
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

  const taskYears = useMemo(() => {
    const years = new Set<number>();

    tasks.forEach((task) => {
      const interval = getTaskDateInterval(task);
      if (!interval) return;

      const startYear = Math.min(interval.start.getFullYear(), interval.end.getFullYear());
      const endYear = Math.max(interval.start.getFullYear(), interval.end.getFullYear());

      for (let year = startYear; year <= endYear; year += 1) {
        years.add(year);
      }
    });

    return Array.from(years).sort((a, b) => a - b);
  }, [tasks]);

  useEffect(() => {
    if (taskYears.length === 0) {
      setSelectedYear(null);
      return;
    }

    if (selectedYear !== null && taskYears.includes(selectedYear)) return;

    const currentYear = new Date().getFullYear();
    setSelectedYear(taskYears.includes(currentYear) ? currentYear : taskYears[taskYears.length - 1]);
  }, [taskYears, selectedYear]);

  const { startDate, endDate, months } = useMemo(() => {
    if (selectedYear !== null) {
      const yearStart = startOfMonth(new Date(selectedYear, 0, 1));
      const yearEnd = endOfMonth(new Date(selectedYear, 11, 1));
      return {
        startDate: yearStart,
        endDate: yearEnd,
        months: eachMonthOfInterval({ start: yearStart, end: yearEnd }),
      };
    }

    const today = new Date();
    const anchorPrevMonth = startOfMonth(addMonths(today, -1));
    const anchorNextMonth = endOfMonth(addMonths(today, 1));

    const taskDates = tasks
      .flatMap((task) => [task.fechaInicio, task.fechaFin])
      .map((value) => parseTaskDate(value))
      .filter((date): date is Date => !!date);

    const vacationDates = vacations
      .flatMap((v) => [v.fechaInicio, v.fechaFin])
      .map((value) => parseTaskDate(value))
      .filter((date): date is Date => !!date);

    const allDates = [...taskDates, ...vacationDates, anchorPrevMonth, anchorNextMonth];

    if (allDates.length === 0) {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return {
        startDate: monthStart,
        endDate: monthEnd,
        months: eachMonthOfInterval({ start: monthStart, end: monthEnd }),
      };
    }

    let minDate = allDates[0];
    let maxDate = allDates[0];

    allDates.forEach((date) => {
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
  }, [tasks, vacations, selectedYear]);

  useEffect(() => {
    if (!roadmapScrollRef.current) return;

    const element = roadmapScrollRef.current;
    const updateViewportWidth = () => {
      setRoadmapViewportWidth(element.clientWidth);
    };

    updateViewportWidth();

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        updateViewportWidth();
      });
      resizeObserver.observe(element);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const monthColumnWidth = useMemo(() => {
    if (roadmapViewportWidth <= FIRST_COLUMN_WIDTH) {
      return FALLBACK_MONTH_COLUMN_WIDTH;
    }

    return Math.max(
      1,
      Math.floor((roadmapViewportWidth - FIRST_COLUMN_WIDTH) / visibleMonthColumns)
    );
  }, [roadmapViewportWidth, visibleMonthColumns]);

  const monthLabelFormat = monthColumnWidth < 120 ? "MMM" : "MMMM";

  useEffect(() => {
    hasInitializedRoadmapScroll.current = false;
  }, [selectedYear]);

  useEffect(() => {
    if (hasInitializedRoadmapScroll.current) return;
    if (loading) return;
    if (!roadmapScrollRef.current || months.length === 0) return;
    if (roadmapViewportWidth <= FIRST_COLUMN_WIDTH) return;

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthIndex = months.findIndex(
      (month) =>
        month.getFullYear() === currentMonthStart.getFullYear() &&
        month.getMonth() === currentMonthStart.getMonth()
    );

    const previousMonthIndex = currentMonthIndex > 0 ? currentMonthIndex - 1 : 0;
    const targetScrollLeft = previousMonthIndex * monthColumnWidth;

    requestAnimationFrame(() => {
      if (!roadmapScrollRef.current) return;
      roadmapScrollRef.current.scrollLeft = targetScrollLeft;
    });
    hasInitializedRoadmapScroll.current = true;
  }, [loading, months, monthColumnWidth, roadmapViewportWidth]);

  const timelineGridTemplate = `repeat(${months.length}, ${monthColumnWidth}px)`;

  const getMonthGridProgress = (
    rawDate: Date,
    options?: { inclusiveEnd?: boolean; includeTime?: boolean }
  ) => {
    if (months.length === 0) return 0;

    const minTime = startDate.getTime();
    const maxTime = endDate.getTime();
    const clampedTime = Math.min(maxTime, Math.max(minTime, rawDate.getTime()));
    const date = new Date(clampedTime);

    const monthIndex = Math.max(
      0,
      Math.min(
        months.length - 1,
        differenceInCalendarMonths(startOfMonth(date), startOfMonth(startDate))
      )
    );

    const secondsInDay = 24 * 60 * 60;
    const timeFraction = options?.includeTime
      ? (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / secondsInDay
      : 0;

    const dayOffset = date.getDate() - 1 + timeFraction + (options?.inclusiveEnd ? 1 : 0);
    const monthFraction = Math.max(0, Math.min(1, dayOffset / getDaysInMonth(date)));

    return Math.max(0, Math.min(1, (monthIndex + monthFraction) / months.length));
  };

  const todayLineProgress = useMemo(() => {
    return getMonthGridProgress(new Date(), { includeTime: true });
  }, [startDate, endDate, months.length]);
  const currentYear = new Date().getFullYear();
  const showTodayIndicator = selectedYear === null || selectedYear === currentYear;

  const scrollToToday = () => {
    const currentYear = new Date().getFullYear();
    if (selectedYear !== null && selectedYear !== currentYear) {
      setPendingTodayScroll(true);
      setSelectedYear(currentYear);
      return;
    }

    if (!roadmapScrollRef.current || months.length === 0) return;

    const element = roadmapScrollRef.current;
    const timelineWidth = months.length * monthColumnWidth;
    const viewportWidth = roadmapViewportWidth > 0 ? roadmapViewportWidth : element.clientWidth;
    const timelineViewportWidth = Math.max(0, viewportWidth - FIRST_COLUMN_WIDTH);
    const targetScrollLeft = Math.max(0, todayLineProgress * timelineWidth - timelineViewportWidth / 2);

    element.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!pendingTodayScroll) return;
    if (loading) return;
    if (!roadmapScrollRef.current || months.length === 0) return;

    const currentYear = new Date().getFullYear();
    if (selectedYear !== currentYear) return;

    const element = roadmapScrollRef.current;
    const timelineWidth = months.length * monthColumnWidth;
    const viewportWidth = roadmapViewportWidth > 0 ? roadmapViewportWidth : element.clientWidth;
    const timelineViewportWidth = Math.max(0, viewportWidth - FIRST_COLUMN_WIDTH);
    const targetScrollLeft = Math.max(0, todayLineProgress * timelineWidth - timelineViewportWidth / 2);

    element.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
    setPendingTodayScroll(false);
  }, [
    pendingTodayScroll,
    loading,
    months.length,
    monthColumnWidth,
    roadmapViewportWidth,
    todayLineProgress,
    selectedYear,
  ]);

  const normalizePersonName = (name: string) => name.trim().toLocaleLowerCase("es");

  const vacationsByPerson = useMemo(() => {
    const grouped = new Map<string, Vacation[]>();

    vacations.forEach((vacation) => {
      const person = vacation.persona.trim();
      if (!person) return;
      grouped.set(person, [...(grouped.get(person) || []), vacation]);
    });

    return Array.from(grouped.entries())
      .map(([person, personVacations]) => ({
        person,
        vacations: personVacations.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
      }))
      .sort((a, b) => a.person.localeCompare(b.person, "es", { sensitivity: "base" }));
  }, [vacations]);

  const vacationRangesByPerson = useMemo(() => {
    const grouped = new Map<string, Vacation[]>();

    vacations.forEach((vacation) => {
      const personKey = normalizePersonName(vacation.persona);
      if (!personKey) return;
      grouped.set(personKey, [...(grouped.get(personKey) || []), vacation]);
    });

    return grouped;
  }, [vacations]);

  const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
    startA.getTime() <= endB.getTime() && startB.getTime() <= endA.getTime();

  const getAssigneeVacationConflict = (task: Task, assigneeName: string) => {
    const taskInterval = getTaskDateInterval(task);
    if (!taskInterval) return null;

    const personVacations = vacationRangesByPerson.get(normalizePersonName(assigneeName)) || [];
    return personVacations.find((vacation) => {
      const vacationStart = parseTaskDate(vacation.fechaInicio);
      const vacationEnd = parseTaskDate(vacation.fechaFin);
      if (!vacationStart || !vacationEnd) return false;

      const orderedVacationStart = vacationStart.getTime() <= vacationEnd.getTime() ? vacationStart : vacationEnd;
      const orderedVacationEnd = vacationStart.getTime() <= vacationEnd.getTime() ? vacationEnd : vacationStart;
      return rangesOverlap(taskInterval.start, taskInterval.end, orderedVacationStart, orderedVacationEnd);
    }) || null;
  };

  const getRangePosition = (rangeStart: Date, rangeEnd: Date) => {
    const clampedStart = rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd;
    const clampedEnd = rangeStart.getTime() <= rangeEnd.getTime() ? rangeEnd : rangeStart;

    const startProgress = getMonthGridProgress(clampedStart);
    const endProgress = getMonthGridProgress(clampedEnd, { inclusiveEnd: true });

    const rawWidth = (endProgress - startProgress) * 100;
    const width = rawWidth <= 0 ? 0.6 : rawWidth;

    return {
      left: `${startProgress * 100}%`,
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
      const ranges = getTaskRanges(task);
      const interval = getTaskDateInterval(task);
      return {
        ...task,
        ...details,
        ranges,
        interval,
      };
    })
    .sort((a, b) => b.score - a.score);

  const ganttTasks = roadmapTasks.filter((task) => {
    if (!task.ranges.hasAnyRange || !task.interval) return false;
    return rangesOverlap(task.interval.start, task.interval.end, startDate, endDate);
  });

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

  const matchesRoadmapFilters = (task: Task) => {
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
  };

  const filteredRoadmapTasks = ganttTasks.filter((task) => {
    return matchesRoadmapFilters(task);
  });

  const noDateTasks = roadmapTasks.filter((task) => !task.interval);
  const filteredNoDateTasks = noDateTasks.filter((task) => matchesRoadmapFilters(task));

  const toggleRoadmapFilter = (filterId: string) => {
    setSelectedRoadmapFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  const allAssignees = useMemo(() => {
    const names = new Set(tasks.flatMap((t) => t.asignadoA || []).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [tasks]);

  const handleSaveVacation = async () => {
    if (!vacationForm.persona || !vacationForm.fechaInicio || !vacationForm.fechaFin) {
      setVacationFormError("Todos los campos son obligatorios.");
      return;
    }
    if (vacationForm.fechaInicio > vacationForm.fechaFin) {
      setVacationFormError("La fecha de inicio debe ser anterior o igual a la fecha de fin.");
      return;
    }
    setVacationSubmitting(true);
    try {
      await addDoc(vacationCollectionRef(), {
        kind: "vacation",
        persona: vacationForm.persona,
        fechaInicio: vacationForm.fechaInicio,
        fechaFin: vacationForm.fechaFin,
        createdAt: new Date().toISOString(),
      });
      setIsVacationModalOpen(false);
      setVacationForm({ persona: "", fechaInicio: "", fechaFin: "" });
      setVacationFormError("");
    } finally {
      setVacationSubmitting(false);
    }
  };

  const handleDeleteVacation = async (vacationId: string) => {
    await deleteDoc(doc(db, "initiatives", VACATION_PARENT_ID, "tasks", vacationId));
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
              <MapIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Roadmap de Tareas</h1>
              <p className="text-zinc-500 text-sm">Visualización temporal de tareas por iniciar y en curso</p>
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
              <div
                className="absolute right-0 top-full mt-2 w-72 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white shadow-xl p-2"
                style={{ zIndex: LAYERS.filterMenu }}
              >

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
            <div className="flex flex-wrap items-center gap-2 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mr-1">Leyenda:</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-red-50 border-red-200 text-red-600">Run</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-amber-100 border-amber-300 text-amber-800">Build</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-purple-50 border-purple-200 text-purple-700">Presentación</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border shadow-sm bg-indigo-50 border-indigo-200 text-indigo-700">PoC</span>
            </div>

            <button
              type="button"
              onClick={() => { setVacationForm({ persona: allAssignees[0] || "", fechaInicio: "", fechaFin: "" }); setVacationFormError(""); setIsVacationModalOpen(true); }}
              className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 transition-colors"
            >
              <Umbrella size={12} />
              Añadir vacaciones
            </button>

          </div>
        </div>
      </div>

      <div ref={roadmapScrollRef} className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Clock className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-none border border-dashed border-zinc-200">
            <Calendar className="text-zinc-200 mb-4" size={48} />
            <p className="text-zinc-500 font-medium">No hay tareas por iniciar o en curso con fechas programadas</p>
          </div>
        ) : (
          <div className="bg-white rounded-none border border-zinc-200 border-t-0 border-r-0 border-b-0">
            <div className="min-w-max border-t border-b border-zinc-200">
                {/* Header Months */}
                <div className="flex border-b border-zinc-200 sticky top-0 bg-white" style={{ zIndex: LAYERS.stickyHeader }}>
                  <div className="w-64 border-l border-r border-zinc-200 p-3 sticky left-0 bg-white" style={{ zIndex: LAYERS.stickyHeader }}>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center">
                        <span className="font-bold text-zinc-500 text-xs uppercase tracking-wider">Tarea / Proyecto</span>
                      </div>

                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                        {taskYears.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Año</span>
                            <div className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                              <select
                                value={selectedYear ?? ""}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                aria-label="Seleccionar año"
                                className="w-auto min-w-[3.25rem] text-[11px] font-semibold text-zinc-700 bg-transparent focus:outline-none"
                              >
                                {taskYears.map((year) => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div />
                        )}

                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={scrollToToday}
                            className="cursor-pointer inline-flex items-center justify-center h-6 rounded-full border border-zinc-200 px-2 text-[9px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 bg-white transition-colors"
                            title="Ir al día de hoy"
                          >
                            Hoy
                          </button>
                        </div>

                        <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => setVisibleMonthColumns((prev) => Math.min(MAX_VISIBLE_MONTH_COLUMNS, prev + 1))}
                            disabled={visibleMonthColumns >= MAX_VISIBLE_MONTH_COLUMNS}
                            className="cursor-pointer inline-flex items-center justify-center h-5 w-5 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Añadir una columna de mes"
                          >
                            <Minus size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibleMonthColumns((prev) => Math.max(MIN_VISIBLE_MONTH_COLUMNS, prev - 1))}
                            disabled={visibleMonthColumns <= MIN_VISIBLE_MONTH_COLUMNS}
                            className="cursor-pointer inline-flex items-center justify-center h-5 w-5 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Quitar una columna de mes"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative grid flex-1" style={{ gridTemplateColumns: timelineGridTemplate }}>
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{ gridTemplateColumns: timelineGridTemplate, zIndex: LAYERS.monthGridLines }}
                    >
                      {months.map((_, idx) => (
                        <div key={idx} className="border-r border-zinc-200" />
                      ))}
                    </div>
                    {months.map((month, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "relative text-center font-bold text-zinc-900 overflow-hidden transition-[padding] duration-150",
                          monthColumnWidth < 120 ? "px-2 py-3" : "p-4"
                        )}
                        style={{ zIndex: LAYERS.monthLabel }}
                        title={format(month, "MMMM yyyy", { locale: es })}
                      >
                        <span className="capitalize block truncate">{format(month, monthLabelFormat, { locale: es })}</span>
                        <span className="text-[10px] text-zinc-400 block tracking-widest truncate">{format(month, "yyyy")}</span>
                      </div>
                    ))}
                  </div>
                </div>

              {/* Timeline View */}
              <div className="relative bg-white">
                  {/* Grid Lines with high visibility */}
                  <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: LAYERS.grid }}>
                    <div className="w-64 border-l border-r border-zinc-200 sticky left-0 bg-white transition-colors" style={{ zIndex: LAYERS.monthGridLines }}></div>
                    <div className="grid flex-1" style={{ gridTemplateColumns: timelineGridTemplate }}>
                      {months.map((_, idx) => (
                        <div key={idx} className="border-r border-zinc-200"></div>
                      ))}
                    </div>
                  </div>

                  {/* Today Line Overlay */}
                  {showTodayIndicator && (
                    <div
                      className="absolute inset-y-0 right-0 pointer-events-none overflow-hidden"
                      style={{ left: `${FIRST_COLUMN_WIDTH}px`, zIndex: LAYERS.todayOverlay }}
                    >
                      <div className="relative h-full min-w-0">
                        <div
                          className="absolute inset-y-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] flex flex-col items-center"
                          style={{
                            left: `${todayLineProgress * 100}%`
                          }}
                        >
                          <div className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-md whitespace-nowrap mt-2 transform -translate-y-1">
                            HOY
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks with high visibility horizontal separation lines */}
                  <div className="relative bg-white">

                    {/* Vacation rows section */}
                    {vacations.length > 0 && (
                      <>
                        <div
                          className="relative flex items-center bg-teal-50/60 cursor-pointer select-none"
                          onClick={() => setVacationsCollapsed((prev) => !prev)}
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-zinc-200 pointer-events-none" style={{ zIndex: LAYERS.rowDivider }} />
                          <div
                            className="w-64 border-l border-r border-zinc-200 p-3 sticky left-0 bg-teal-50 flex-shrink-0 flex items-center gap-2"
                            style={{ zIndex: LAYERS.stickyColumn }}
                          >
                            {vacationsCollapsed ? <ChevronRight size={13} className="text-teal-600" /> : <ChevronDown size={13} className="text-teal-600" />}
                            <Umbrella size={13} className="text-teal-600" />
                            <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                              Vacaciones ({vacations.length})
                            </span>
                          </div>
                          <div className="grid flex-1 h-8 bg-teal-50 divide-x divide-zinc-200" style={{ gridTemplateColumns: timelineGridTemplate }}>
                            {months.map((_, idx) => (
                              <div key={idx} className="h-full" />
                            ))}
                          </div>
                        </div>

                        {!vacationsCollapsed && vacationsByPerson.map((personGroup) => (
                            <div key={personGroup.person} className="relative flex items-center group hover:bg-teal-50 transition-colors">
                              <div className="absolute inset-x-0 top-0 h-px bg-zinc-200 pointer-events-none" style={{ zIndex: LAYERS.rowDivider }} />
                              <div
                                className="w-64 border-l border-r border-zinc-200 p-3 sticky left-0 bg-white group-hover:bg-teal-50 transition-colors flex-shrink-0"
                                style={{ zIndex: LAYERS.stickyColumn }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Umbrella size={11} className="text-teal-500 shrink-0" />
                                    <span className="text-xs font-semibold text-zinc-800 truncate">{personGroup.person}</span>
                                  </div>
                                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-teal-600 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">
                                    {personGroup.vacations.length} tramo{personGroup.vacations.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {personGroup.vacations.map((vacation) => (
                                    <span key={vacation.id} className="inline-flex items-center gap-1 text-[9px] text-teal-600 font-medium bg-teal-50 border border-teal-100 rounded px-1">
                                      {vacation.fechaInicio} → {vacation.fechaFin}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteVacation(vacation.id); }}
                                        className="rounded hover:bg-red-50 text-teal-300 hover:text-red-400 transition-colors"
                                        title="Eliminar vacaciones"
                                      >
                                        <X size={9} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex-1 relative h-14 flex items-center min-w-0 overflow-hidden bg-white group-hover:bg-teal-50 transition-colors">
                                {personGroup.vacations.map((vacation) => {
                                  const vStart = parseTaskDate(vacation.fechaInicio);
                                  const vEnd = parseTaskDate(vacation.fechaFin);
                                  const vRange = vStart && vEnd ? getRangePosition(vStart, vEnd) : null;
                                  if (!vRange) return null;

                                  return (
                                    <div
                                      key={vacation.id}
                                      className="absolute h-5 top-1/2 -translate-y-1/2 rounded-md border border-teal-300 bg-teal-100 shadow-sm flex items-center justify-center"
                                      style={{ left: vRange.left, width: vRange.width, zIndex: LAYERS.monthLabel }}
                                      title={`Vacaciones de ${personGroup.person}: ${vacation.fechaInicio} - ${vacation.fechaFin}`}
                                    >
                                      <span className="px-2 text-[9px] font-bold uppercase tracking-wide truncate max-w-full whitespace-nowrap text-teal-800 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                                        {personGroup.person}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                        ))}
                      </>
                    )}

                    {filteredRoadmapTasks.map((task) => {
                      const { plannedRange, durationRange, hasAnyRange } = task.ranges;
                      if (!hasAnyRange) return null;
                      const statusLabelRange = plannedRange || durationRange;
                      const parentName = getParentName(task);
                      const fullTitle = parentName ? `${parentName} - ${task.titulo}` : task.titulo;

                      return (
                        <div key={task.id} className="relative flex items-center group hover:bg-zinc-50 transition-colors">
                          <div className="absolute inset-x-0 top-0 h-px bg-zinc-200 pointer-events-none" style={{ zIndex: LAYERS.rowDivider }} />
                          <div
                            className="w-64 border-l border-r border-zinc-200 p-4 sticky left-0 bg-white group-hover:bg-zinc-50 transition-colors flex-shrink-0"
                            style={{ zIndex: LAYERS.stickyColumn }}
                          >
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
                              {task.asignadoA?.map((name, i) => {
                                const vacationConflict = getAssigneeVacationConflict(task, name);

                                return (
                                  <span
                                    key={i}
                                    className={cn(
                                      "inline-flex items-center gap-1 text-[9px] px-1 rounded border font-medium",
                                      vacationConflict
                                        ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                        : "bg-blue-50 text-blue-600 border-blue-200/60"
                                    )}
                                    title={vacationConflict ? `${name} tiene vacaciones del ${vacationConflict.fechaInicio} al ${vacationConflict.fechaFin}` : name}
                                  >
                                    {vacationConflict && <AlertTriangle size={10} className="shrink-0 text-yellow-600" />}
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex-1 relative h-12 flex items-center bg-white group-hover:bg-zinc-50 min-w-0 overflow-hidden transition-colors">
                            {plannedRange && (
                              <div
                                className={cn(
                                  "absolute h-5 top-1/2 -translate-y-1/2 rounded-md shadow-sm flex items-center justify-center border transition-all cursor-pointer",
                                  getTaskColorClasses(task.tipo)
                                )}
                                style={{
                                  left: plannedRange.left,
                                  width: plannedRange.width,
                                  zIndex: LAYERS.monthLabel,
                                }}
                                title={`${fullTitle} (${getTaskStatusLabel(task.estado)}) | Plan: ${task.fechaInicio || "-"} - ${task.fechaFin || "-"} | Punt.: ${task.score}${task.tipo ? ` | Tipo: ${task.tipo === 'Presentation' ? 'Presentación' : task.tipo}` : ''}`}
                              />
                            )}

                            {durationRange && (
                              <div
                                className={cn(
                                  "absolute h-5 top-1/2 -translate-y-1/2 rounded-md shadow-sm flex items-center justify-center border transition-all cursor-pointer",
                                  getTaskDurationColorClasses(task.tipo)
                                )}
                                style={{
                                  left: durationRange.left,
                                  width: durationRange.width,
                                  zIndex: LAYERS.monthGridLines,
                                }}
                                title={`${fullTitle} | Duración estimada: ${task.estimacion} día${task.estimacion === 1 ? "" : "s"} laborables (desde fecha fin)`}
                              />
                            )}

                            {statusLabelRange && (
                              <div
                                className="absolute h-5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                                style={{
                                  left: statusLabelRange.left,
                                  width: statusLabelRange.width,
                                  zIndex: LAYERS.monthGridLines,
                                }}
                              >
                                <span className="px-2 text-[9px] font-bold uppercase tracking-wide truncate max-w-full whitespace-nowrap text-zinc-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                                  {getTaskStatusLabel(task.estado)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredNoDateTasks.length > 0 && (
                      <>
                        <div
                          className="group relative flex items-center bg-white hover:bg-zinc-100/70 cursor-pointer select-none transition-colors"
                          onClick={() => setNoDateTasksCollapsed((prev) => !prev)}
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-zinc-200 pointer-events-none" style={{ zIndex: LAYERS.rowDivider }} />
                          <div
                            className="w-64 border-l border-r border-zinc-200 p-3 sticky left-0 bg-white group-hover:bg-zinc-100 transition-colors z-30 flex-shrink-0 flex items-center gap-2"
                            style={{ zIndex: LAYERS.stickyColumn }}
                          >
                            {noDateTasksCollapsed ? <ChevronRight size={13} className="text-zinc-600" /> : <ChevronDown size={13} className="text-zinc-600" />}
                            <Clock size={13} className="text-zinc-600" />
                            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                              Sin fechas ({filteredNoDateTasks.length})
                            </span>
                          </div>
                          <div className="grid flex-1 h-8 bg-white group-hover:bg-zinc-100/60 divide-x divide-zinc-200 transition-colors" style={{ gridTemplateColumns: timelineGridTemplate }}>
                            {months.map((_, idx) => (
                              <div key={idx} className="h-full" />
                            ))}
                          </div>
                        </div>

                        {!noDateTasksCollapsed && filteredNoDateTasks.map((task) => {
                          const parentName = getParentName(task);
                          const fullTitle = parentName ? `${parentName} - ${task.titulo}` : task.titulo;

                          return (
                            <div key={`nodate-${task.id}`} className="relative flex items-center group hover:bg-zinc-50 transition-colors">
                              <div className="absolute inset-x-0 top-0 h-px bg-zinc-200 pointer-events-none" style={{ zIndex: LAYERS.rowDivider }} />
                              <div
                                className="w-64 border-l border-r border-zinc-200 p-4 sticky left-0 bg-white z-30 group-hover:bg-zinc-50 transition-colors flex-shrink-0"
                                style={{ zIndex: LAYERS.stickyColumn }}
                              >
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
                                  {task.asignadoA?.map((name, i) => {
                                    const vacationConflict = getAssigneeVacationConflict(task, name);

                                    return (
                                      <span
                                        key={i}
                                        className={cn(
                                          "inline-flex items-center gap-1 text-[9px] px-1 rounded border font-medium",
                                          vacationConflict
                                            ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                                            : "bg-blue-50 text-blue-600 border-blue-200/60"
                                        )}
                                        title={vacationConflict ? `${name} tiene vacaciones del ${vacationConflict.fechaInicio} al ${vacationConflict.fechaFin}` : name}
                                      >
                                        {name}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex-1 relative h-12 flex items-center bg-white group-hover:bg-zinc-100/70 min-w-0 overflow-hidden transition-colors px-3" />
                            </div>
                          );
                        })}
                      </>
                    )}
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

      {/* Vacation Modal */}
      {isVacationModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm" style={{ zIndex: LAYERS.modal }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Umbrella size={18} className="text-teal-600" />
                <h2 className="text-base font-bold text-zinc-900">Añadir vacaciones</h2>
              </div>
              <button
                onClick={() => { setIsVacationModalOpen(false); setVacationFormError(""); }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Persona</label>
                {allAssignees.length > 0 ? (
                  <select
                    value={vacationForm.persona}
                    onChange={(e) => setVacationForm((prev) => ({ ...prev, persona: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    {allAssignees.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Nombre de la persona"
                    value={vacationForm.persona}
                    onChange={(e) => setVacationForm((prev) => ({ ...prev, persona: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Fecha inicio</label>
                  <input
                    type="date"
                    value={vacationForm.fechaInicio}
                    onChange={(e) => setVacationForm((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Fecha fin</label>
                  <input
                    type="date"
                    value={vacationForm.fechaFin}
                    onChange={(e) => setVacationForm((prev) => ({ ...prev, fechaFin: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {vacationFormError && (
                <p className="text-xs text-red-500 font-medium">{vacationFormError}</p>
              )}
            </div>

            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={() => { setIsVacationModalOpen(false); setVacationFormError(""); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveVacation}
                disabled={vacationSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                <Plus size={14} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
