import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const saveKey = 'sci-fi-games:04-the-next-morning:v1';
const unrelatedKey = 'sci-fi-games:other-story:fixture';
type InputMode = 'mouse' | 'keyboard';
type Ending = 'withdrawn' | 'accepted';

/** All progression goes through public controls. DOM evaluation only observes
 * focus/layout or reads persistence; no game state is injected into journeys. */
class Controls {
  constructor(readonly page: Page, readonly mode: InputMode) {}

  async tabTo(id: string) {
    await expect(this.page.getByTestId(id)).toBeVisible();
    for (let i = 0; i < 120; i++) {
      const activeId = await this.page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid'));
      if (activeId === id) {
        const hasVisibleFocus = await this.page.evaluate(() => {
          if (!(document.activeElement instanceof HTMLElement)) return false;
          const style = getComputedStyle(document.activeElement);
          return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
            || style.boxShadow !== 'none';
        });
        expect(hasVisibleFocus, `${id} needs a visible keyboard focus indicator`).toBe(true);
        return;
      }
      await this.page.keyboard.press('Tab');
    }
    throw new Error(`Keyboard cannot reach ${id} after 120 Tab presses`);
  }

  async activate(id: string) {
    const control = this.page.getByTestId(id);
    await expect(control).toBeEnabled();
    if (this.mode === 'keyboard') {
      await this.tabTo(id);
      await this.page.keyboard.press('Enter');
    } else {
      await control.click();
    }
  }

  async check(id: string, checked: boolean) {
    const control = this.page.getByTestId(id);
    if (await control.isChecked() === checked) return;
    if (this.mode === 'keyboard') {
      await this.tabTo(id);
      await this.page.keyboard.press('Space');
    } else {
      await control.setChecked(checked);
    }
    await expect(control).toBeChecked({ checked });
  }

  async select(id: string, value: string) {
    const control = this.page.getByTestId(id);
    if (this.mode === 'keyboard') {
      const values = await control.locator('option').evaluateAll(options =>
        options.map(option => (option as HTMLOptionElement).value));
      const index = values.indexOf(value);
      expect(index, `select ${id} must offer ${value}`).toBeGreaterThanOrEqual(0);
      await this.tabTo(id);
      await this.page.keyboard.press('Home');
      for (let i = 0; i < index; i++) await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
      // Leaving a native select commits a change in every supported engine.
      await this.page.keyboard.press('Tab');
    } else {
      await control.selectOption(value);
    }
    await expect(control).toHaveValue(value);
  }

  async write(id: string, text: string) {
    if (this.mode === 'keyboard') {
      await this.tabTo(id);
      await this.page.keyboard.press('ControlOrMeta+A');
      await this.page.keyboard.type(text);
      await this.page.keyboard.press('Tab');
    } else {
      await this.page.getByTestId(id).fill(text);
    }
    await expect(this.page.getByTestId(id)).toHaveValue(text);
  }
}

async function expectScene(page: Page, id: string) {
  await expect(page.locator(`[data-scene="${id}"]`).first()).toBeVisible();
}

async function resume(page: Page, controls: Controls, scene: string) {
  await page.reload();
  await expect(page.getByTestId('continue')).toBeVisible();
  await controls.activate('continue');
  await expectScene(page, scene);
}

async function expectNoPageOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(layout.document, 'Document must fit the viewport').toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.body, 'Body must fit the viewport').toBeLessThanOrEqual(layout.viewport + 1);
}

async function capture(page: Page, filename: string) {
  await mkdir(resolve('screenshots'), { recursive: true });
  // Start at the top so Chromium's full-page capture does not paint an
  // off-screen fixed skip link at the previous scroll offset.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.screenshot({ path: resolve('screenshots', filename), fullPage: true, animations: 'disabled' });
}

function watchBrowser(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') problems.push(`console: ${message.text()} (${message.location().url})`);
  });
  page.on('requestfailed', request => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) {
      problems.push(`request: ${request.url()} ${request.failure()?.errorText}`);
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) problems.push(`resource: ${response.status()} ${response.url()}`);
  });
  return problems;
}

