import { cookies } from "next/headers";
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { all, db, one, run, now } from "@/lib/server/db";

export const ROLES = ["contributor", "reviewer", "producer", "publisher", "support", "admin"] as const;
export type Role = (typeof ROLES)[number];

const COOKIE = "tl_session";
const SECRET = process.env.TL_SECRET ?? "throughline-dev-secret-change-me";

export type Session = {
  userId: string;
  name: string;
  email: string;
  workspaceId: string;
  roles: Role[];
};

/* ── Passwords ───────────────────────────────────────────────────────────── */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const a = Buffer.from(key, "hex");
  const b = scryptSync(password, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Every seeded account uses this password. It exists so the workspace can be
 * opened and driven; it is not a security design and the sign-in screen says so.
 */
export const SEED_PASSWORD = "throughline";

export function ensureAuthColumns() {
  const conn = db();
  const cols = conn.prepare("PRAGMA table_info(app_user)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "password_hash")) {
    conn.exec("ALTER TABLE app_user ADD COLUMN password_hash TEXT");
  }
  const missing = all<{ id: string }>(
    "SELECT id FROM app_user WHERE password_hash IS NULL OR password_hash = ''",
  );
  for (const u of missing) {
    run("UPDATE app_user SET password_hash = ? WHERE id = ?", hashPassword(SEED_PASSWORD), u.id);
  }
}

/* ── Session cookie ──────────────────────────────────────────────────────── */

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

export function makeToken(userId: string, workspaceId: string) {
  const body = `${userId}.${workspaceId}`;
  return `${body}.${sign(body)}`;
}

function readToken(token: string): { userId: string; workspaceId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, workspaceId, sig] = parts;
  if (sign(`${userId}.${workspaceId}`) !== sig) return null;
  return { userId, workspaceId };
}

export const COOKIE_NAME = COOKIE;

export async function getSession(): Promise<Session | null> {
  ensureAuthColumns();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const parsed = readToken(token);
  if (!parsed) return null;

  const user = one<{ id: string; name: string; email: string }>(
    "SELECT id,name,email FROM app_user WHERE id = ?",
    parsed.userId,
  );
  if (!user) return null;

  const roles = all<{ role: Role }>(
    "SELECT role FROM membership WHERE user_id = ? AND workspace_id = ?",
    parsed.userId,
    parsed.workspaceId,
  ).map((r) => r.role);
  if (roles.length === 0) return null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    workspaceId: parsed.workspaceId,
    roles,
  };
}

export function signIn(email: string, password: string): Session | { error: string } {
  ensureAuthColumns();
  const user = one<{ id: string; name: string; email: string; password_hash: string }>(
    "SELECT id,name,email,password_hash FROM app_user WHERE lower(email) = lower(?)",
    email.trim(),
  );
  if (!user) return { error: "no_account" };
  if (!verifyPassword(password, user.password_hash)) return { error: "bad_password" };

  const membership = one<{ workspace_id: string }>(
    "SELECT workspace_id FROM membership WHERE user_id = ? LIMIT 1",
    user.id,
  );
  if (!membership) return { error: "no_workspace" };

  const roles = all<{ role: Role }>(
    "SELECT role FROM membership WHERE user_id = ? AND workspace_id = ?",
    user.id,
    membership.workspace_id,
  ).map((r) => r.role);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    workspaceId: membership.workspace_id,
    roles,
  };
}

/* ── Guards ──────────────────────────────────────────────────────────────── */

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "not_signed_in", "Sign in to use this workspace.");
  return s;
}

/**
 * Role check. An admin does not automatically inherit every role: they are
 * seeded holding all six, which keeps the audit log honest about which hat
 * someone was actually wearing.
 */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await requireSession();
  if (!roles.some((r) => s.roles.includes(r))) {
    throw new HttpError(
      403,
      "wrong_role",
      `This action needs one of: ${roles.join(", ")}. You hold: ${s.roles.join(", ")}.`,
    );
  }
  return s;
}

/** The role a session used for an action, for the audit trail. */
export function roleUsed(session: Session, needed: Role[]): string {
  return needed.find((r) => session.roles.includes(r)) ?? session.roles[0];
}

export function touch(table: string, rowId: string) {
  run(`UPDATE ${table} SET updated_at = ?, revision = revision + 1 WHERE id = ?`, now(), rowId);
}
