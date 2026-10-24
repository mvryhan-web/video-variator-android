/**
 * server/user-agent-plan.js
 *
 * Safe, validated, deterministic User Agent Plan Compiler for Deepsyq (Block 2 A2.1).
 * Compiles user goals into ordered, max-bounded, real tool execution steps with:
 * - Authorized capability registry
 * - Prerequisites tracking
 * - Explicit per-user scoping
 * - Approval gates (billable, destructive, external publishing)
 * - Cost-unknown states (no faked/claimed paid quotes)
 * - Injection/malicious tool name rejection
 * - Strict limits (max steps, valid user/job state)
 */

// Authorized Registry of Real Deepsyq Tools / Capabilities
const AUTHORIZED_CAPABILITIES = Object.freeze({
  'text.copywriter': Object.freeze({
    id: 'text.copywriter',
    name: 'Copywriter & Headline Generator',
    category: 'text',
    billable: false,
    costUnknown: false,
    estimatedCredits: 0,
    requiresApproval: false,
    destructive: false,
  }),
  'image.generator': Object.freeze({
    id: 'image.generator',
    name: 'AI Image Generator',
    category: 'image',
    billable: true,
    costUnknown: true, // Exact cost depends on provider/model selection at execution
    estimatedCredits: null,
    requiresApproval: true,
    destructive: false,
  }),
  'video.generator': Object.freeze({
    id: 'video.generator',
    name: 'AI Video Generator',
    category: 'video',
    billable: true,
    costUnknown: true, // Exact cost depends on provider/model/resolution selection
    estimatedCredits: null,
    requiresApproval: true,
    destructive: false,
  }),
  'audio.trimmer': Object.freeze({
    id: 'audio.trimmer',
    name: 'Audio Trimmer & Converter',
    category: 'audio',
    billable: false,
    costUnknown: false,
    estimatedCredits: 0,
    requiresApproval: false,
    destructive: false,
  }),
  'studio.canvas': Object.freeze({
    id: 'studio.canvas',
    name: 'Deepsyq Studio Canvas',
    category: 'studio',
    billable: false,
    costUnknown: false,
    estimatedCredits: 0,
    requiresApproval: false,
    destructive: false,
  }),
  'templates.apply': Object.freeze({
    id: 'templates.apply',
    name: 'Template Layout Engine',
    category: 'templates',
    billable: false,
    costUnknown: false,
    estimatedCredits: 0,
    requiresApproval: false,
    destructive: false,
  }),
  'compare.multi': Object.freeze({
    id: 'compare.multi',
    name: 'Multi-AI Model Comparison',
    category: 'compare',
    billable: true,
    costUnknown: true,
    estimatedCredits: null,
    requiresApproval: true,
    destructive: false,
  }),
  'publish.external': Object.freeze({
    id: 'publish.external',
    name: 'External Channel Publisher',
    category: 'publish',
    billable: false,
    costUnknown: false,
    estimatedCredits: 0,
    requiresApproval: true,
    destructive: true, // External publishing is considered high-impact / destructive confirmation required
  }),
});

const MAX_PLAN_STEPS = 10;
const VALID_TOOL_NAME_REGEX = /^[a-z0-9]+(\.[a-z0-9_]+)+$/i;

// Pre-defined deterministic goal templates mapped to capabilities
const GOAL_TEMPLATES = Object.freeze({
  'etsy_listing': [
    { toolId: 'text.copywriter', description: 'Generate SEO title, tags, and product description for Etsy' },
    { toolId: 'image.generator', description: 'Generate high-res product hero photo' },
    { toolId: 'templates.apply', description: 'Apply Etsy listing graphics template' },
  ],
  'tiktok_ad': [
    { toolId: 'text.copywriter', description: 'Write engaging 15-second TikTok ad script' },
    { toolId: 'image.generator', description: 'Create key visual frame for ad background' },
    { toolId: 'video.generator', description: 'Render motion video clip for TikTok frame' },
    { toolId: 'audio.trimmer', description: 'Trim and overlay voice/music track' },
  ],
  'promo_30s': [
    { toolId: 'text.copywriter', description: 'Draft 30-second promo storyboard and voiceover script' },
    { toolId: 'image.generator', description: 'Generate promo visual assets' },
    { toolId: 'video.generator', description: 'Render promo video scenes' },
    { toolId: 'studio.canvas', description: 'Assemble scenes into final 30s timeline' },
  ],
  'social_content': [
    { toolId: 'text.copywriter', description: 'Generate post captions and hashtags' },
    { toolId: 'image.generator', description: 'Create social post graphic' },
    { toolId: 'templates.apply', description: 'Format image with brand frame template' },
  ],
  'ad_campaign': [
    { toolId: 'text.copywriter', description: 'Create ad headlines and primary copy variations' },
    { toolId: 'compare.multi', description: 'Compare visual variations across AI models' },
    { toolId: 'image.generator', description: 'Generate winning ad visual' },
  ],
  'product_marketing': [
    { toolId: 'text.copywriter', description: 'Draft product value proposition and email copy' },
    { toolId: 'image.generator', description: 'Generate clean product studio shot' },
    { toolId: 'studio.canvas', description: 'Build product marketing card layout' },
  ],
});

/**
 * Validates tool ID against injection attempts and authorized registry.
 * @param {string} toolId
 * @returns {boolean}
 */
function isAuthorizedTool(toolId) {
  if (typeof toolId !== 'string') return false;
  if (!VALID_TOOL_NAME_REGEX.test(toolId)) return false;
  return Object.prototype.hasOwnProperty.call(AUTHORIZED_CAPABILITIES, toolId);
}

