/**
 * Workspace Job View Adapter (Block 4 W4.2)
 *
 * Pure fail-closed, deterministic, account-owned job-to-Workspace-card projection.
 * Accepts synthetic preloaded generation-job rows without querying a real database.
 */

const ALLOWED_STATUSES = new Set(['queued', 'processing', 'completed', 'failed', 'cancelled']);

/**
 * Normalizes and validates the job status.
 * Map internal or legacy status strings into valid public statuses or 'UNKNOWN'.
 */
function normalizeStatus(rawStatus) {
  if (typeof rawStatus !== 'string') return 'UNKNOWN';
  const s = rawStatus.trim().toLowerCase();
  if (['queued', 'pending', 'choosing'].includes(s)) return 'queued';
  if (['processing', 'running', 'generating'].includes(s)) return 'processing';
  if (['completed', 'done', 'finished', 'success'].includes(s)) return 'completed';
  if (['failed', 'error'].includes(s)) return 'failed';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (ALLOWED_STATUSES.has(s)) return s;
  return 'UNKNOWN';
}

/**
 * Normalizes the job type / kind.
 */
function normalizeType(rawType) {
  if (typeof rawType !== 'string') return 'general';
  const t = rawType.trim().toLowerCase();
  if (t.includes('video') || t.includes('tg_video')) return 'video';
  if (t.includes('image') || t.includes('photo')) return 'image';
  if (t.includes('audio') || t.includes('speech') || t.includes('voice') || t.includes('music')) return 'audio';
  if (t.includes('text') || t.includes('chat')) return 'text';
  return 'general';
}

/**
 * Sanitizes and generates a title-safe fallback without leaking prompts, URLs, or PII.
 */
function deriveSafeTitle(job, type) {
  const candidate = job.title || job.name;
  if (typeof candidate === 'string' && candidate.trim()) {
    const trimmed = candidate.trim();
    // Exclude candidate if it looks like a prompt, script, URL, email, or contains code/markup
    const looksLikeUrl = /(https?:\/\/|s3:\/\/|file:\/\/|www\.)/i.test(trimmed);
    const looksLikePromptOrPii = /(prompt:|script:|negative_prompt:|email:|password:|@)/i.test(trimmed) || trimmed.length > 80;
    const containsMarkup = /<[^>]*>/g.test(trimmed);

    if (!looksLikeUrl && !looksLikePromptOrPii && !containsMarkup) {
      // Clean controls and truncate
      return trimmed.replace(/[\r\n\t]+/g, ' ').slice(0, 60).trim();
    }
  }

  // Fallback title by type
  switch (type) {
    case 'video':
      return 'Video Generation Job';
    case 'image':
      return 'Image Creation Job';
    case 'audio':
      return 'Audio Generation Job';
    case 'text':
      return 'Text Generation Job';
    default:
      return 'Workspace Job';
  }
}

/**
 * Parses parameters flexibly to support multiple calling conventions:
 * 1. projectWorkspaceJobView({ userId, jobs })
 * 2. projectWorkspaceJobView(jobs, userId)
 * 3. projectWorkspaceJobView(userId, jobs)
 */
function parseInputArgs(arg1, arg2) {
  let userId = null;
  let jobs = null;

  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    userId = arg1.userId || arg1.user_id || arg1.authUserId || null;
    jobs = arg1.jobs || arg1.jobRows || arg1.items || null;
  } else if (Array.isArray(arg1)) {
    jobs = arg1;
    if (typeof arg2 === 'string') userId = arg2;
    else if (arg2 && typeof arg2 === 'object') userId = arg2.userId || arg2.user_id;
  } else if (typeof arg1 === 'string') {
    userId = arg1;
    if (Array.isArray(arg2)) jobs = arg2;
    else if (arg2 && typeof arg2 === 'object' && Array.isArray(arg2.jobs)) jobs = arg2.jobs;
  }

  return {
    userId: typeof userId === 'string' ? userId.trim() : null,
    jobs: Array.isArray(jobs) ? jobs : null,
  };
}

