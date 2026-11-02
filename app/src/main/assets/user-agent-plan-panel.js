/**
 * app/src/main/assets/user-agent-plan-panel.js
 *
 * Safe User-Agent Planning & Approval Panel Component (Deepsyq Block 2 A2.2).
 * Consumes precompiled, server-authenticated User Agent plan objects.
 *
 * Constraints & Guarantees:
 * - Text node / textContent DOM construction ONLY (NO untrusted innerHTML).
 * - Never compiles unsafe tool identifiers in browser (relies on server plan).
 * - Scoped to exact user ID token; hides/blocks rendering on user mismatch.
 * - Displays steps, prerequisites, capabilities, availability & cost status.
 * - Missing/unverified tools marked "Coming Soon / Unavailable" with action disabled.
 * - Billable / destructive / publishing actions tagged "Approval Required".
 * - Exposes callbacks for onRequestApproval and onCancelPreview on DIRECT click only.
 * - ZERO network calls, zero Stripe, zero credit mutation, zero auto-dispatch.
 * - Accessible focus, ARIA tags, responsive mobile layout (encapsulated styles).
 */

/**
 * Creates and renders the User Agent Plan Approval Panel DOM element.
 *
 * @param {Object} plan - Precompiled User Agent plan object from server
 * @param {Object} [options]
 * @param {string} [options.currentUserId] - Current authenticated user ID for scope check
 * @param {Function} [options.onRequestApproval] - Callback when user clicks Request Approval
 * @param {Function} [options.onCancelPreview] - Callback when user clicks Cancel Preview
 * @param {Object} [options.documentOverride] - Custom document object for testing environment
 * @returns {HTMLElement|null} The panel container element or hidden element on scope mismatch
 */