async function start(page: Page, controls: Controls) {
  await page.goto('/');
  await controls.activate('settings-open');
  // Exercise each switch, rather than accepting its initial default as proof.
  await controls.check('option-muted', false);
  await controls.check('option-muted', true);
  await controls.check('option-typewriter', true);
  await controls.check('option-typewriter', false);
  await controls.check('option-motion', false);
  await controls.check('option-motion', true);
  await controls.check('option-static', false);
  await controls.check('option-static', true);
  await controls.activate('settings-close');
  await controls.activate('start-new');
  await expectScene(page, 'D01');
  await controls.activate('focus-structure');
  await controls.check('conditions-read', true);
  await controls.activate('connect-box');
  await controls.activate('next-scene');
  await expectScene(page, 'D02');
}

async function trial(controls: Controls, first: string, second: string, interval: number) {
  const reset = controls.page.getByTestId('trial-reset');
  if (await reset.isEnabled()) await controls.activate('trial-reset');
  await controls.select('first-port', first);
  await controls.select('second-port', second);
  const intervalControl = controls.page.getByTestId('interval');
  if (await intervalControl.isEnabled()) await controls.select('interval', String(interval));
  else await expect(intervalControl).toHaveValue(String(interval));
  await controls.activate('pulse-first');
  await expect(controls.page.getByTestId('pulse-output')).toContainText(/亮度\s*1/);
  await expect(controls.page.getByTestId('pulse-output')).toHaveClass(/\bstatic\b/);
  expect(await controls.page.getByTestId('pulse-output').locator('.output-light').evaluate(light =>
    getComputedStyle(light).animationName)).toBe('none');
  await controls.activate('pulse-second');
  await expect(controls.page.getByTestId('pulse-output'))
    .toContainText(new RegExp(`亮度\\s*${interval < 3 ? 2 : 1}`));
  await expect(controls.page.getByTestId('trial-history')).toBeVisible();
}

async function throughExperiments(page: Page, controls: Controls, takeScreenshots: boolean) {
  // A plausible, wrong port explanation is generated from the first observation.
  await trial(controls, 'left', 'right', 1);
  await controls.activate('propose-port');
  // Swapping both inputs is a real counterexample, not a dialogue answer key.
  await trial(controls, 'right', 'left', 1);
  await controls.activate('revise-second');
  await expect(page.getByTestId('trial-history')).toContainText(/左|L/);
  await expect(page.getByTestId('trial-history')).toContainText(/右|R/);
  await expectNoPageOverflow(page);
  if (takeScreenshots) await capture(page, 'experiment.png');
  await controls.activate('next-scene');
  await expectScene(page, 'D03');
  await trial(controls, 'left', 'left', 2);
  await trial(controls, 'left', 'left', 3);
  await trial(controls, 'right', 'right', 4);
  await controls.activate('revise-timing');
  await controls.activate('next-scene');
  await expectScene(page, 'D04');
  await controls.activate('retain-method');
  await controls.activate('reject-explanation');
  await controls.write('question-revision', '局部时间边界已核验；不同结构为何相似，仍需新的可检验解释。');
  await controls.activate('save-question');
  await controls.activate('next-scene');
  await expectScene(page, 'D05');
  await controls.activate('open-archive');
  await expect(page.getByText(/主动撤回/).first()).toBeVisible();
  if (takeScreenshots) await capture(page, 'receipt.png');
  await controls.activate(takeScreenshots ? 'ask-clarity' : 'ask-assumption');
  await controls.activate('next-scene');
  await expectScene(page, 'D06');
  await controls.activate('ask-regret');
  await expect(page.getByText(/有。|有过|后悔/).first()).toBeVisible();
  await controls.activate('hear-wish');
  await expect(page.getByText(/替我证明/).first()).toBeVisible();
  await controls.select('handoff-records', 'fact');
  await controls.select('handoff-conjecture', 'fact');
  await controls.select('handoff-unfinished', 'fact');
  await expect(page.getByTestId('next-scene')).toBeDisabled();
  await controls.select('handoff-conjecture', 'conjecture');
  await controls.select('handoff-unfinished', 'unfinished');
  await resume(page, controls, 'D06');
  await expect(page.getByTestId('handoff-records')).toHaveValue('fact');
  await expect(page.getByTestId('handoff-conjecture')).toHaveValue('conjecture');
  await expect(page.getByTestId('handoff-unfinished')).toHaveValue('unfinished');
  await controls.activate('settings-open');
  await expect(page.getByTestId('option-muted')).toBeChecked();
  await expect(page.getByTestId('option-typewriter')).not.toBeChecked();
  await expect(page.getByTestId('option-motion')).toBeChecked();
  await expect(page.getByTestId('option-static')).toBeChecked();
  await controls.activate('settings-close');
  await controls.activate('next-scene');
  await expectScene(page, 'D07');
}

