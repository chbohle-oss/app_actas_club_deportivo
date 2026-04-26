import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret'
);

const TOKEN_EXPIRY = '24h';
const REFRESH_EXPIRY = '7d';

export interface TokenPayload {
  sub: string;        // userId
  email: string;
  nombre: string;
  rol: string;
  clubId?: string;
  rolClub?: string;
}

// ---- JWT helpers ----

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: { sub: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ---- Password helpers ----

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---- Auth middleware helper ----

export async function getAuthUser(request: NextRequest): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function requireAuth(user: TokenPayload | null): NextResponse | null {
  if (!user) {
    return NextResponse.json(
      { error: 'No autorizado. Inicie sesión.' },
      { status: 401 }
    );
  }
  return null;
}

export function requireRole(user: TokenPayload, roles: string[]): NextResponse | null {
  if (!roles.includes(user.rol)) {
    return NextResponse.json(
      { error: 'No tiene permisos suficientes para esta acción.' },
      { status: 403 }
    );
  }
  return null;
}

// ---- Login ----

export async function loginUser(email: string, password: string) {
  const user = await prisma.usuario.findUnique({
    where: { email },
    include: {
      clubes: {
        where: { estado: 'ACTIVO' },
        take: 1,
      },
    },
  });

  if (!user || !user.activo) {
    return { error: 'Credenciales inválidas.', status: 401 };
  }

  const isValidPassword = await comparePasswords(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: 'Credenciales inválidas.', status: 401 };
  }

  const clubMembership = user.clubes[0];

  const tokenPayload: TokenPayload = {
    sub: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    clubId: clubMembership?.clubId,
    rolClub: clubMembership?.rolClub,
  };

  const accessToken = await createToken(tokenPayload);
  const refreshToken = await createRefreshToken({ sub: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      rol: user.rol,
      avatarUrl: user.avatarUrl,
      clubId: clubMembership?.clubId,
      rolClub: clubMembership?.rolClub,
    },
  };
}