export function createUserAgentPlanPanel(plan, options = {}) {
  const doc = options.documentOverride || (typeof document !== 'undefined' ? document : null);
  if (!doc) return null;

  // Account Scope Guard: Hide panel if user ID mismatch is detected
  const currentUserId = options.currentUserId;
  if (typeof currentUserId !== 'string' || !currentUserId.trim() || !plan || typeof plan.userId !== 'string' || currentUserId !== plan.userId) {
    const hidden = doc.createElement('div');
    hidden.setAttribute('data-panel-status', 'SCOPE_MISMATCH');
    hidden.style.display = 'none';
    return hidden;
  }

  // Plan Validation Guard
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.steps)) {
    const hidden = doc.createElement('div');
    hidden.setAttribute('data-panel-status', 'INVALID_PLAN');
    hidden.style.display = 'none';
    return hidden;
  }

  // Root Panel Container
  const panel = doc.createElement('section');
  panel.className = 'deepsyq-plan-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'User Agent Plan Approval Panel');
  panel.setAttribute('tabindex', '0');

  // Encapsulated Scoped Layout Styles
  const style = doc.createElement('style');
  style.textContent = `
    .deepsyq-plan-panel {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px;
      max-width: 640px;
      margin: 12px auto;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      box-sizing: border-box;
    }
    .deepsyq-plan-header {
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .deepsyq-plan-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .deepsyq-plan-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #38bdf8;
      margin: 0;
    }
    .deepsyq-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .deepsyq-badge-category { background: #1e293b; color: #94a3b8; border: 1px solid #475569; }
    .deepsyq-badge-available { background: #065f46; color: #34d399; }
    .deepsyq-badge-unavailable { background: #7f1d1d; color: #fca5a5; }
    .deepsyq-badge-approval { background: #78350f; color: #fcd34d; }
    .deepsyq-badge-billable { background: #312e81; color: #a5b4fc; }
    .deepsyq-badge-destructive { background: #881337; color: #fda4af; }

    .deepsyq-plan-goal {
      font-size: 0.95rem;
      color: #e2e8f0;
      margin: 8px 0 0 0;
      word-break: break-word;
    }
    .deepsyq-plan-meta {
      display: flex;
      gap: 12px;
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .deepsyq-plan-steps {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 12px 0;
    }
    .deepsyq-step-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
    }
    .deepsyq-step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .deepsyq-step-num {
      font-size: 0.85rem;
      font-weight: 700;
      color: #38bdf8;
    }
    .deepsyq-step-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    .deepsyq-step-desc {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin: 6px 0;
      word-break: break-word;
    }
    .deepsyq-step-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #94a3b8;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .deepsyq-step-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .deepsyq-summary-box {
      background: #090d16;
      border: 1px dashed #334155;
      border-radius: 8px;
      padding: 10px 12px;
      margin-top: 12px;
      font-size: 0.85rem;
      color: #cbd5e1;
    }
    .deepsyq-summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .deepsyq-summary-row:last-child { margin-bottom: 0; }

    .deepsyq-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .deepsyq-btn {
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease;
      min-height: 38px;
    }
    .deepsyq-btn:focus {
      outline: 2px solid #38bdf8;
      outline-offset: 2px;
    }
    .deepsyq-btn-cancel {
      background: #334155;
      color: #f8fafc;
    }
    .deepsyq-btn-cancel:hover { background: #475569; }
    .deepsyq-btn-approve {
      background: #0284c7;
      color: #ffffff;
    }
    .deepsyq-btn-approve:hover:not(:disabled) { background: #0369a1; }
    .deepsyq-btn:disabled {
      background: #334155;
      color: #64748b;
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (max-width: 480px) {
      .deepsyq-plan-panel { padding: 12px; }
      .deepsyq-actions { flex-direction: column-reverse; }
      .deepsyq-btn { width: 100%; }
    }
  `;
  panel.appendChild(style);

  // Header Section
  const header = doc.createElement('div');
  header.className = 'deepsyq-plan-header';

  const titleRow = doc.createElement('div');
  titleRow.className = 'deepsyq-plan-title-row';

  const title = doc.createElement('h3');
  title.className = 'deepsyq-plan-title';
  title.textContent = 'User Agent Plan';
  titleRow.appendChild(title);

  if (plan.goalCategory) {
    const catBadge = doc.createElement('span');
    catBadge.className = 'deepsyq-badge deepsyq-badge-category';
    catBadge.textContent = String(plan.goalCategory).toUpperCase();
    titleRow.appendChild(catBadge);
  }
  header.appendChild(titleRow);

  const goalText = doc.createElement('p');
  goalText.className = 'deepsyq-plan-goal';
  goalText.textContent = String(plan.goal || '');
  header.appendChild(goalText);

  const meta = doc.createElement('div');
  meta.className = 'deepsyq-plan-meta';

  const planIdSpan = doc.createElement('span');
  planIdSpan.textContent = `ID: ${String(plan.planId || 'draft')}`;
  meta.appendChild(planIdSpan);

  const userSpan = doc.createElement('span');
  userSpan.textContent = `Owner: ${String(plan.userId || 'anonymous')}`;
  meta.appendChild(userSpan);

  header.appendChild(meta);
  panel.appendChild(header);

  // Steps Section
  const stepsContainer = doc.createElement('div');
  stepsContainer.className = 'deepsyq-plan-steps';
  stepsContainer.setAttribute('role', 'list');
  stepsContainer.setAttribute('aria-label', 'Plan steps pipeline');

  let hasUnavailableTool = false;

  plan.steps.forEach((step, idx) => {
    const stepCard = doc.createElement('div');
    stepCard.className = 'deepsyq-step-card';
    stepCard.setAttribute('role', 'listitem');

    const stepHeader = doc.createElement('div');
    stepHeader.className = 'deepsyq-step-header';

    const leftHeader = doc.createElement('div');
    const stepNum = doc.createElement('span');
    stepNum.className = 'deepsyq-step-num';
    stepNum.textContent = `Step ${step.stepNumber || idx + 1}: `;
    leftHeader.appendChild(stepNum);

    const stepName = doc.createElement('span');
    stepName.className = 'deepsyq-step-name';
    stepName.textContent = String(step.toolName || step.toolId || 'Tool');
    leftHeader.appendChild(stepName);

    stepHeader.appendChild(leftHeader);

    // Availability Badge
    const isAvailable = step.availability === 'AVAILABLE';
    if (!isAvailable) hasUnavailableTool = true;

    const availBadge = doc.createElement('span');
    availBadge.className = `deepsyq-badge ${isAvailable ? 'deepsyq-badge-available' : 'deepsyq-badge-unavailable'}`;
    availBadge.textContent = isAvailable ? 'Available' : 'Coming Soon / Unavailable';
    stepHeader.appendChild(availBadge);

    stepCard.appendChild(stepHeader);

    // Step Description
    const desc = doc.createElement('p');
    desc.className = 'deepsyq-step-desc';
    desc.textContent = String(step.description || '');
    stepCard.appendChild(desc);

    // Step Footer (Prerequisites & Tags)
    const stepFooter = doc.createElement('div');
    stepFooter.className = 'deepsyq-step-footer';

    const prereq = doc.createElement('span');
    const prereqList = Array.isArray(step.prerequisites) && step.prerequisites.length > 0
      ? step.prerequisites.map(p => `Step ${p}`).join(', ')
      : 'None';
    prereq.textContent = `Prerequisites: ${prereqList}`;
    stepFooter.appendChild(prereq);

    const tags = doc.createElement('div');
    tags.className = 'deepsyq-step-tags';

    if (step.billable) {
      const bTag = doc.createElement('span');
      bTag.className = 'deepsyq-badge deepsyq-badge-billable';
      bTag.textContent = 'Billable (Approval Required)';
      tags.appendChild(bTag);
    }

    if (step.destructive) {
      const dTag = doc.createElement('span');
      dTag.className = 'deepsyq-badge deepsyq-badge-destructive';
      dTag.textContent = 'Destructive (Approval Required)';
      tags.appendChild(dTag);
    } else if (step.requiresApproval && !step.billable) {
      const aTag = doc.createElement('span');
      aTag.className = 'deepsyq-badge deepsyq-badge-approval';
      aTag.textContent = 'Approval Required';
      tags.appendChild(aTag);
    }

    stepFooter.appendChild(tags);
    stepCard.appendChild(stepFooter);

    stepsContainer.appendChild(stepCard);
  });

  panel.appendChild(stepsContainer);

  // Summary Box
  const summaryBox = doc.createElement('div');
  summaryBox.className = 'deepsyq-summary-box';

  const summary = plan.summary || {};

  const costRow = doc.createElement('div');
  costRow.className = 'deepsyq-summary-row';
  const costLabel = doc.createElement('span');
  costLabel.textContent = 'Estimated Cost Status:';
  const costVal = doc.createElement('span');
  if (summary.costUnknown || summary.estimatedCreditsTotal === null) {
    costVal.textContent = 'Quote Required / TBD';
    costVal.style.color = '#fcd34d';
  } else {
    costVal.textContent = `${summary.estimatedCreditsTotal} Credits`;
  }
  costRow.appendChild(costLabel);
  costRow.appendChild(costVal);
  summaryBox.appendChild(costRow);

  const statusRow = doc.createElement('div');
  statusRow.className = 'deepsyq-summary-row';
  const statusLabel = doc.createElement('span');
  statusLabel.textContent = 'Plan Status:';
  const statusVal = doc.createElement('span');
  statusVal.textContent = String(plan.status || 'DRAFT_PENDING_APPROVAL');
  statusRow.appendChild(statusLabel);
  statusRow.appendChild(statusVal);
  summaryBox.appendChild(statusRow);

  panel.appendChild(summaryBox);

  // Actions Container
  const actionsContainer = doc.createElement('div');
  actionsContainer.className = 'deepsyq-actions';

  // Cancel / Dismiss Button
  const cancelBtn = doc.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'deepsyq-btn deepsyq-btn-cancel';
  cancelBtn.setAttribute('aria-label', 'Cancel plan preview');
  cancelBtn.textContent = 'Cancel Preview';
  cancelBtn.addEventListener('click', (evt) => {
    evt.preventDefault();
    if (typeof options.onCancelPreview === 'function') {
      options.onCancelPreview({ planId: plan.planId });
    }
  });
  actionsContainer.appendChild(cancelBtn);

  // Request Approval Button
  const approveBtn = doc.createElement('button');
  approveBtn.type = 'button';
  approveBtn.className = 'deepsyq-btn deepsyq-btn-approve';
  approveBtn.setAttribute('aria-label', 'Request approval for plan execution');

  const missingVerifiedQuote = plan.steps.some(step => step.billable === true &&
    (step.costUnknown === true || !Number.isSafeInteger(step.estimatedCredits) || step.estimatedCredits < 0)) ||
    plan.summary?.costUnknown === true;
  if (hasUnavailableTool || missingVerifiedQuote) {
    approveBtn.disabled = true;
    approveBtn.textContent = hasUnavailableTool ? 'Action Disabled (Unavailable Tool)' : 'Quote Required Before Approval';
  } else {
    approveBtn.disabled = false;
    approveBtn.textContent = 'Request Approval';
  }

  approveBtn.addEventListener('click', (evt) => {
    evt.preventDefault();
    if (approveBtn.disabled) return;
    if (typeof options.onRequestApproval === 'function') {
      options.onRequestApproval({ planId: plan.planId, plan });
    }
  });

  actionsContainer.appendChild(approveBtn);
  panel.appendChild(actionsContainer);

  return panel;
}