async function decide(page: Page, controls: Controls, ending: Ending) {
  await controls.activate(`choose-${ending}`);
  await resume(page, controls, 'D07');
  await expect(page.getByTestId('confirm-final')).toBeVisible();
  // Cancellation returns to a reviewable choice; no outcome is inferred from a score.
  await controls.activate('cancel-final');
  await controls.activate(`choose-${ending}`);
  if (controls.mode === 'keyboard') {
    await controls.tabTo('confirm-final');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  } else {
    await page.getByTestId('confirm-final').click({ clickCount: 2 });
  }
  await expect(page.getByTestId('next-morning')).toBeVisible();
  expect(await page.evaluate(namespace => {
    const saved = JSON.parse(localStorage.getItem(namespace) || '{}');
    return saved.state?.finalChoice;
  }, saveKey)).toBe(ending);
  const opposite = page.getByTestId(`choose-${ending === 'withdrawn' ? 'accepted' : 'withdrawn'}`);
  if (await opposite.count()) await expect(opposite).toBeDisabled();
  const duplicate = page.getByTestId('confirm-final');
  if (await duplicate.count()) await expect(duplicate).toBeDisabled();
  await resume(page, controls, 'D07');
  await expect(page.getByTestId('next-morning')).toBeVisible();
  expect(await page.evaluate(namespace => {
    const saved = JSON.parse(localStorage.getItem(namespace) || '{}');
    return saved.state?.finalChoice;
  }, saveKey)).toBe(ending);
  if (await opposite.count()) await expect(opposite).toBeDisabled();
  await controls.activate('next-morning');
  await expectScene(page, ending === 'withdrawn' ? 'D08A' : 'D08B');
}

test('production desktop: a wrong hypothesis, counterexamples, handoff and complete withdrawal epilogue', async ({ page }) => {
  const problems = watchBrowser(page);
  const controls = new Controls(page, 'mouse');
  await start(page, controls);
  await throughExperiments(page, controls, true);
  await decide(page, controls, 'withdrawn');
  await expect(page.getByTestId('player-role')).toContainText('林予');
  await controls.activate('wire-measurement');
  await trial(controls, 'left', 'right', 3);
  const question = '三单位后的亮度没有增强；下轮改变装置结构，继续检验时间边界。';
  await controls.write('board-question', question);
  await controls.activate('revise-board');
  await resume(page, controls, 'D08A');
  await expect(page.getByTestId('board-question')).toHaveValue(question);
  await expect(page.getByTestId('trial-history')).toContainText('3');
  await controls.activate('trial-reset');
  await controls.activate('pulse-first');
  await expect(page.getByTestId('pulse-output')).toContainText(/亮度\s*1/);
  await expectNoPageOverflow(page);
  await capture(page, 'epilogue-withdrawn.png');
  await controls.activate('finish-epilogue');
  await expect(page.getByTestId('epilogue-complete')).toBeVisible();
  await resume(page, controls, 'D08A');
  await expect(page.getByTestId('epilogue-complete')).toBeVisible();
  expect(problems).toEqual([]);
});

