import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORIZED_CAPABILITIES,
  MAX_PLAN_STEPS,
  compileUserAgentPlan,
  isAuthorizedTool,
} from '../server/user-agent-plan.js';

describe('User Agent Plan Compiler Unit Tests (A2.1)', () => {
  describe('Capability Registry & Tool Validation', () => {
    test('contains expected authorized capabilities with safe frozen properties', () => {
      assert.ok(AUTHORIZED_CAPABILITIES['text.copywriter']);
      assert.ok(AUTHORIZED_CAPABILITIES['image.generator']);
      assert.ok(AUTHORIZED_CAPABILITIES['video.generator']);
      assert.ok(AUTHORIZED_CAPABILITIES['audio.trimmer']);
      assert.ok(AUTHORIZED_CAPABILITIES['studio.canvas']);
      assert.ok(AUTHORIZED_CAPABILITIES['templates.apply']);
      assert.ok(AUTHORIZED_CAPABILITIES['compare.multi']);
      assert.ok(AUTHORIZED_CAPABILITIES['publish.external']);

      assert.equal(AUTHORIZED_CAPABILITIES['text.copywriter'].billable, false);
      assert.equal(AUTHORIZED_CAPABILITIES['image.generator'].billable, true);
      assert.equal(AUTHORIZED_CAPABILITIES['image.generator'].costUnknown, true);
      assert.equal(AUTHORIZED_CAPABILITIES['publish.external'].destructive, true);
    });

    test('isAuthorizedTool validates valid tool IDs and rejects injection attempts', () => {
      assert.equal(isAuthorizedTool('text.copywriter'), true);
      assert.equal(isAuthorizedTool('image.generator'), true);

      // Rejections
      assert.equal(isAuthorizedTool('__proto__'), false);
      assert.equal(isAuthorizedTool('constructor'), false);
      assert.equal(isAuthorizedTool('system.exec'), false);
      assert.equal(isAuthorizedTool('<script>alert(1)</script>'), false);
      assert.equal(isAuthorizedTool('../server/user-agent-plan'), false);
      assert.equal(isAuthorizedTool('text.copywriter; DROP TABLE users;'), false);
      assert.equal(isAuthorizedTool(123), false);
      assert.equal(isAuthorizedTool(null), false);
    });
  });

  describe('User & Goal Input Validation', () => {
    test('rejects missing or empty userId', () => {
      assert.throws(
        () => compileUserAgentPlan({ userId: '', goal: 'Create Etsy listing' }),
        { message: /INVALID_USER_STATE/ }
      );
      assert.throws(
        () => compileUserAgentPlan({ userId: '   ', goal: 'Create Etsy listing' }),
        { message: /INVALID_USER_STATE/ }
      );
      assert.throws(
        () => compileUserAgentPlan({ userId: null, goal: 'Create Etsy listing' }),
        { message: /INVALID_USER_STATE/ }
      );
    });

    test('rejects missing or empty goal', () => {
      assert.throws(
        () => compileUserAgentPlan({ userId: 'user_123', goal: '' }),
        { message: /INVALID_USER_STATE/ }
      );
      assert.throws(
        () => compileUserAgentPlan({ userId: 'user_123', goal: '   ' }),
        { message: /INVALID_USER_STATE/ }
      );
    });
  });

  describe('Deterministic Goal Plan Compilation', () => {
    test('compiles Etsy Listing goal correctly with prerequisites and approval gates', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_etsy_owner',
        goal: 'Create an Etsy listing for handmade candles',
      });

      assert.equal(plan.userId, 'usr_etsy_owner');
      assert.equal(plan.goalCategory, 'etsy_listing');
      assert.equal(plan.stepsCount, 3);
      assert.equal(plan.status, 'DRAFT_PENDING_APPROVAL');

      // Check steps & prerequisites
      assert.equal(plan.steps[0].toolId, 'text.copywriter');
      assert.deepEqual(plan.steps[0].prerequisites, []);

      assert.equal(plan.steps[1].toolId, 'image.generator');
      assert.deepEqual(plan.steps[1].prerequisites, [1]);
      assert.equal(plan.steps[1].billable, true);
      assert.equal(plan.steps[1].costUnknown, true);

      assert.equal(plan.steps[2].toolId, 'templates.apply');
      assert.deepEqual(plan.steps[2].prerequisites, [2]);

      // Check summary & cost unknown state
      assert.equal(plan.summary.isBillable, true);
      assert.equal(plan.summary.costUnknown, true);
      assert.equal(plan.summary.estimatedCreditsTotal, null);
      assert.equal(plan.summary.requiresApproval, true);
      assert.equal(plan.summary.approvalGates.billableActionGate, true);
    });

    test('compiles TikTok Ad goal with video and audio tools', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_tiktok',
        goal: 'Make a TikTok ad from my photos',
      });

      assert.equal(plan.goalCategory, 'tiktok_ad');
      assert.equal(plan.stepsCount, 4);
      assert.equal(plan.steps[0].toolId, 'text.copywriter');
      assert.equal(plan.steps[1].toolId, 'image.generator');
      assert.equal(plan.steps[2].toolId, 'video.generator');
      assert.equal(plan.steps[3].toolId, 'audio.trimmer');
    });

    test('compiles 30-second Promo goal with studio canvas assembly', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_promo',
        goal: 'Create a 30-second promo',
      });

      assert.equal(plan.goalCategory, 'promo_30s');
      assert.equal(plan.stepsCount, 4);
      assert.equal(plan.steps[3].toolId, 'studio.canvas');
    });

    test('compiles Social Content goal', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_social',
        goal: 'Prepare social media content',
      });

      assert.equal(plan.goalCategory, 'social_content');
      assert.equal(plan.stepsCount, 3);
    });

    test('compiles Ad Campaign goal with Compare tool', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_campaign',
        goal: 'Build an ad campaign',
      });

      assert.equal(plan.goalCategory, 'ad_campaign');
      assert.equal(plan.steps[1].toolId, 'compare.multi');
    });

    test('compiles Product Marketing goal', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_marketing',
        goal: 'Turn product photos into marketing content',
      });

      assert.equal(plan.goalCategory, 'product_marketing');
      assert.equal(plan.stepsCount, 3);
    });
  });

  describe('Custom Steps & Safety Rejections', () => {
    test('rejects plan with injected or unauthorized tool names in custom steps', () => {
      assert.throws(
        () =>
          compileUserAgentPlan({
            userId: 'usr_hacker',
            goal: 'Malicious plan',
            customSteps: [
              { toolId: 'text.copywriter', description: 'Safe step' },
              { toolId: 'system.execute_shell', description: 'Injected step' },
            ],
          }),
        { message: /UNAUTHORIZED_CAPABILITY/ }
      );
    });

    test('rejects plan exceeding maximum step bounds', () => {
      const oversizedSteps = Array.from({ length: MAX_PLAN_STEPS + 1 }, (_, i) => ({
        toolId: 'text.copywriter',
        description: `Step ${i + 1}`,
      }));

      assert.throws(
        () =>
          compileUserAgentPlan({
            userId: 'usr_large',
            goal: 'Huge goal',
            customSteps: oversizedSteps,
          }),
        { message: /OVERLY_LARGE_PLAN/ }
      );
    });

    test('flags destructive actions for approval when publish tool is requested', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_publisher',
        goal: 'Publish campaign',
        customSteps: [
          { toolId: 'text.copywriter', description: 'Write copy' },
          { toolId: 'publish.external', description: 'Publish to channel' },
        ],
      });

      assert.equal(plan.summary.hasDestructiveAction, true);
      assert.equal(plan.summary.requiresApproval, true);
      assert.equal(plan.summary.approvalGates.destructiveActionGate, true);
      assert.equal(plan.steps[1].destructive, true);
    });
  });
});

