export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  points: number;
  createdAt: string;
}

export interface Initiative {
  id: string;
  nombre: string;
  descripcion: string;
  responsable?: string;
  createdBy: string;
  estado?: "active" | "closed";
  createdAt: string;
  orden?: number;
}

export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  responsable?: string;
  createdBy: string;
  estado?: "active" | "closed";
  createdAt: string;
  orden?: number;
}

export interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "todo" | "in_progress" | "done";
  iniciativaId?: string;
  proyectoId?: string;
  creadorId: string;
  tags: string[];
  asignadoA: string[];
  createdAt: string;
  updatedAt: string;
  orden?: number;
  fechaInicio?: string;
  fechaFin?: string;
  tipo?: "PoC" | "Presentation" | "Run" | "Build" | "";
  estimacion?: number;
}

export interface Session {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  creadorId: string;
  createdAt: string;
}

export interface Post {
  id: string;
  titulo: string;
  contenido: string;
  estado: "pendiente" | "resuelto";
  solucionIA?: string;
  creadorId: string;
  createdAt: string;
}

export interface Response {
  id: string;
  contenido: string;
  postId: string;
  usuarioId: string;
  createdAt: string;
}

export interface V1Post {
  id: string;
  titulo: string;
  contenido: string;
  creadorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface News {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: "iniciativa" | "tarea" | "sesion" | "foro" | "proyecto";
  referenciaId: string;
  usuarioId: string;
  createdAt: string;
}

export interface Vacation {
  id: string;
  persona: string;
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
}
