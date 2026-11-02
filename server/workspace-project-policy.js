/**
 * server/workspace-project-policy.js
 *
 * User-owned Workspace project metadata & permission policy core.
 * Pure deterministic policy module with fail-closed owner guards,
 * status validation, text sanitization, DI dependency injection,
 * and preflight delete validation.
 *
 * NOT a database service — does NOT perform network, DB, or side-effect operations.
 */

export const ALLOWED_STATUSES = Object.freeze(['draft', 'ready', 'archived']);

export class WorkspacePolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkspacePolicyError';
    this.code = code;
  }
}

/**
 * Strips HTML markup tags, trims whitespace, and truncates to maxLength.
 */
export function sanitizeText(input, maxLength = 255, fallback = '') {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return fallback;
    input = String(input);
  }
  const stripped = input.replace(/<[^>]*>/g, '').trim();
  if (!stripped) return fallback;
  return stripped.slice(0, maxLength);
}

/**
 * Sanitizes project title (max 120 chars, fallback "Untitled Project").
 */
export function sanitizeTitle(input, maxLength = 120, fallback = 'Untitled Project') {
  return sanitizeText(input, maxLength, fallback);
}

/**
 * Strips basic auth credentials from URL strings (e.g. http://user:pass@host -> http://host).
 */
function sanitizeUrlCredentials(value) {
  if (typeof value !== 'string') return value;
  try {
    if (value.includes('://') && value.includes('@')) {
      const url = new URL(value);
      url.username = '';
      url.password = '';
      return url.toString();
    }
  } catch (_) {
    // If URL parsing fails, redact basic auth pattern manually
    return value.replace(/:\/\/[^@]+@/, '://');
  }
  return value;
}

const SENSITIVE_KEY_REGEX = /token|secret|credential|auth|password|bearer|api_?key|billing|stripe|price_?id|cost|provider_?cost/i;

/**
 * Deep clones metadata object while filtering out secret tokens, URL credentials,
 * provider billing details, and sensitive keys.
 */
export function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  function cloneClean(obj) {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return sanitizeUrlCredentials(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => cloneClean(item));
    }

    const cleanObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        continue; // Exclude sensitive key
      }
      cleanObj[key] = cloneClean(value);
    }
    return cleanObj;
  }

  return cloneClean(metadata);
}

/**
 * Verifies that a valid authenticated userId matches project ownerUserId.
 * Fails closed by throwing a WorkspacePolicyError if invalid, missing, or foreign owner.
 */
export function validateOwnership(userId, projectOwnerUserId) {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new WorkspacePolicyError('MISSING_USER_ID', 'Trusted authenticated userId is required');
  }
  if (!projectOwnerUserId || typeof projectOwnerUserId !== 'string' || !projectOwnerUserId.trim()) {
    throw new WorkspacePolicyError('INVALID_PROJECT_OWNER', 'Project record lacks a valid ownerUserId');
  }
  if (userId !== projectOwnerUserId) {
    throw new WorkspacePolicyError('UNAUTHORIZED_OWNER', 'User is not authorized to access or modify this project');
  }
  return true;
}

/**
 * Validates status value.
 */
