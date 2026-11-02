/**
 * F2 Stage 1 — bounded no-spend local content-draft step.
 * Reuses the existing Deepsyq User Agent plan compiler (A2.1).
 *
 * This is NOT a browser operator, an AI provider, an autonomous orchestrator,
 * an auth boundary or a new paid-workflow stack. No network, DB, file writes,
 * Stripe, credits, external publication, or provider dispatch.
 *
 * The caller MUST obtain authenticatedUserId from trusted server-side auth.
 * A confirmation flag here ONLY enables a local template and can NEVER be
 * reused as proof of payment, provider consent, or external-action approval.
 */
import { compileUserAgentPlan } from './user-agent-plan.js';

const WORKFLOWS = Object.freeze({
  etsy_listing: Object.freeze({
    label: 'Editable Etsy listing brief',
    description: 'Prepare an editable listing draft without publishing',
  }),
  social_content: Object.freeze({
    label: 'Editable social post brief',
    description: 'Prepare an editable social content draft without publishing',
  }),
});

const MAX_GOAL = 400;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,127}$/;

function ownerId(value) {
  if (typeof value !== 'string' || !ID.test(value)) {
    throw new TypeError('INVALID_AUTHENTICATED_USER');
  }
  return value;
}

function goalText(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_GOAL ||
      /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError('INVALID_AGENT_GOAL');
  }
  return value.trim();
}

/** Preview only; no execution on page load or preview creation. */
export function prepareLocalAgentDraft({ authenticatedUserId, goal, workflowId } = {}) {
  const userId = ownerId(authenticatedUserId);
  const idea = goalText(goal);
  if (!Object.hasOwn(WORKFLOWS, workflowId)) {
    throw new TypeError('UNSUPPORTED_AGENT_WORKFLOW');
  }
  const plan = compileUserAgentPlan({
    userId,
    goal: idea,
    customSteps: [{ toolId: 'text.copywriter', description: WORKFLOWS[workflowId].description }],
  }, { availableCapabilities: { 'text.copywriter': true } });
  return Object.freeze({
    userId,
    planId: plan.planId,
    workflowId,
    goal: idea,
    plan,
    status: 'AWAITING_USER_CONFIRMATION',
    previewOnly: true,
    paidOperationsEnabled: false,
    externalWebAccess: false,
    storageEnabled: false,
  });
}

function editableText(workflowId, idea) {
  if (workflowId === 'etsy_listing') {
    return [
      'ETSY LISTING — EDITABLE STARTER DRAFT (NOT PUBLISHED)',
      'Product brief: ' + idea,
      'Title: [Add the accurate product name, type and one key attribute]',
      'Description: [Add verified details and exactly what the buyer receives]',
      'Tags: [Research and review relevant search terms]',
      'Files and delivery: [Confirm actual formats and access instructions]',
      'Price and license: [Enter your real price and permitted usage terms]',
      'Next: Review the draft and any images manually in Deepsyq Studio.',
    ].join('\n');
  }
  return [
    'SOCIAL CONTENT — EDITABLE STARTER DRAFT (NOT PUBLISHED)',
    'Topic brief: ' + idea,
    'Opening: [Write a clear, factual hook for your audience]',
    'Main message: [Enter the verified benefit and relevant facts]',
    'Call to action: [Choose a suitable next step or valid link]',
    'Creative: [Select a supported format and review in Studio manually]',
    'Next: Review and approve every claim before posting.',
  ].join('\n');
}

/** Executes a deterministic text-template step only after explicit click consent.
 * It never trusts preview.steps, billable flags, arbitrary tool IDs or URLs.
 */
export function executeLocalAgentDraft({
  authenticatedUserId,
  preview,
  confirmedPlanId,
  userConfirmed = false,
} = {}) {
  const userId = ownerId(authenticatedUserId);
  if (!preview || typeof preview !== 'object' ||
      preview.userId !== userId ||
      !Object.hasOwn(WORKFLOWS, preview.workflowId) ||
      typeof preview.planId !== 'string' ||
      !preview.planId.startsWith('plan_') ||
      preview.planId !== confirmedPlanId ||
      preview.status !== 'AWAITING_USER_CONFIRMATION' ||
      preview.previewOnly !== true ||
      preview.paidOperationsEnabled !== false) {
    return Object.freeze({ status: 'BLOCKED', reason: 'INVALID_OR_CROSS_USER_PREVIEW' });
  }
  if (userConfirmed !== true) {
    return Object.freeze({ status: 'BLOCKED', reason: 'EXPLICIT_CONFIRMATION_REQUIRED' });
  }
  let idea;
  try { idea = goalText(preview.goal); }
  catch { return Object.freeze({ status: 'BLOCKED', reason: 'INVALID_AGENT_GOAL' }); }
  return Object.freeze({
    status: 'LOCAL_DRAFT_READY',
    userId,
    planId: preview.planId,
    workflowId: preview.workflowId,
    deliverable: Object.freeze({
      type: 'editable_text_template',
      title: WORKFLOWS[preview.workflowId].label,
      text: editableText(preview.workflowId, idea),
      generatedByAI: false,
      reviewedByHuman: false,
      published: false,
      savedToWorkspace: false,
    }),
    creditsSpent: 0,
    paidProviderCalls: 0,
    externalActionsPerformed: 0,
    persisted: false,
    nextStep: 'REVIEW_AND_MANUALLY_OPEN_STUDIO',
  });
}
