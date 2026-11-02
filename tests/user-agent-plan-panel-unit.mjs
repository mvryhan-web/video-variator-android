import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compileUserAgentPlan } from '../server/user-agent-plan.js';
import { createUserAgentPlanPanel } from '../app/src/main/assets/user-agent-plan-panel.js';

/**
 * Lightweight Mock DOM Node for Node.js unit testing.
 */
class MockNode {
  constructor(nodeName = 'DIV', nodeType = 1) {
    this.nodeName = nodeName.toUpperCase();
    this.nodeType = nodeType;
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.listeners = {};
    this._textContent = '';
    this.className = '';
    this.type = '';
    this.disabled = false;
  }

  get textContent() {
    if (this.nodeType === 3) return this._textContent;
    return this.children.map(c => c.textContent).join('');
  }

  set textContent(val) {
    if (this.nodeType === 3) {
      this._textContent = String(val);
    } else {
      this.children = [new MockNode('#text', 3)];
      this.children[0]._textContent = String(val);
    }
  }

  appendChild(child) {
    if (child) this.children.push(child);
    return child;
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    const event = { preventDefault: () => {} };
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn(event));
    }
  }

  // Recursive search for nodes matching condition
  querySelectorAll(predicate) {
    let matches = [];
    if (predicate(this)) matches.push(this);
    for (const child of this.children) {
      if (child.querySelectorAll) {
        matches = matches.concat(child.querySelectorAll(predicate));
      }
    }
    return matches;
  }

  querySelector(predicate) {
    const res = this.querySelectorAll(predicate);
    return res.length > 0 ? res[0] : null;
  }
}

/**
 * Lightweight Mock Document.
 */
class MockDocument {
  createElement(tagName) {
    return new MockNode(tagName, 1);
  }
}