/**
 * Projects a raw list of existing generation-job rows into a clean, safe Workspace list view card collection.
 *
 * @param {Array|Object} arg1 - Input jobs array or options object containing userId and jobs
 * @param {String|Array} [arg2] - userId string or jobs array depending on argument signature
 * @returns {Array<Object>} Projected list of safe Workspace job cards (max 30, newest-first)
 */
export function projectWorkspaceJobView(arg1, arg2) {
  const { userId, jobs } = parseInputArgs(arg1, arg2);

  // Fail closed if user is missing, invalid, or jobs input is not an array
  if (!userId || !jobs) {
    return [];
  }

  const cards = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (!job || typeof job !== 'object') continue;

    // Strict account ownership check: authenticated userId MUST match job's owner identifier
    const owner = job.user_id || job.userId || job.owner_id || job.ownerId || job.owner;
    if (!owner || String(owner).trim() !== userId) {
      continue;
    }

    // Exclude master templates or unpermitted Block3 templates unless explicitly owned
    if (
      (job.is_master_template === true ||
        job.isMasterTemplate === true ||
        job.template_type === 'master' ||
        job.is_system_template === true) &&
      job.user_id !== userId &&
      job.userId !== userId
    ) {
      continue;
    }

    // Sanitize and derive Card ID
    const rawId = job.id || job.job_id || job.jobId || job.uuid;
    if (!rawId || (typeof rawId !== 'string' && typeof rawId !== 'number')) continue;
    const sanitizedId = String(rawId).replace(/[^a-zA-Z0-9_\-]/g, '');
    if (!sanitizedId) continue;

    // Status mapping & Allowed statuses
    const status = normalizeStatus(job.status);

    // Job Type / Kind
    const type = normalizeType(job.type || job.kind || job.mode || job.job_type);

    // Created At Normalization
    const rawCreatedAt = job.created_at || job.createdAt || job.createdTime || job.timestamp || job.created;
    let createdAtIso;
    try {
      const parsedDate = new Date(rawCreatedAt);
      createdAtIso = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date(0).toISOString();
    } catch (_) {
      createdAtIso = new Date(0).toISOString();
    }

    // Title safe fallback
    const title = deriveSafeTitle(job, type);

    // Evidence-backed boolean flags
    const isCompleted = status === 'completed';
    const isFailed = status === 'failed';
    const isProcessing = status === 'processing' || status === 'queued';

    // Output evidence check (must not pretend media/job exists if not backed by evidence in input)
    const hasEvidenceOfOutput =
      isCompleted &&
      (job.has_output === true ||
        job.output_ready === true ||
        (typeof job.output_count === 'number' && job.output_count > 0) ||
        job.hasPreview === true ||
        Boolean(job.output_sha256 || job.output_key || job.output_id));

    const hasPreview = Boolean(hasEvidenceOfOutput);

    // Approved safe preview placeholder (no raw URLs or media addresses exposed)
    const previewPlaceholder = {
      ready: hasPreview,
      placeholderType: `${type}_placeholder`,
      label: hasPreview
        ? 'Preview Available'
        : status === 'processing'
        ? 'Generating...'
        : status === 'queued'
        ? 'Queued'
        : status === 'failed'
        ? 'Failed'
        : 'No Preview',
    };

    // Construct pure sanitized card (excluding prompts/PII, costs, credentials, Stripe/ledger IDs, raw addresses, metadata)
    cards.push({
      id: sanitizedId,
      status,
      type,
      createdAt: createdAtIso,
      title,
      previewPlaceholder,
      hasPreview,
      isCompleted,
      isFailed,
      isProcessing,
    });
  }

  // Deterministic newest-first sort
  cards.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return a.id.localeCompare(b.id);
  });

  // Enforce max 30 limit
  return cards.slice(0, 30);
}

export default projectWorkspaceJobView;
