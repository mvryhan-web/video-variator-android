/**
 * F4 Workspace: bridge authorized generation-job rows to W4.2, W4.3 and W4.4
 * without modifying their existing 30-card public contracts.
 *
 * Rows MUST originate from the server's authenticated user_id SQL predicate.
 * Every row is checked again, and an unexpected foreign row fails the entire
 * request closed. Only W4.3-sanitized summary fields reach the cursor policy.
 */
import { projectWorkspaceJobView } from './workspace-job-view.js';
import { selectWorkspaceCardSections } from './workspace-card-sections.js';
import { pageWorkspaceCardSections } from './workspace-card-cursor.js';

export const WORKSPACE_SOURCE_LIMIT = 3000;
const CHUNK_SIZE = 30;
const fail = (error) => Object.freeze({ items: Object.freeze([]), pageInfo: null, error });

export function paginateAuthorizedWorkspaceRows(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return fail('INVALID_PARAMS');
  const {
    rows, verifiedAccountKey, requestedSection, signingSecret,
    filters = {}, cursor = null, pageSize = 30, includeArchived = false,
    nowMs = Date.now()
  } = params;

  if (!Array.isArray(rows)) return fail('INVALID_SOURCE');
  if (rows.length > WORKSPACE_SOURCE_LIMIT) return fail('WORKSPACE_SOURCE_TOO_LARGE');
  if (typeof verifiedAccountKey !== 'string' || !verifiedAccountKey.trim()) return fail('INVALID_ACCOUNT');
  if (includeArchived !== false && includeArchived !== true) return fail('INVALID_ARCHIVE_FLAG');

  // Never trust supplied rows solely because a SELECT query was user-scoped.
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
        || typeof row.user_id === 'undefined'
        || String(row.user_id) !== verifiedAccountKey) {
      return fail('UNAUTHORIZED_SOURCE');
    }
  }

  const batches = { recent: [], drafts: [], completed: [] };
  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    const slice = rows.slice(start, start + CHUNK_SIZE);
    const active = [];
    const titles = new Map();
    for (const row of slice) {
      const workspace = row.metadata?.workspace;
      const ws = workspace && typeof workspace === 'object' && !Array.isArray(workspace)
        ? workspace : null;
      if (!includeArchived && ws?.archived === true) continue;
      if (typeof ws?.title === 'string' && ws.title.trim()) {
        titles.set(String(row.id), ws.title.trim());
      }
      active.push(row);
    }
    const projected = projectWorkspaceJobView({ userId: verifiedAccountKey, jobs: active })
      .map(card => titles.has(card.id) ? { ...card, title: titles.get(card.id) } : card);
    const selected = selectWorkspaceCardSections({
      cards: projected, options: {
        searchQuery: filters?.searchQuery,
        typeFilter: filters?.typeFilter,
        statusFilter: filters?.statusFilter,
        referenceTimeMs: nowMs
      }
    });
    for (const name of ['recent', 'drafts', 'completed']) {
      batches[name].push(...selected.sections[name]);
    }
  }
  return pageWorkspaceCardSections({
    sections: batches, requestedSection, verifiedAccountKey, signingSecret,
    filters, cursor, pageSize, nowMs
  });
}

export default paginateAuthorizedWorkspaceRows;