describe('User Agent Plan Panel Component Unit Tests (A2.2)', () => {
  const doc = new MockDocument();

  describe('XSS Text Escaping & Safe DOM Construction', () => {
    test('safely escapes XSS payloads and script tags in goal and step text without execution', () => {
      const maliciousGoal = '<script>alert("XSS_GOAL")</script><img src=x onerror=alert(1)>';
      const maliciousDescription = 'Write SEO text <svg/onload=alert("XSS_STEP")>';

      const plan = compileUserAgentPlan({
        userId: 'usr_xss_test',
        goal: maliciousGoal,
        customSteps: [
          { toolId: 'text.copywriter', description: maliciousDescription },
        ],
      }, {
        availableCapabilities: { 'text.copywriter': true },
      });

      const panel = createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_xss_test',
        documentOverride: doc,
      });

      assert.ok(panel);

      // Search all text nodes for escaped raw script string
      const textNodes = panel.querySelectorAll(n => n.nodeType === 3);
      const fullText = textNodes.map(n => n.textContent).join(' ');

      assert.ok(fullText.includes('<script>alert("XSS_GOAL")</script>'));
      assert.ok(fullText.includes('<svg/onload=alert("XSS_STEP")>'));

      // Ensure no mock node exists named SCRIPT or SVG
      const scriptElements = panel.querySelectorAll(n => n.nodeName === 'SCRIPT' || n.nodeName === 'SVG');
      assert.equal(scriptElements.length, 0);
    });
  });

  describe('Account Scope Token Mismatch', () => {
    test('hides/blocks panel rendering when userId does not match current session user', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_owner_123',
        goal: 'Etsy listing creation',
      });

      const panel = createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_attacker_999',
        documentOverride: doc,
      });

      assert.ok(panel);
      assert.equal(panel.getAttribute('data-panel-status'), 'SCOPE_MISMATCH');
      assert.equal(panel.style.display, 'none');
    });

    test('renders panel correctly when currentUserId matches plan owner', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_owner_123',
        goal: 'Etsy listing creation',
      });

      const panel = createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_owner_123',
        documentOverride: doc,
      });

      assert.ok(panel);
      assert.equal(panel.getAttribute('role'), 'region');
      assert.equal(panel.getAttribute('aria-label'), 'User Agent Plan Approval Panel');
    });
  });

  describe('Unavailable Tool Blocking & "Coming Soon" Badges', () => {
    test('blocks approval button and marks unavailable tools "Coming Soon / Unavailable"', () => {
      // Compiled plan without available capabilities will have UNAVAILABLE steps
      const plan = compileUserAgentPlan({
        userId: 'usr_test',
        goal: 'Create Etsy listing',
      });

      const panel = createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_test',
        documentOverride: doc,
      });

      const badges = panel.querySelectorAll(n => n.className && n.className.includes('deepsyq-badge-unavailable'));
      assert.ok(badges.length > 0);
      assert.equal(badges[0].textContent, 'Coming Soon / Unavailable');

      const approveBtn = panel.querySelector(n => n.className && n.className.includes('deepsyq-btn-approve'));
      assert.ok(approveBtn);
      assert.equal(approveBtn.disabled, true);
      assert.equal(approveBtn.textContent, 'Action Disabled (Unavailable Tool)');
    });
  });

  describe('Unpriced Paid Action & Billable/Destructive Approval Gates', () => {
    test('renders Quote Required for unpriced paid steps and tags Billable/Destructive approval badges', () => {
      const plan = compileUserAgentPlan({
        userId: 'usr_billable',
        goal: 'Publish ad campaign',
        customSteps: [
          { toolId: 'image.generator', description: 'Generate hero image' },
          { toolId: 'publish.external', description: 'Publish externally' },
        ],
      }, {
        availableCapabilities: {
          'image.generator': true,
          'publish.external': true,
        },
      });

      const panel = createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_billable',
        documentOverride: doc,
      });

      // Verify "Quote Required / TBD" for costUnknown
      const textNodes = panel.querySelectorAll(n => n.nodeType === 3);
      const fullText = textNodes.map(n => n.textContent).join(' ');
      assert.ok(fullText.includes('Quote Required / TBD'));

      // Check Billable & Destructive tags
      const billableTags = panel.querySelectorAll(n => n.className && n.className.includes('deepsyq-badge-billable'));
      assert.equal(billableTags.length, 1);
      assert.equal(billableTags[0].textContent, 'Billable (Approval Required)');

      const destructiveTags = panel.querySelectorAll(n => n.className && n.className.includes('deepsyq-badge-destructive'));
      assert.equal(destructiveTags.length, 1);
      assert.equal(destructiveTags[0].textContent, 'Destructive (Approval Required)');
    });
  });

  describe('Direct Click Callbacks & Initialization Guard', () => {
    test('does NOT trigger onRequestApproval or onCancelPreview on initialization', () => {
      let approvedCalls = 0;
      let cancelCalls = 0;

      const plan = compileUserAgentPlan({
        userId: 'usr_callbacks',
        goal: 'Social content prep',
        customSteps: [{ toolId: 'text.copywriter', description: 'Safe no-charge copy draft' }],
      }, {
        availableCapabilities: { 'text.copywriter': true },
      });

      createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_callbacks',
        onRequestApproval: () => { approvedCalls++; },
        onCancelPreview: () => { cancelCalls++; },
        documentOverride: doc,
      });

      assert.equal(approvedCalls, 0);
      assert.equal(cancelCalls, 0);
    });

    test('triggers onRequestApproval and onCancelPreview ONLY on direct button click', () => {
      let approvedPlanId = null;
      let canceledPlanId = null;

      const plan = compileUserAgentPlan({
        userId: 'usr_callbacks',
        goal: 'Social content prep',
        customSteps: [{ toolId: 'text.copywriter', description: 'Safe no-charge copy draft' }],
      }, {
        availableCapabilities: { 'text.copywriter': true },
      });

      const panel = createUserAgentPlanPanel(plan, {
        currentUserId: 'usr_callbacks',
        onRequestApproval: (data) => { approvedPlanId = data.planId; },
        onCancelPreview: (data) => { canceledPlanId = data.planId; },
        documentOverride: doc,
      });

      const approveBtn = panel.querySelector(n => n.className && n.className.includes('deepsyq-btn-approve'));
      const cancelBtn = panel.querySelector(n => n.className && n.className.includes('deepsyq-btn-cancel'));

      assert.ok(approveBtn);
      assert.equal(approveBtn.disabled, false);
      assert.ok(cancelBtn);

      // Simulate Direct Click
      cancelBtn.click();
      assert.equal(canceledPlanId, plan.planId);

      approveBtn.click();
      assert.equal(approvedPlanId, plan.planId);
    });
  });
});


describe('Coordinator fail-closed panel acceptance', () => {
  const doc = new MockDocument();
  test('missing current authenticated user never displays private plan', () => {
    const plan = compileUserAgentPlan({userId:'owner-a',goal:'social content'});
    for (const currentUserId of [undefined, '', 'owner-b']) {
      const panel = createUserAgentPlanPanel(plan,{currentUserId,documentOverride:doc});
      assert.equal(panel.getAttribute('data-panel-status'),'SCOPE_MISMATCH');
      assert.equal(panel.style.display,'none');
    }
  });
  test('unknown price blocks approval callback and execution even for advertised provider', () => {
    const plan=compileUserAgentPlan({userId:'owner-a',goal:'visual ad',customSteps:[{toolId:'image.generator',description:'Generate an image'}]},
      {availableCapabilities:{'image.generator':true}});
    let calls=0;
    const panel=createUserAgentPlanPanel(plan,{currentUserId:'owner-a',documentOverride:doc,onRequestApproval:()=>{calls++}});
    const button=panel.querySelector(n=>n.className?.includes('deepsyq-btn-approve'));
    assert.equal(button.disabled,true);
    assert.equal(button.textContent,'Quote Required Before Approval');
    button.click();
    assert.equal(calls,0);
  });
});
