import { expect, test, type Locator, type Page } from '@playwright/test';

const SAVE_KEY = 'sci-fi-games:05-saturday-departure:v1';
const OTHER_SAVE_KEY = 'sci-fi-games:01-tomorrow-again:v1';
type InputMode = 'mouse' | 'keyboard' | 'touch';
type Plan = 'long_voyage' | 'short_trial' | 'not_now';

/** Every route starts through the public title screen. Storage is only read during
 * routes: no test helper injects a scene, plan, evidence, or ending. */
class Player {
  readonly lines: string[] = [];
  constructor(readonly page: Page, readonly mode: InputMode) {}

  control(id: string) { return this.page.getByTestId(id); }

  async focusByTab(target: Locator) {
    await expect(target).toBeVisible();
    for (let attempt = 0; attempt < 90; attempt += 1) {
      if (await target.evaluate(el => el === document.activeElement)) return;
      // A native radio group has one Tab stop. Move within it with arrow keys,
      // as a keyboard player does, rather than trying to Tab to every option.
      const sameRadioGroup = await target.evaluate(el => {
        const active = document.activeElement as HTMLInputElement | null;
        return el instanceof HTMLInputElement && el.type === 'radio'
          && active?.type === 'radio' && active.name === el.name;
      });
      if (sameRadioGroup) {
        for (let step = 0; step < 6; step += 1) {
          await this.page.keyboard.press('ArrowDown');
          if (await target.evaluate(el => el === document.activeElement)) return;
        }
      }
      await this.page.keyboard.press('Tab');
    }
    throw new Error(`Control is unreachable with Tab: ${await target.getAttribute('data-testid')}`);
  }

  async act(id: string) {
    const target = this.control(id);
    await expect(target).toBeEnabled();
    if (this.mode === 'keyboard') {
      await this.focusByTab(target);
      await this.page.keyboard.press('Space');
    } else if (this.mode === 'touch') {
      await target.tap();
    } else {
      await target.click();
    }
  }

  async text(id: string, value: string) {
    const target = this.control(id);
    if (this.mode === 'keyboard') {
      await this.focusByTab(target);
      await this.page.keyboard.press('ControlOrMeta+A');
      await this.page.keyboard.insertText(value);
      await this.page.keyboard.press('Tab');
    } else {
      await target.fill(value);
      await target.blur();
    }
  }

  async select(id: string, value: string) {
    const target = this.control(id);
    if (this.mode === 'keyboard') {
      await this.focusByTab(target);
      const index = await target.locator('option').evaluateAll((options, wanted) =>
        options.findIndex(option => (option as HTMLOptionElement).value === wanted), value);
      expect(index).toBeGreaterThanOrEqual(0);
      await this.page.keyboard.press('Home');
      for (let n = 0; n < index; n += 1) await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Tab');
    } else {
      await target.selectOption(value);
    }
    await expect(target).toHaveValue(value);
  }

  async checkbox(id: string, checked: boolean) {
    if (await this.control(id).isChecked() !== checked) await this.act(id);
    await expect(this.control(id)).toBeChecked({ checked });
  }

  async settings() {
    await this.act('settings-open');
    await this.checkbox('settings-mute', true);
    await this.checkbox('settings-reduced-motion', true);
    await this.checkbox('settings-typewriter', false);
    await this.act('close-dialog');
  }

  async dialogue() {
    const next = this.control('dialogue-next');
    for (let n = 0; n < 30; n += 1) {
      const line = this.control('dialogue-text');
      if (await line.count()) this.lines.push((await line.innerText()).trim());
      if (!await next.isVisible() || !await next.isEnabled()) return;
      await this.act('dialogue-next');
    }
    throw new Error('Dialogue failed to reach its final line after 30 public advances');
  }

  async scene(id: string) {
    await expect(this.page.locator('[data-scene]').first()).toHaveAttribute('data-scene', id);
  }

  async next(id: string) {
    await this.act('scene-next');
    await this.scene(id);
    await this.dialogue();
  }

  async artifact(id: string, pattern?: RegExp) {
    await this.act(id);
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    if (pattern) await expect(dialog).toContainText(pattern);
    await this.act('close-dialog');
  }

  async saved(): Promise<Record<string, any>> {
    const raw = await this.page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
    expect(raw).not.toBeNull();
    const value = JSON.parse(raw!);
    return value.state ?? value;
  }

  async resume(scene: string) {
    await this.page.reload();
    await this.act('continue-game');
    await this.scene(scene);
  }

