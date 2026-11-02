import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepareLocalAgentDraft, executeLocalAgentDraft } from '../server/user-agent-stage1-local-draft.js';

function preview(workflowId = 'etsy_listing', owner = 'owner_a', goal = 'Handmade cotton pouch') {
  return prepareLocalAgentDraft({ authenticatedUserId: owner, goal, workflowId });
}
function run(p, overrides = {}) {
  return executeLocalAgentDraft({
    authenticatedUserId: p.userId,
    preview: p,
    confirmedPlanId: p.planId,
    userConfirmed: true,
    ...overrides,
  });
}

describe('F2 Stage 1 — no-cost local drafts', () => {
  it('reuses original plan compiler, one no-cost step, preview-only', () => {
    const p = preview();
    assert.equal(p.status, 'AWAITING_USER_CONFIRMATION');
    assert.equal(p.plan.stepsCount, 1);
    assert.equal(p.plan.steps[0].toolId, 'text.copywriter');
    assert.equal(p.plan.steps[0].availability, 'AVAILABLE');
    assert.equal(p.plan.summary.executionReady, false);
    assert.equal(p.plan.summary.isBillable, false);
    assert.equal(p.paidOperationsEnabled, false);
    assert.equal(p.externalWebAccess, false);
  });

  it('requires strict boolean explicit confirmation', () => {
    const p = preview();
    assert.deepEqual(run(p, { userConfirmed: false }), { status:'BLOCKED',reason:'EXPLICIT_CONFIRMATION_REQUIRED' });
    assert.deepEqual(run(p, { userConfirmed: 'true' }), { status:'BLOCKED',reason:'EXPLICIT_CONFIRMATION_REQUIRED' });
  });

  it('produces an editable Etsy brief with zero publication or provider charges', () => {
    const r = run(preview());
    assert.equal(r.status, 'LOCAL_DRAFT_READY');
    assert.match(r.deliverable.text, /Handmade cotton pouch/);
    assert.match(r.deliverable.text, /Title:/);
    assert.equal(r.deliverable.generatedByAI, false);
    assert.equal(r.deliverable.published, false);
    assert.equal(r.deliverable.savedToWorkspace, false);
    assert.equal(r.creditsSpent, 0);
    assert.equal(r.paidProviderCalls, 0);
    assert.equal(r.externalActionsPerformed, 0);
    assert.equal(r.persisted, false);
  });

  it('produces independently allowed social template', () => {
    const r = run(preview('social_content','owner_a','Autumn candle collection'));
    assert.equal(r.workflowId, 'social_content');
    assert.match(r.deliverable.text, /SOCIAL CONTENT/);
    assert.match(r.deliverable.text, /Autumn candle collection/);
  });

  it('blocks cross-account execution even with matching plan identifier', () => {
    assert.deepEqual(run(preview(), { authenticatedUserId:'owner_b' }), {
      status:'BLOCKED', reason:'INVALID_OR_CROSS_USER_PREVIEW',
    });
  });

  it('blocks wrong confirmation plan id', () => {
    assert.equal(run(preview(),{confirmedPlanId:'plan_other'}).status,'BLOCKED');
  });

  it('blocks forged provider enabled preview and unauthorized workflow', () => {
    const p = preview();
    assert.equal(run({...p,paidOperationsEnabled:true}).status,'BLOCKED');
    assert.equal(run({...p,workflowId:'publish.external'}).status,'BLOCKED');
  });

  it('blocks all paid, browser and unknown workflows', () => {
    for(const id of ['image.generator','video.generator','web.browser','stripe','__proto__']) {
      assert.throws(()=>preview(id), /UNSUPPORTED_AGENT_WORKFLOW/);
    }
  });

  it('requires a bounded authenticated user identity', () => {
    for(const id of [null,'',' ','owner a','owner/a',42]) {
      assert.throws(()=>prepareLocalAgentDraft({authenticatedUserId:id,goal:'New post',workflowId:'social_content'}),/INVALID_AUTHENTICATED_USER/);
    }
  });

  it('rejects multiline, oversized and empty input instead of truncating', () => {
    for(const goal of ['', '  ','x'.repeat(401),'bad\nscript',null]) {
      assert.throws(()=>prepareLocalAgentDraft({authenticatedUserId:'owner_a',goal,workflowId:'social_content'}),/INVALID_AGENT_GOAL/);
    }
  });

  it('never executes forged steps, URLs or provider metadata', () => {
    const p = preview('social_content');
    const r = run({...p,steps:[{toolId:'publish.external'}],providerUrl:'https://example.invalid',token:'secret'});
    assert.equal(r.status,'LOCAL_DRAFT_READY');
    assert.equal(r.externalActionsPerformed,0);
    assert.doesNotMatch(JSON.stringify(r),/example\.invalid|secret|publish\.external/);
  });

  it('does not mutate preview and returns immutable deliverable', () => {
    const p = preview();
    const before = JSON.stringify(p);
    const r = run(p);
    assert.equal(JSON.stringify(p),before);
    assert.equal(Object.isFrozen(r),true);
    assert.equal(Object.isFrozen(r.deliverable),true);
  });
});