/**
 * Normalizes goal string to match goal templates or general keywords.
 * @param {string} goalText
 * @returns {string}
 */
function normalizeGoalKey(goalText) {
  if (typeof goalText !== 'string') return '';
  const cleaned = goalText.trim().toLowerCase();
  if (cleaned.includes('etsy')) return 'etsy_listing';
  if (cleaned.includes('tiktok')) return 'tiktok_ad';
  if (cleaned.includes('30-second') || cleaned.includes('30s') || cleaned.includes('promo')) return 'promo_30s';
  if (cleaned.includes('social')) return 'social_content';
  if (cleaned.includes('campaign') || cleaned.includes('ad campaign')) return 'ad_campaign';
  if (cleaned.includes('product marketing') || cleaned.includes('marketing')) return 'product_marketing';
  return 'general';
}

/**
 * Compiles a user goal into a safe, deterministic User Agent Plan.
 *
 * @param {Object} params
 * @param {string} params.userId - Explicit owner user ID
 * @param {string} params.goal - Plain text user goal
 * @param {Array<Object>} [params.customSteps] - Optional user-provided custom steps
 * @returns {Object} Compiled Plan
 */
function compileUserAgentPlan({ userId, goal, customSteps } = {}, { availableCapabilities = {} } = {}) {
  // Guard 1: Strict User Scoping & State Validation
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('INVALID_USER_STATE: userId is required and must be a non-empty string');
  }

  if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
    throw new Error('INVALID_USER_STATE: goal is required and must be a non-empty string');
  }

  const sanitizedUserId = userId.trim();
  const sanitizedGoal = goal.trim();

  let rawSteps = [];
  const goalKey = normalizeGoalKey(sanitizedGoal);

  if (Array.isArray(customSteps) && customSteps.length > 0) {
    rawSteps = customSteps;
  } else if (GOAL_TEMPLATES[goalKey]) {
    rawSteps = GOAL_TEMPLATES[goalKey];
  } else {
    // Default fallback pipeline for general tasks
    rawSteps = [
      { toolId: 'text.copywriter', description: 'Analyze goal and generate copy outline' },
      { toolId: 'image.generator', description: 'Create supporting visual asset' },
    ];
  }

  // Guard 2: Overly large plans rejection
  if (rawSteps.length > MAX_PLAN_STEPS) {
    throw new Error(`OVERLY_LARGE_PLAN: Plan step count (${rawSteps.length}) exceeds maximum limit of ${MAX_PLAN_STEPS}`);
  }

  const compiledSteps = [];
  let planHasCostUnknown = false;
  let planRequiresApproval = false;
  let planHasDestructiveAction = false;
  let planIsBillable = false;
  const unavailableCapabilities = new Set();

  for (let i = 0; i < rawSteps.length; i++) {
    const rawStep = rawSteps[i];
    const toolId = rawStep.toolId;

    // Guard 3: Reject injection or unauthorized tools
    if (!isAuthorizedTool(toolId)) {
      throw new Error(`UNAUTHORIZED_CAPABILITY: Tool '${toolId}' is unauthorized or contains invalid characters`);
    }

    const cap = AUTHORIZED_CAPABILITIES[toolId];
    // Registry recognition is NOT proof a feature/provider is currently deployed.
    // Only trusted server-side capability evidence can mark a tool available.
    const available = availableCapabilities !== null && typeof availableCapabilities === 'object' &&
      Object.prototype.hasOwnProperty.call(availableCapabilities, toolId) &&
      availableCapabilities[toolId] === true;
    if (!available) unavailableCapabilities.add(toolId);
    const stepNumber = i + 1;
    const prerequisites = stepNumber > 1 ? [stepNumber - 1] : [];

    if (cap.costUnknown) planHasCostUnknown = true;
    if (cap.requiresApproval) planRequiresApproval = true;
    if (cap.destructive) planHasDestructiveAction = true;
    if (cap.billable) planIsBillable = true;

    compiledSteps.push({
      stepNumber,
      toolId: cap.id,
      toolName: cap.name,
      category: cap.category,
      description: typeof rawStep.description === 'string' ? rawStep.description.trim() : cap.name,
      prerequisites,
      billable: cap.billable,
      costUnknown: cap.costUnknown,
      estimatedCredits: cap.costUnknown ? null : cap.estimatedCredits,
      requiresApproval: cap.requiresApproval,
      destructive: cap.destructive,
      availability: available ? 'AVAILABLE' : 'UNAVAILABLE',
      executionStatus: 'NOT_STARTED',
    });
  }

  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    planId,
    userId: sanitizedUserId,
    goal: sanitizedGoal,
    goalCategory: goalKey,
    createdAt: new Date().toISOString(),
    stepsCount: compiledSteps.length,
    steps: compiledSteps,
    summary: {
      isBillable: planIsBillable,
      costUnknown: planHasCostUnknown,
      estimatedCreditsTotal: planHasCostUnknown ? null : compiledSteps.reduce((acc, s) => acc + (s.estimatedCredits || 0), 0),
      requiresApproval: planRequiresApproval,
      hasDestructiveAction: planHasDestructiveAction,
      unavailableCapabilities: [...unavailableCapabilities],
      // Planning never authorizes execution; B/D approval is a separate trust boundary.
      executionReady: false,
      approvalGates: {
        billableActionGate: planIsBillable,
        destructiveActionGate: planHasDestructiveAction,
        costQuoteGate: planHasCostUnknown,
      },
    },
    status: 'DRAFT_PENDING_APPROVAL',
  };
}

export {
  AUTHORIZED_CAPABILITIES,
  MAX_PLAN_STEPS,
  compileUserAgentPlan,
  isAuthorizedTool,
};