export function validateStatus(status) {
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    throw new WorkspacePolicyError('INVALID_STATUS', `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
  }
  return true;
}

/**
 * Validates that input is a non-null project record with required fields.
 */
export function validateProjectRecord(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new WorkspacePolicyError('INVALID_PROJECT_RECORD', 'Project record must be a valid object');
  }
  if (!project.id || typeof project.id !== 'string') {
    throw new WorkspacePolicyError('INVALID_PROJECT_RECORD', 'Project record missing valid string id');
  }
  if (!project.ownerUserId || typeof project.ownerUserId !== 'string') {
    throw new WorkspacePolicyError('INVALID_PROJECT_RECORD', 'Project record missing valid string ownerUserId');
  }
  validateStatus(project.status);
  return true;
}

/**
 * Gets ISO timestamp string from DI or default Date.now().
 */
function resolveTimestamp(options) {
  if (options && typeof options.now === 'function') {
    return options.now();
  }
  if (options && (typeof options.now === 'string' || typeof options.now === 'number')) {
    return new Date(options.now).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Generates new project ID via DI idGenerator.
 */
function resolveProjectId(options) {
  if (options && typeof options.idGenerator === 'function') {
    const id = options.idGenerator();
    if (!id || typeof id !== 'string') {
      throw new WorkspacePolicyError('INVALID_DI_GENERATOR', 'idGenerator must return a non-empty string ID');
    }
    return id;
  }
  if (options && typeof options.projectId === 'string' && options.projectId.trim()) {
    return options.projectId.trim();
  }
  throw new WorkspacePolicyError('MISSING_ID_GENERATOR', 'Stable project ID generator must be provided via options.idGenerator or options.projectId');
}

/**
 * Creates a new user-owned project record.
 */
export function createProjectRecord(params = {}, options = {}) {
  const { userId, title, description, status = 'draft', metadata = {}, studioJobId = null, isFavorite = false } = params;

  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new WorkspacePolicyError('MISSING_USER_ID', 'Trusted authenticated userId is required to create a project');
  }

  validateStatus(status);

  const id = resolveProjectId(options);
  const nowStr = resolveTimestamp(options);

  const cleanTitle = sanitizeTitle(title);
  const cleanDesc = sanitizeText(description, 500, '');
  const cleanMeta = sanitizeMetadata(metadata);
  const cleanStudioJobId = studioJobId ? String(studioJobId).trim() : null;

  return Object.freeze({
    id,
    ownerUserId: userId,
    title: cleanTitle,
    description: cleanDesc,
    status,
    isFavorite: Boolean(isFavorite),
    studioJobId: cleanStudioJobId,
    metadata: cleanMeta,
    createdAt: nowStr,
    updatedAt: nowStr
  });
}

/**
 * Renames a user-owned project.
 */
export function renameProjectRecord(project, params = {}, options = {}) {
  validateProjectRecord(project);
  const { userId, title } = params;
  validateOwnership(userId, project.ownerUserId);

  const cleanTitle = sanitizeTitle(title);
  const nowStr = resolveTimestamp(options);

  return Object.freeze({
    ...project,
    title: cleanTitle,
    updatedAt: nowStr
  });
}

/**
 * Duplicates a project record or template.
 * Inherits ONLY safe metadata, status forced to 'draft', never modifies source template/project.
 */
export function duplicateProjectRecord(sourceProject, params = {}, options = {}) {
  if (!sourceProject || typeof sourceProject !== 'object') {
    throw new WorkspacePolicyError('INVALID_SOURCE_PROJECT', 'Source project/template must be a valid object');
  }

  const { userId, title, description } = params;
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new WorkspacePolicyError('MISSING_USER_ID', 'Target owner userId is required to duplicate a project');
  }

  // A private Workspace project may only be duplicated by its authenticated owner.
  // Public Block3 templates require a trusted SERVER-INJECTED allow decision;
  // a client-controlled template flag or claimed owner is never sufficient.
  const publicTemplateAllowed = typeof options.authorizePublicTemplate === 'function'
    && options.authorizePublicTemplate(sourceProject, userId) === true;
  if (sourceProject.ownerUserId !== userId && !publicTemplateAllowed) {
    throw new WorkspacePolicyError('UNAUTHORIZED_SOURCE', 'Source must be owned by the user or verified as a public template');
  }

  const id = resolveProjectId(options);
  const nowStr = resolveTimestamp(options);

  const sourceTitle = sourceProject.title || 'Untitled Project';
  const defaultTitle = title ? sanitizeTitle(title) : sanitizeTitle(`Copy of ${sourceTitle}`);
  const cleanDesc = description !== undefined ? sanitizeText(description, 500, '') : sanitizeText(sourceProject.description, 500, '');
  const cleanMeta = sanitizeMetadata(sourceProject.metadata);

  // Link Studio job ONLY if source is owned by same authenticated user
  let safeStudioJobId = null;
  if (sourceProject.ownerUserId === userId && sourceProject.studioJobId) {
    safeStudioJobId = String(sourceProject.studioJobId).trim();
  }

  return Object.freeze({
    id,
    ownerUserId: userId,
    title: defaultTitle,
    description: cleanDesc,
    status: 'draft', // Duplicates always start as draft
    isFavorite: false,
    studioJobId: safeStudioJobId,
    metadata: cleanMeta,
    createdAt: nowStr,
    updatedAt: nowStr
  });
}

/**
 * Archives a project.
 */
export function archiveProjectRecord(project, params = {}, options = {}) {
  validateProjectRecord(project);
  const { userId } = params;
  validateOwnership(userId, project.ownerUserId);

  const nowStr = resolveTimestamp(options);

  return Object.freeze({
    ...project,
    status: 'archived',
    updatedAt: nowStr
  });
}

/**
 * Restores an archived project back to draft or ready.
 */
export function restoreProjectRecord(project, params = {}, options = {}) {
  validateProjectRecord(project);
  const { userId, targetStatus = 'draft' } = params;
  validateOwnership(userId, project.ownerUserId);

  if (targetStatus === 'archived') {
    throw new WorkspacePolicyError('INVALID_RESTORE_TARGET', 'Cannot restore project to archived status');
  }
  validateStatus(targetStatus);

  const nowStr = resolveTimestamp(options);

  return Object.freeze({
    ...project,
    status: targetStatus,
    updatedAt: nowStr
  });
}

/**
 * Toggles or explicitly sets favorite flag on a project.
 */
export function toggleFavoriteProjectRecord(project, params = {}, options = {}) {
  validateProjectRecord(project);
  const { userId, isFavorite } = params;
  validateOwnership(userId, project.ownerUserId);

  const nextFavorite = isFavorite !== undefined ? Boolean(isFavorite) : !project.isFavorite;
  const nowStr = resolveTimestamp(options);

  return Object.freeze({
    ...project,
    isFavorite: nextFavorite,
    updatedAt: nowStr
  });
}

/**
 * Links an existing Studio job ID to a project.
 * Requires same authenticated user for both project owner and studio job owner.
 */
export function linkStudioJobRecord(project, params = {}, options = {}) {
  validateProjectRecord(project);
  const { userId, studioJobId, jobOwnerUserId } = params;
  validateOwnership(userId, project.ownerUserId);

  if (!studioJobId || typeof studioJobId !== 'string' || !studioJobId.trim()) {
    throw new WorkspacePolicyError('INVALID_STUDIO_JOB_ID', 'Studio job ID must be a non-empty string');
  }
  if (!jobOwnerUserId || typeof jobOwnerUserId !== 'string' || jobOwnerUserId !== userId) {
    throw new WorkspacePolicyError('JOB_OWNER_MISMATCH', 'Studio job can only be linked by its authentic owner');
  }

  const nowStr = resolveTimestamp(options);

  return Object.freeze({
    ...project,
    studioJobId: studioJobId.trim(),
    updatedAt: nowStr
  });
}

/**
 * Preflight validation for project deletion.
 * NEVER deletes anything from any database/repository.
 * Returns an approval payload if exact project ID matches and explicit user confirmation is given.
 */
export function deletePreflightProjectRecord(project, params = {}) {
  validateProjectRecord(project);
  const { userId, confirmProjectId, confirmed } = params;

  validateOwnership(userId, project.ownerUserId);

  if (!confirmProjectId || typeof confirmProjectId !== 'string' || confirmProjectId !== project.id) {
    throw new WorkspacePolicyError('PROJECT_ID_MISMATCH', 'Deletion preflight requires exact matching project ID');
  }

  if (confirmed !== true) {
    throw new WorkspacePolicyError('CONFIRMATION_REQUIRED', 'Deletion preflight requires explicit user confirmation flag (confirmed: true)');
  }

  return Object.freeze({
    allowed: true,
    action: 'DELETE_PREFLIGHT_APPROVED',
    projectId: project.id,
    ownerUserId: project.ownerUserId
  });
}