test('COORD5 A2.1: unverified tools fail closed and plans never claim execution', () => {
  const plan = compileUserAgentPlan({userId:'test-user',goal:'Create Etsy listing'});
  assert.equal(plan.status,'DRAFT_PENDING_APPROVAL');
  assert.equal(plan.summary.executionReady,false);
  assert.ok(plan.summary.unavailableCapabilities.includes('text.copywriter'));
  assert.ok(plan.summary.unavailableCapabilities.includes('image.generator'));
  assert.ok(plan.steps.every(step=>step.availability==='UNAVAILABLE'&&step.executionStatus==='NOT_STARTED'));
});

test('COORD5 A2.1: trusted server capabilities allow only explicit verified tools, still no dispatch', () => {
  const plan = compileUserAgentPlan(
    {userId:'test-user',goal:'Create Etsy listing'},
    {availableCapabilities:{'text.copywriter':true,'image.generator':false,'publish.external':true}}
  );
  assert.equal(plan.steps[0].availability,'AVAILABLE');
  assert.equal(plan.steps[1].availability,'UNAVAILABLE');
  assert.equal(plan.steps[2].availability,'UNAVAILABLE');
  assert.equal(plan.summary.executionReady,false);
  assert.equal(plan.summary.requiresApproval,true);
  assert.equal(plan.steps[0].executionStatus,'NOT_STARTED');
});
