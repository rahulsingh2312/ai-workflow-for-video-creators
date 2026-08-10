import { all, id, now, run } from "@/lib/server/db";
import type { Session } from "@/lib/server/auth";

/**
 * Section 12. An audit event for generation, edit, review, lock, handoff,
 * publish record, AI reply, takeover, and lead status change. It records who
 * changed the record, when, what it looked like before, and the reason where
 * one is required.
 */
export function audit(
  session: Session | { userId: string; workspaceId: string; roles: string[] },
  action: string,
  entity: string,
  entityId: string,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  run(
    `INSERT INTO audit_event (id,workspace_id,actor_id,actor_role,action,entity,entity_id,before,after,reason,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id("ae"),
    session.workspaceId,
    session.userId,
    session.roles.join(","),
    action,
    entity,
    entityId,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
    reason ?? null,
    now(),
  );
}

/** System actions still get an author, so nothing in the log is anonymous. */
export function auditSystem(
  workspaceId: string,
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  after: unknown,
) {
  run(
    `INSERT INTO audit_event (id,workspace_id,actor_id,actor_role,action,entity,entity_id,before,after,reason,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id("ae"), workspaceId, actor, "agent", action, entity, entityId, null,
    after == null ? null : JSON.stringify(after), null, now(),
  );
}

export function auditTrail(workspaceId: string, limit = 120) {
  return all(
    `SELECT a.*, u.name AS actor_name
       FROM audit_event a LEFT JOIN app_user u ON u.id = a.actor_id
      WHERE a.workspace_id = ?
      ORDER BY a.created_at DESC, a.rowid DESC
      LIMIT ?`,
    workspaceId,
    limit,
  );
}

export function auditFor(workspaceId: string, entity: string, entityId: string) {
  return all(
    `SELECT a.*, u.name AS actor_name
       FROM audit_event a LEFT JOIN app_user u ON u.id = a.actor_id
      WHERE a.workspace_id = ? AND a.entity = ? AND a.entity_id = ?
      ORDER BY a.created_at DESC, a.rowid DESC`,
    workspaceId,
    entity,
    entityId,
  );
}
