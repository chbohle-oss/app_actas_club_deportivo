import Dexie, { Table } from 'dexie';

// ---- Offline data types ----

export interface ActaLocal {
  id: string;           // UUID (local or remote)
  clubId: string;
  reunionId?: string;
  numero?: number;
  anio?: number;
  version: number;
  estado: string;
  titulo: string;
  contenido?: Record<string, unknown>;
  fechaReunion?: string;
  lugarReunion?: string;
  tipoReunion?: string;
  creadoPor: string;
  sincronizado: boolean;
  actualizadoEn: string;
}

export interface ReunionLocal {
  id: string;
  clubId: string;
  titulo: string;
  fechaHora: string;
  lugar: string;
  tipo: string;
  agenda?: string;
  estado: string;
  sincronizado: boolean;
}

export interface AcuerdoLocal {
  id: string;
  actaId: string;
  titulo: string;
  descripcion?: string;
  responsableId?: string;
  responsableNombre?: string;
  fechaCompromiso?: string;
  estado: string;
  orden: number;
}

export interface ComentarioLocal {
  id: string;
  actaId: string;
  seccion: string;
  texto: string;
  autorId: string;
  autorNombre: string;
  resuelto: boolean;
  creadoEn: string;
  sincronizado: boolean;
}

export interface OperacionOffline {
  id?: number;          // Auto-increment
  idLocal: string;      // UUID local reference
  tipo: string;         // CREAR_ACTA, EDITAR_ACTA, AGREGAR_COMENTARIO, etc.
  payload: Record<string, unknown>;
  fecha: string;
  estado: 'pendiente' | 'sincronizado' | 'conflicto' | 'error';
  error?: string;
}

export interface UsuarioLocal {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: string;
  clubId?: string;
  rolClub?: string;
  token: string;
  refreshToken: string;
}

// ---- Database class ----

class ActasClubDB extends Dexie {
  actas!: Table<ActaLocal, string>;
  reuniones!: Table<ReunionLocal, string>;
  acuerdos!: Table<AcuerdoLocal, string>;
  comentarios!: Table<ComentarioLocal, string>;
  operacionesOffline!: Table<OperacionOffline, number>;
  usuario!: Table<UsuarioLocal, string>;

  constructor() {
    super('ActasClubDB');

    this.version(1).stores({
      actas: 'id, clubId, reunionId, estado, anio, sincronizado, actualizadoEn',
      reuniones: 'id, clubId, estado, sincronizado',
      acuerdos: 'id, actaId, responsableId, estado',
      comentarios: 'id, actaId, sincronizado',
      operacionesOffline: '++id, tipo, estado, fecha',
      usuario: 'id, email',
    });
  }
}

export const db = new ActasClubDB();

// ---- Queue operations ----

export async function addOfflineOperation(
  tipo: string,
  idLocal: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.operacionesOffline.add({
    idLocal,
    tipo,
    payload,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
  });
}

export async function getPendingOperations(): Promise<OperacionOffline[]> {
  return db.operacionesOffline
    .where('estado')
    .equals('pendiente')
    .sortBy('fecha');
}

export async function markOperationSynced(id: number): Promise<void> {
  await db.operacionesOffline.update(id, { estado: 'sincronizado' });
}

export async function markOperationConflict(id: number, error: string): Promise<void> {
  await db.operacionesOffline.update(id, { estado: 'conflicto', error });
}

export async function clearSyncedOperations(): Promise<void> {
  await db.operacionesOffline.where('estado').equals('sincronizado').delete();
}

// ---- Auth helpers ----

export async function saveUserLocally(userData: UsuarioLocal): Promise<void> {
  await db.usuario.clear();
  await db.usuario.put(userData);
}

export async function getLocalUser(): Promise<UsuarioLocal | undefined> {
  return db.usuario.toCollection().first();
}

export async function clearLocalUser(): Promise<void> {
  await db.usuario.clear();
}