  async screenshot(name: string) {
    if (process.env.E2E_DEV === '1') return;
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true, animations: 'disabled' });
  }
}

function errorsFor(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => errors.push(`resource: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  page.on('request', request => {
    if (!/^(http:\/\/(localhost|127\.0\.0\.1):5175\/|data:|blob:)/.test(request.url())) {
      errors.push(`External network resource: ${request.url()}`);
    }
  });
  return errors;
}

async function newGame(player: Player) {
  await player.page.goto('/');
  if (process.env.E2E_DEV !== '1') {
    // A running development server on the same port cannot count as a production replay.
    await expect(player.page.locator('script[type="module"][src]').first()).toHaveAttribute('src', /\/assets\/.*\.js$/);
  }
  await player.page.evaluate(({ key, otherKey }) => {
    localStorage.removeItem(key);
    localStorage.setItem(otherKey, 'other-story-preserved');
  }, { key: SAVE_KEY, otherKey: OTHER_SAVE_KEY });
  await player.page.reload();
  await player.settings();
  await player.act('new-game');
  await player.scene('S01');
  await player.dialogue();
}

async function throughInvitation(player: Player, childhood: 'rain' | 'threeMoons', screenshots: boolean) {
  await player.act('choose-arrival-bag');
  await player.act('open-toolbox');
  await player.artifact('artifact-ticket', /青川|地面|返程/);
  await player.artifact('artifact-application', /空白|未填写|没有姓名/);
  expect((await player.saved()).artifactsSeen).toEqual(expect.arrayContaining(['ticket', 'application']));
  await player.next('S02');
  await expect(player.control('connect-P2')).toBeDisabled();
  await expect(player.control('toggle-inspection-lamp')).toBeDisabled();
  await expect(player.control('scene-next')).toBeDisabled();
  await player.select('displacement-unit', 'mrad');
  await player.select('temperature-unit', 'C');
  await player.act('verify-report');
  await expect(player.control('displacement-unit')).toHaveValue('mrad');
  await expect(player.control('temperature-unit')).toHaveValue('C');
  await player.act('connect-P2');
  await player.act('toggle-inspection-lamp');
  await player.act('handoff-tool');
  expect((await player.saved()).automationReportVerified).toBe(true);
  if (screenshots) await player.screenshot('01-orbital-facility');
  await player.next('S03');
  await player.artifact('artifact-ticket', /青川|地面|返程/);
  await player.artifact('artifact-application', /空白|未填写|没有姓名/);
  await player.artifact('artifact-retirement', /退休|楼下|回家/);
  await expect(player.control('unfold-drawing')).toBeDisabled();
  await player.artifact('artifact-drawing', /会下雨|三个月亮/);
  await expect(player.control('infer-drawing')).toBeDisabled();
  await player.act('unfold-drawing');
  await player.act('infer-drawing');
  await player.next('S04');
  await player.artifact('artifact-conditions', /长程|近程|不加入/);
  await player.next('S05');
  await player.act('unfold-drawing');
  await player.act('unfold-drawing');
  if (screenshots) await player.screenshot('03-unfolded-drawing');
  await player.next('CHILDHOOD');
  await player.act('place-childhood-lamp');
  await player.act('toggle-childhood-lamp');
  await player.act(`destination-${childhood}`);
  if (screenshots) await player.screenshot('02-childhood-cardboard');
  await player.next('S05_TRUTH');
  expect(player.lines.join('\n')).toMatch(/猜到|认出来|已经看出来/);
  await player.next('S06');
  const state = await player.saved();
  expect(state.childhoodDestination).toBe(childhood);
  expect(state.planConfirmed).toBe(false);
  expect(state.adultPlan).toBeNull();
  expect(state.drawingUnfolded).toBe(true);
  await player.act('deliver-inspection');
}

const routes = [
  { plan: 'long_voyage' as const, childhood: 'rain' as const, mode: 'mouse' as const, destination: 'L2 外侧观测泊位', scene: 'S07A', screenshot: '04-ending-long' },
  { plan: 'short_trial' as const, childhood: 'threeMoons' as const, mode: 'keyboard' as const, destination: '近地晨线试航弧', scene: 'S07B', screenshot: '05-ending-short' },
  { plan: 'not_now' as const, childhood: 'rain' as const, mode: 'touch' as const, destination: '青川地面港', scene: 'S07C', screenshot: '06-ending-home' },
];

for (const route of routes) {
  test(`新游戏 UI 通关：${route.plan} / ${route.mode} / ${route.childhood}`, async ({ browser, page }) => {
    const touchContext = route.mode === 'touch'
      ? await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: 'http://127.0.0.1:5175' })
      : undefined;
    const routePage = touchContext ? await touchContext.newPage() : page;
    const errors = errorsFor(routePage);
    const player = new Player(routePage, route.mode);
    await newGame(player);
    await throughInvitation(player, route.childhood, route.plan === 'long_voyage');

    // A childhood destination never preselects or fills an adult application.
    for (const option of routes) await expect(player.control(`plan-${option.plan}`)).not.toBeChecked();
    await expect(player.control('applicant-name')).toHaveValue('');
    await expect(player.control('adult-destination')).toHaveValue('');
    await expect(player.control('confirm-plan')).toBeDisabled();
    if (route.plan === 'long_voyage') await player.resume('S06');
    await player.act(`plan-${route.plan}`);
    await expect(player.control('adult-destination')).toHaveValue('');
    await expect(player.control('confirm-plan')).toBeDisabled();
    await player.text('applicant-name', '陈遥');
    await player.text('adult-destination', route.destination);
    if (route.plan === 'long_voyage') {
      await player.resume('S06');
      await expect(player.control(`plan-${route.plan}`)).toBeChecked();
      await expect(player.control('adult-destination')).toHaveValue(route.destination);
      expect((await player.saved()).planConfirmed).toBe(false);
    }
    if (route.mode === 'touch') {
      expect(await routePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await player.screenshot('07-narrow-plan');
    }
    await player.act('confirm-plan');
    const confirmed = await player.saved();
    expect(confirmed.planConfirmed).toBe(true);
    expect(confirmed.adultPlan).toBe(route.plan);
    await expect(player.control('confirm-plan')).toBeDisabled();
    // A second physical click on the disabled confirmation cannot revise a plan.
    if (route.mode === 'mouse') await player.control('confirm-plan').click({ force: true });
    expect((await player.saved()).adultPlan).toBe(route.plan);
    await player.resume('S06');
    expect((await player.saved()).planConfirmed).toBe(true);
    await expect(player.control(`plan-${route.plan}`)).toBeChecked();
    await expect(player.control(`plan-${route.plan}`)).toBeDisabled();
    await player.next(route.scene);

    await expect(player.control('activate-route')).toBeDisabled();
    if (route.plan === 'long_voyage') {
      await player.act('observe-window');
      await expect(routePage.locator('.notice')).toContainText('出发清单还在准备');
      expect((await player.saved()).routeActivated).toBe(false);
    }

    await player.act('store-drawing');
    if (route.plan === 'not_now') {
      await player.act('contact-skip');
      await player.act('secure-bag');
    } else {
      await player.act('prepare-schedule');
      await player.act('prepare-kit');
      await player.act('response-own');
    }
    await player.act('toggle-ending-lamp');
    await player.act('activate-route');
    await player.next('S08');
    await player.artifact('review-plan', new RegExp(route.destination));
    await player.artifact('review-inspection', /已完成|交接|自动维护/);
    await player.artifact('artifact-drawing', /我当船长|爸爸修船|星期六出发/);
    await player.act('observe-window');
    await player.act('toggle-ending-lamp');
    await player.act('toggle-ending-lamp');
    await player.screenshot(route.screenshot);
    const ending = await player.saved();
    expect(ending.adultPlan).toBe(route.plan);
    expect(ending.childhoodDestination).toBe(route.childhood);
    expect(ending.drawingStored).toBe(true);
    expect(ending.inspectionDelivered).toBe(true);
    expect(Object.keys(ending).filter(key => /future|promise|deadline|returnDate/i.test(key))).toEqual([]);
    if (route.plan === 'not_now') {
      expect(ending.projectContactSaved).toBe(false);
      expect(player.lines.join('\n')).toMatch(/项目.*(?:原定团队|其他成员).*继续/);
    }
    await player.resume('S08');
    expect((await player.saved()).drawingStored).toBe(true);
    expect((await player.saved()).adultPlan).toBe(route.plan);
    await player.artifact('review-plan', new RegExp(route.destination));
    await expect(routePage.locator('body')).toContainText('星期六出发');
    expect(await routePage.evaluate(key => localStorage.getItem(key), OTHER_SAVE_KEY)).toBe('other-story-preserved');
    await player.act('settings-open');
    await expect(player.control('settings-mute')).toBeChecked();
    await expect(player.control('settings-reduced-motion')).toBeChecked();
    await expect(player.control('settings-typewriter')).not.toBeChecked();
    if (route.mode === 'keyboard') {
      await player.focusByTab(player.control('close-dialog'));
      const focus = await player.control('close-dialog').evaluate(element => {
        const style = getComputedStyle(element);
        return { outline: style.outlineStyle, shadow: style.boxShadow };
      });
      expect(focus.outline !== 'none' || focus.shadow !== 'none').toBe(true);
    }
    await player.act('close-dialog');
    expect(errors).toEqual([]);
    await touchContext?.close();
  });
}

test('损坏存档提示恢复，重开要确认，其他故事存档保留', async ({ page }) => {
  const errors = errorsFor(page);
  const player = new Player(page, 'mouse');
  await page.goto('/');
  // Deliberate malformed data exercises recovery, never route completion.
  await page.evaluate(({ key, otherKey }) => {
    localStorage.setItem(key, '{broken-json');
    localStorage.setItem(otherKey, 'other-story-preserved');
  }, { key: SAVE_KEY, otherKey: OTHER_SAVE_KEY });
  await page.reload();
  await expect(player.control('save-recovery')).toBeVisible();
  await player.settings();
  await player.act('new-game');
  await expect(player.control('restart-confirm')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe('{broken-json');
  await player.act('restart-confirm');
  await player.scene('S01');
  await player.dialogue();
  await player.act('choose-arrival-bag');
  const before = await player.saved();
  await page.reload();
  await player.act('new-game');
  await expect(player.control('restart-cancel')).toBeVisible();
  await player.act('restart-cancel');
  expect(await player.saved()).toEqual(before);
  await player.act('new-game');
  await player.act('restart-confirm');
  await player.scene('S01');
  const restarted = await player.saved();
  expect(restarted.planConfirmed).toBe(false);
  expect(restarted.adultPlan).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), OTHER_SAVE_KEY)).toBe('other-story-preserved');
  expect(errors).toEqual([]);
});

test('默认静音、真实音频开关、逐字跳过与减弱动态', async ({ page }) => {
  const errors = errorsFor(page);
  // Observe real browser audio contexts without adding a game API or changing any state.
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    Object.defineProperty(window, '__testAudioContexts', { value: contexts });
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
    };
  });
  const audioStates = () => page.evaluate(() => {
    const observed = window as typeof window & { __testAudioContexts: AudioContext[] };
    return observed.__testAudioContexts.map(context => context.state);
  });
  const player = new Player(page, 'mouse');
  await page.goto('/');
  await player.act('settings-open');
  await expect(player.control('settings-mute')).toBeChecked();
  await expect(player.control('settings-typewriter')).not.toBeChecked();
  expect(await audioStates()).toEqual([]);
  await player.checkbox('settings-mute', false);
  await expect.poll(audioStates).toEqual(['running']);
  await player.checkbox('settings-mute', true);
  await expect.poll(audioStates).toEqual(['suspended']);
  await player.checkbox('settings-reduced-motion', true);
  await player.checkbox('settings-typewriter', true);
  await player.act('close-dialog');
  await player.act('new-game');
  await player.scene('S01');
  // Reach a long line by using the normal continue/skip button. Each click either
  // reveals the current line or advances it; no index is set by the test.
  for (let click = 0; click < 15 && (await player.saved()).dialogueIndex < 4; click += 1) {
    await player.act('dialogue-next');
  }
  expect((await player.saved()).dialogueIndex).toBe(4);
  const line = player.control('dialogue-text');
  const fullLine = await line.getAttribute('aria-label');
  expect(fullLine).not.toBeNull();
  await expect(line).not.toHaveText(fullLine!);
  await player.act('dialogue-next');
  expect((await player.saved()).dialogueIndex).toBe(4);
  await expect(line).toHaveText(fullLine!);
  await player.act('dialogue-next');
  expect((await player.saved()).dialogueIndex).toBe(5);
  const finalLine = await line.getAttribute('aria-label');
  expect(finalLine).not.toBeNull();
  await player.act('settings-open');
  await player.checkbox('settings-typewriter', false);
  await player.act('close-dialog');
  await expect(line).toHaveText(finalLine!);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  const animatedShapes = page.locator('svg .art-drift, svg .art-pulse, svg .art-shimmer');
  expect(await animatedShapes.count()).toBeGreaterThan(0);
  expect(await animatedShapes.evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName)))
    .toEqual(Array.from({ length: await animatedShapes.count() }, () => 'none'));
  expect(await audioStates()).toEqual(['suspended']);
  expect(errors).toEqual([]);
});