test('production narrow screen: keyboard-only new game to Cheng Yan measurement epilogue', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const problems = watchBrowser(page);
  const controls = new Controls(page, 'keyboard');
  await start(page, controls);
  await throughExperiments(page, controls, false);
  await decide(page, controls, 'accepted');
  await expect(page.getByTestId('player-role')).toContainText('程砚');
  await expect(page.getByText(/未传回|没有传回|没有收到/).first()).toBeVisible();
  await expect(page.getByTestId('board-question')).toHaveCount(0);
  const answer = page.getByTestId('answer-blank');
  await expect(answer).toContainText(/林予没有传回答案/);
  await expect(answer.locator('span')).toHaveText(/^_+$/);
  await expect(answer.locator('input, textarea, [contenteditable="true"]')).toHaveCount(0);
  await controls.activate('verify-records');
  await controls.activate('verify-conjecture');
  await controls.activate('verify-unfinished');
  await controls.activate('wire-self');
  await controls.activate('today-measure');
  await trial(controls, 'right', 'left', 2);
  await resume(page, controls, 'D08B');
  await expect(page.getByTestId('player-role')).toContainText('程砚');
  await expect(answer.locator('span')).toHaveText(/^_+$/);
  await expect(page.getByTestId('trial-history')).toContainText('2');
  await expectNoPageOverflow(page);
  await capture(page, 'epilogue-accepted.png');
  await controls.activate('finish-epilogue');
  await expect(page.getByTestId('epilogue-complete')).toBeVisible();
  await expect(page.getByTestId('today-archive')).toBeDisabled();
  await expect(page.getByTestId('today-measure')).toBeDisabled();
  await resume(page, controls, 'D08B');
  await expect(page.getByTestId('epilogue-complete')).toBeVisible();
  await expect(page.getByTestId('today-archive')).toBeDisabled();
  await expect(answer.locator('span')).toHaveText(/^_+$/);
  await expect(page.getByText(/待实现|好结局|坏结局|完美结局/)).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('corrupt save recovery and restart confirmation preserve other stories', async ({ page }) => {
  const problems = watchBrowser(page);
  await page.goto('/');
  // This is exclusively a corruption fixture, never a progression shortcut.
  await page.evaluate(({ namespace, other }) => {
    localStorage.setItem(other, 'must remain');
    localStorage.setItem(namespace, '{ broken save');
  }, { namespace: saveKey, other: unrelatedKey });
  await page.reload();
  await expect(page.getByText(/损坏|无法读取/).first()).toBeVisible();
  await page.getByTestId('recover-save').click();
  expect(await page.evaluate(key => localStorage.getItem(key), unrelatedKey)).toBe('must remain');
  await page.getByTestId('start-new').click();
  await expectScene(page, 'D01');
  await page.getByTestId('focus-local').click();
  await page.getByTestId('restart').click();
  await expect(page.getByTestId('restart-confirm')).toBeVisible();
  await page.getByTestId('restart-cancel').click();
  await expectScene(page, 'D01');
  expect(await page.evaluate(namespace => JSON.parse(localStorage.getItem(namespace) || '{}').state?.questionFocus, saveKey)).toBe('local');
  await page.getByTestId('restart').click();
  await page.getByTestId('restart-confirm').click();
  if (await page.getByTestId('start-new').isVisible()) await page.getByTestId('start-new').click();
  await expectScene(page, 'D01');
  expect(await page.evaluate(namespace => JSON.parse(localStorage.getItem(namespace) || '{}').state?.questionFocus, saveKey)).toBe('');
  expect(await page.evaluate(key => localStorage.getItem(key), unrelatedKey)).toBe('must remain');
  expect(problems).toEqual([]);
});

test.describe('basic touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('touch taps connect the apparatus and execute the two planned pulses', async ({ page }) => {
    const problems = watchBrowser(page);
    await page.goto('/');
    await page.getByTestId('start-new').tap();
    await page.getByTestId('focus-local').tap();
    await page.getByTestId('conditions-read').tap();
    await page.getByTestId('connect-box').tap();
    await page.getByTestId('next-scene').tap();
    await expectScene(page, 'D02');
    await page.getByTestId('pulse-first').tap();
    await expect(page.getByTestId('pulse-output')).toContainText(/亮度\s*1/);
    await page.getByTestId('pulse-second').tap();
    await expect(page.getByTestId('pulse-output')).toContainText(/亮度\s*2/);
    await page.getByTestId('propose-port').tap();
    await expect(page.getByTestId('trial-history')).toBeVisible();
    await expectNoPageOverflow(page);
    expect(problems).toEqual([]);
  });
});
