import { fromNodeHeaders } from "better-auth/node";
import { and, eq, isNull } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import { auth } from "../auth/index.ts";
import { db } from "../config/db.ts";
import {
  type Permission,
  ROLE_PERMISSIONS,
  type RoleName,
} from "../constants/index.ts";
import { roles, sessions, users } from "../database/schema/index.ts";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.ts";
import type { AuthContext } from "../types/index.ts";

async function resolveAuthContext(req: Request): Promise<AuthContext | null> {
  const result = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!result?.session) return null;

  const [row] = await db
    .select({
      user: users,
      role: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, result.session.userId), isNull(users.deletedAt)))
    .limit(1);

  if (!row || !row.user.isActive) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, result.session.id))
    .limit(1);

  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  const role = row.role as RoleName;
  const { deletedAt: _deletedAt, ...user } = row.user;

  return {
    user,
    session,
    role,
    permissions: ROLE_PERMISSIONS[role] ?? [],
  };
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const context = await resolveAuthContext(req);

    if (!context) {
      throw new UnauthorizedError("You must be signed in to do that");
    }

    req.auth = context;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.auth = (await resolveAuthContext(req)) ?? undefined;
  } catch {
    req.auth = undefined;
  }
  next();
};

export const requireRole =
  (...allowed: RoleName[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());

    if (!allowed.includes(req.auth.role)) {
      return next(
        new ForbiddenError(
          `This action requires one of: ${allowed.join(", ")}`,
        ),
      );
    }

    next();
  };

export const requirePermission =
  (...required: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());

    const held = new Set(req.auth.permissions);
    const missing = required.filter((permission) => !held.has(permission));

    if (missing.length > 0) {
      return next(
        new ForbiddenError(`Missing permission: ${missing.join(", ")}`),
      );
    }

    next();
  };

export const requireAnyPermission =
  (...accepted: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());

    const held = new Set(req.auth.permissions);

    if (!accepted.some((permission) => held.has(permission))) {
      return next(
        new ForbiddenError(
          `This action requires one of: ${accepted.join(", ")}`,
        ),
      );
    }

    next();
  };

export const requireOwnershipOr =
  (
    override: Permission,
    getOwnerId: (req: Request) => Promise<string | null> | string | null,
  ): RequestHandler =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw new UnauthorizedError();

      if (req.auth.permissions.includes(override)) return next();

      const ownerId = await getOwnerId(req);

      if (!ownerId || ownerId !== req.auth.user.id) {
        throw new ForbiddenError();
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const requireFreshSession =
  (maxAgeSeconds = 60 * 15): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());

    const age = (Date.now() - req.auth.session.createdAt.getTime()) / 1000;

    if (age > maxAgeSeconds) {
      return next(
        new ForbiddenError("Please sign in again to confirm this action"),
      );
    }

    next();
  };
