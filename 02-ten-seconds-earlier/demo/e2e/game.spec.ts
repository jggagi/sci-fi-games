import { test, expect, type Page, type Locator } from '@playwright/test';

const SAVE_KEY = 'sci-fi-games:02-ten-seconds-earlier:v1';
const EVIDENCE = [
  { id: 'gate_action', category: '行为事实' },
  { id: 'original_warning', category: '当时掌握的信息' },
  { id: 'amended_report', category: '行为事实' },
  { id: 'signature_scene', category: '当时掌握的信息' },
  { id: 'mitigation_timeline', category: '后果与核对资料' },
  { id: 'witness_statement', category: '后果与核对资料' },
];

type Saved = {
  sceneId: string;
  activeTimeAnchor: string;
  playheadOffsetSeconds: number;
  evidenceSeen: string[];
  evidenceVerified: string[];
  sourceReceiptDisclosed: boolean;
  witnessConsent: boolean;
  birthdayRangeAuthorized: boolean;
  familyActionsSeen: string[];
  caseSubmitted: boolean;
  privateClipSaved: boolean;
  privateExportConsent: boolean;
  [key: string]: unknown;
};

async function saved(page: Page): Promise<Saved> {
  // Inspection only: successful routes never seed or mutate game progress.
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}

class Journey {
  constructor(readonly page: Page, readonly keyboardOnly = false) {}

  button(name: string) { return this.page.getByRole('button', { name, exact: true }); }

  async tabTo(locator: Locator) {
    await expect(locator).toBeVisible();
    await expect(locator).toBeEnabled();
    for (let index = 0; index < 150; index++) {
      if (await locator.evaluate(element => element === document.activeElement)) return;
      await this.page.keyboard.press('Tab');
    }
    throw new Error(`Keyboard cannot reach ${await locator.getAttribute('aria-label') || await locator.textContent()}`);
  }

  async activate(locator: Locator) {
    if (this.keyboardOnly) {
      await this.tabTo(locator);
      await this.page.keyboard.press(await locator.getAttribute('type') === 'checkbox' ? 'Space' : 'Enter');
    } else {
      await locator.click();
    }
  }

  async press(name: string) { await this.activate(this.button(name)); }
  async scene(id: string) { await expect(this.page.getByTestId('scene-id')).toContainText(id); }

  async classify(id: string) {
    const record = EVIDENCE.find(item => item.id === id)!;
    const card = this.page.getByTestId(`evidence-${id}`);
    const select = card.getByRole('combobox');
    if (this.keyboardOnly) {
      const labels = await select.locator('option').allTextContents();
      const optionIndex = labels.indexOf(record.category);
      expect(optionIndex).toBeGreaterThanOrEqual(0);
      await this.tabTo(select);
      await this.page.keyboard.press('Home');
      for (let index = 0; index < optionIndex; index++) await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
    } else {
      await select.selectOption({ label: record.category });
    }
    await this.activate(card.getByRole('button', { name: /^核验：/ }));
    await expect.poll(async () => (await saved(this.page)).evidenceVerified.includes(id)).toBe(true);
    await expect(card.locator('summary')).toBeFocused();
  }

  async stepForward(count: number) {
    for (let index = 0; index < count; index++) {
      if (this.keyboardOnly) {
        // The real global time shortcuts are used after a focusable button.
        await this.tabTo(this.button('后一秒'));
        await this.page.keyboard.press('ArrowRight');
      } else {
        await this.press('后一秒');
      }
    }
  }

  async query(name: string, evidenceIds: string[], maxOffset: number) {
    await this.press(name);
    // Inspect the current playhead, then traverse the finite node with UI controls.
    const current = (await saved(this.page)).playheadOffsetSeconds;
    await this.stepForward(Math.max(0, maxOffset - current));
    for (const id of evidenceIds) {
      await this.activate(this.page.getByTestId(`collect-${id}`));
      await this.classify(id);
    }
  }

  async restore(expectedScene: string) {
    const before = await saved(this.page);
    await this.page.reload();
    await this.press('继续调查');
    await this.scene(expectedScene);
    const { notice: _notice, playing: _playing, ...persistent } = before;
    expect(await saved(this.page)).toMatchObject(persistent);
  }
}

function watchBrowser(page: Page) {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => {
    const url = request.url();
    if (!url.startsWith('http://127.0.0.1:5172') && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url);
  });
  return { errors, external };
}

async function start(journey: Journey) {
  await journey.page.goto('/');
  await journey.press('新建调查');
  await journey.scene('M01');
  const state = await saved(journey.page);
  expect(state.caseSubmitted).toBe(false);
  expect(state.privateClipSaved).toBe(false);
  expect(state.sourceReceiptDisclosed).toBe(false);
  await expect(journey.page.getByRole('button', { name: /有罪|无罪|道德评分|必须原谅/ })).toHaveCount(0);
  await expect(journey.page.getByText(/最开始那份报告，是我交出去的/)).toHaveCount(0);
  await journey.activate(journey.page.locator('summary').filter({ hasText: '体验设置' }));
  for (const [label, checked] of [['静音', true], ['打字效果', false], ['减弱动态', true]] as const) {
    const setting = journey.page.getByRole('checkbox', { name: label, exact: true });
    if (await setting.isChecked() !== checked) await journey.activate(setting);
    await expect(setting).toBeChecked({ checked });
  }
  await journey.activate(journey.page.locator('summary').filter({ hasText: '体验设置' }));
  if (!journey.keyboardOnly) await journey.page.screenshot({ path: 'artifacts/screenshots/desk.png', fullPage: true });
  await journey.press('接受双范围委托');
  await journey.scene('M02');
}

async function investigate(journey: Journey, differentOrder = false) {
  const page = journey.page;
  await journey.press('完成现场调查');
  await expect(page.getByRole('status')).toContainText(/缺|还需|不足/);
  await expect(page.getByRole('status')).toContainText('隔离闸');
  await journey.press('查询：事故当晚');
  await journey.activate(page.getByTestId('collect-gate_action'));
  expect((await saved(page)).evidenceSeen).not.toContain('gate_action');
  await expect(page.getByRole('status')).toContainText('还缺少');
  if (!differentOrder) {
    await journey.query('查询：事故当晚', ['gate_action'], 0);
    await journey.press('完成现场调查');
    await journey.scene('M03');
    await journey.press('完成现场调查');
    await expect(page.getByRole('status')).toContainText('原始风险报告');
  }
  const queries = differentOrder
    ? [
      ['查询：应急效果', ['mitigation_timeline'], 8],
      ['查询：四十天前', ['original_warning', 'amended_report', 'signature_scene'], 0],
      ['查询：事故当晚', ['gate_action'], 0],
    ] as const
    : [
      ['查询：四十天前', ['original_warning', 'amended_report', 'signature_scene'], 0],
      ['查询：应急效果', ['mitigation_timeline'], 8],
    ] as const;
  for (const [name, ids, offset] of queries) await journey.query(name, [...ids], offset);
  // Re-query and recollect a fixed source: no duplicate evidence is created.
  await journey.press('查询：事故当晚');
  await journey.stepForward(Math.max(0, -(await saved(page)).playheadOffsetSeconds));
  const beforeRepeat = await saved(page);
  const collect = page.getByTestId('collect-gate_action');
  if (await collect.isEnabled()) await journey.activate(collect);
  expect((await saved(page)).evidenceSeen).toEqual(beforeRepeat.evidenceSeen);
  expect(new Set((await saved(page)).evidenceVerified).size).toBe(5);
  if (differentOrder) {
    await journey.press('完成现场调查');
    await journey.scene('M03');
  }
  await journey.press('完成现场调查');
  await journey.scene('M04');
  expect((await saved(page)).witnessConsent).toBe(false);
  const testimony = page.getByTestId('collect-witness_statement');
  if (await testimony.isEnabled()) {
    await journey.activate(testimony);
    expect((await saved(page)).evidenceSeen).not.toContain('witness_statement');
  }
  await expect(page.getByText(/私人语音全文|不要整段放进报告/).first()).toBeVisible();
  await journey.activate(page.getByRole('checkbox', { name: /仅记录案件相关时间点/ }));
  await journey.press('接受证言许可');
  await journey.activate(page.getByTestId('collect-witness_statement'));
  await journey.classify('witness_statement');
  await journey.press('证言核对完成');
  await journey.scene('M05');
  expect((await saved(page)).sourceReceiptDisclosed).toBe(false);
}

async function discloseAndFind(journey: Journey, alternative = false) {
  await journey.press(alternative ? '先列当晚处置，再整理前期失责' : '当晚处置及前期责任分别列明');
  await journey.press('唐雯出示回执');
  expect((await saved(journey.page)).sourceReceiptDisclosed).toBe(true);
  await expect(journey.page.getByText(/最开始那份报告，是我交出去的/).first()).toBeVisible();
  await journey.press(alternative ? '安静地把私人检索单放到她面前。' : '你不用现在决定以后怎么见他。');
  await journey.press('授权家庭查询');
  await journey.scene('M06');
  await expect(journey.page.getByTestId('time-display')).toHaveText('18:30:00');
  await journey.press('精确回退十秒');
  await expect(journey.page.getByTestId('time-display')).toHaveText('18:29:50');
  expect((await saved(journey.page)).birthdayRangeAuthorized).toBe(true);
  await journey.press('定下这十秒');
  await journey.scene('M06');
  await expect(journey.page.getByRole('status')).toContainText('拦住');
}

async function finishTenSeconds(journey: Journey) {
  const actions: string[] = [];
  const bowls: string[] = [];
  const spoons: string[] = [];
  const childHands: string[] = [];
  const fatherHands: string[] = [];
  for (let index = 0; index < 10; index++) {
    const scene = journey.page.getByTestId('history-scene');
    actions.push(await scene.locator('svg').getAttribute('data-action') || '');
    bowls.push(await scene.locator('[data-object="bowl"]').getAttribute('transform') || '');
    spoons.push(await scene.locator('[data-object="spoon"]').getAttribute('transform') || '');
    childHands.push(await scene.locator('[data-object="child-hand"] path').last().getAttribute('d') || '');
    fatherHands.push(await scene.locator('[data-object="father-hand"] path').last().getAttribute('d') || '');
    await expect(scene.locator('[data-object="breath"]')).toHaveCount(index === 6 || index === 7 ? 1 : 0);
    if (index === 6 && !journey.keyboardOnly) {
      await journey.page.screenshot({ path: 'artifacts/screenshots/ten-seconds-blow.png', fullPage: true });
    }
    await journey.stepForward(1);
  }
  await expect(journey.page.getByTestId('time-display')).toHaveText('18:30:00');
  expect((await saved(journey.page)).familyActionsSeen.sort()).toEqual(['block', 'blow', 'bowl', 'reach', 'spoon']);
  for (const action of ['reach', 'block', 'move-bowl', 'blow', 'return-spoon']) expect(actions).toContain(action);
  expect(new Set(bowls).size).toBeGreaterThan(1);
  expect(new Set(spoons).size).toBeGreaterThan(1);
  expect(new Set(childHands).size).toBeGreaterThan(1);
  expect(new Set(fatherHands).size).toBeGreaterThan(1);
  await journey.press('定下这十秒');
  await journey.scene('M07');
}

async function savePrivate(journey: Journey) {
  await journey.press('保存私人片段');
  expect((await saved(journey.page)).privateClipSaved).toBe(false);
  await expect(journey.page.getByRole('status')).toContainText('许可');
  await journey.activate(journey.page.getByRole('checkbox', { name: /同意私人保存/ }));
  await journey.press('保存私人片段');
  expect((await saved(journey.page)).privateClipSaved).toBe(true);
  await journey.press('保存私人片段');
  expect((await saved(journey.page)).privateSaveCount).toBe(1);
}

async function checkFiles(journey: Journey) {
  const page = journey.page;
  await journey.press('查看案件文件');
  const caseFile = page.getByTestId('case-file');
  await expect(caseFile).toBeVisible();
  await expect(caseFile).toContainText('R-17');
  await expect(caseFile).toContainText('W-XN01');
  await expect(caseFile).not.toContainText('18:29:50');
  await expect(caseFile).not.toContainText('F-1830');
  await expect(caseFile).not.toContainText('爸爸');
  const caseData = JSON.parse(await caseFile.getAttribute('data-file-content') || '{}');
  expect(caseData.kind).toBe('case');
  expect(caseData.evidence.map((item: { id: string }) => item.id).sort()).toEqual(EVIDENCE.map(item => item.id).sort());
  expect(caseData.witnessPermission).toContain('仅事故时间点与应急效果');
  expect(caseData).not.toHaveProperty('segment');
  expect(caseData.evidence.find((item: { id: string }) => item.id === 'witness_statement')).not.toHaveProperty('fullTranscript');
  await journey.press('查看私人文件');
  const privateFile = page.getByTestId('private-file');
  await expect(privateFile).toBeVisible();
  await expect(privateFile).toContainText('爸爸');
  await expect(privateFile).toContainText('18:29:50');
  const privateData = JSON.parse(await privateFile.getAttribute('data-file-content') || '{}');
  expect(privateData.kind).toBe('private');
  expect(privateData.segment.durationSeconds).toBe(10);
  expect(privateData).not.toHaveProperty('evidence');
  for (const evidence of ['R-17', 'W-XN01', 'G-2216', 'gate_action', 'witness_statement']) {
    await expect(privateFile).not.toContainText(evidence);
  }
}

test('production UI journey M01–M08: three restores, exact ten seconds and isolated saves', async ({ page }) => {
  const monitor = watchBrowser(page);
  const journey = new Journey(page);
  await start(journey);
  await journey.press('查询：事故当晚');
  await journey.stepForward(10);
  await page.screenshot({ path: 'artifacts/screenshots/history.png', fullPage: true });
  await investigate(journey);
  await journey.restore('M05');
  await discloseAndFind(journey);
  await page.screenshot({ path: 'artifacts/screenshots/ten-seconds.png', fullPage: true });
  await journey.restore('M06');
  await finishTenSeconds(journey);
  await journey.press('核对并提交案件');
  let state = await saved(page);
  expect(state.caseSubmitted).toBe(true);
  expect(state.privateClipSaved).toBe(false);
  await journey.restore('M07');
  const caseCountBefore = (await saved(page)).caseSubmissionCount;
  const repeat = journey.button('核对并提交案件');
  if (await repeat.isEnabled()) await journey.activate(repeat);
  expect((await saved(page)).caseSubmissionCount).toBe(caseCountBefore);
  await savePrivate(journey);
  await checkFiles(journey);
  await page.screenshot({ path: 'artifacts/screenshots/exports.png', fullPage: true });
  await journey.press('走到门口');
  await journey.scene('M08');
  await journey.press('再听一次');
  await expect(page.getByTestId('time-display')).toHaveText('18:29:50');
  // A replay starts its own second; the global timer phase must not skip its opening frame.
  await page.waitForTimeout(150);
  await expect(page.getByTestId('time-display')).toHaveText('18:29:50');
  await journey.press('暂停');
  await journey.press('后一秒');
  await expect(page.getByTestId('time-display')).toHaveText('18:29:51');
  await journey.press('返回工作台');
  state = await saved(page);
  expect(state.caseSubmitted && state.privateClipSaved).toBe(true);
  expect(state.evidenceVerified).toHaveLength(6);
  expect(monitor.errors).toEqual([]);
  expect(monitor.external).toEqual([]);
});

test('complete keyboard journey: another query order, private saved first, muted replay', async ({ page }) => {
  test.setTimeout(180_000);
  const monitor = watchBrowser(page);
  const journey = new Journey(page, true);
  await start(journey);
  await investigate(journey, true);
  await discloseAndFind(journey, true);
  // Native keyboard stepping reverses and advances exactly one second.
  await journey.tabTo(journey.button('后一秒'));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('time-display')).toHaveText('18:29:51');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('time-display')).toHaveText('18:29:50');
  await finishTenSeconds(journey);
  await savePrivate(journey);
  expect((await saved(page)).caseSubmitted).toBe(false);
  expect((await saved(page)).privateClipSaved).toBe(true);
  await journey.press('核对并提交案件');
  await checkFiles(journey);
  await journey.press('走到门口');
  await journey.scene('M08');
  await journey.press('再听一次');
  await journey.press('暂停');
  await expect(page.getByText('烫，等一下。').first()).toBeVisible();
  expect(monitor.errors).toEqual([]);
  expect(monitor.external).toEqual([]);
});

test('corrupt save recovery and restart confirmation preserve other stories', async ({ page }) => {
  await page.goto('/');
  // This intentionally malformed storage is only for the explicit recovery test.
  await page.evaluate(key => {
    localStorage.setItem(key, '{ damaged');
    localStorage.setItem('sci-fi-games:01-tomorrow-again:v1', 'other-story-sentinel');
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByText(/存档.*损坏|损坏.*存档/).first()).toBeVisible();
  const journey = new Journey(page);
  await journey.press('新建调查');
  await journey.scene('M01');
  expect(await page.evaluate(() => localStorage.getItem('sci-fi-games:01-tomorrow-again:v1'))).toBe('other-story-sentinel');
  page.once('dialog', dialog => dialog.dismiss());
  await journey.press('重开调查');
  await journey.scene('M01');
  page.once('dialog', dialog => dialog.accept());
  await journey.press('重开调查');
  await journey.scene('M01');
  expect(await page.evaluate(() => localStorage.getItem('sci-fi-games:01-tomorrow-again:v1'))).toBe('other-story-sentinel');
});

test('real playback ticks, pause holds, and R rolls back exactly ten seconds', async ({ page }) => {
  const monitor = watchBrowser(page);
  const journey = new Journey(page, true);
  await start(journey);
  await journey.stepForward(10);
  await expect(page.getByTestId('time-display')).toHaveText('21:16:40');
  await journey.activate(page.getByTestId('collect-gate_action'));
  const card = page.getByTestId('evidence-gate_action');
  const category = card.getByRole('combobox');
  await journey.tabTo(category);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await journey.activate(card.getByRole('button', { name: /^核验：/ }));
  expect((await saved(page)).evidenceVerified).not.toContain('gate_action');
  await expect(page.getByRole('status')).toContainText('可观察的行为');
  await journey.classify('gate_action');
  await journey.press('播放');
  await expect.poll(async () => (await saved(page)).playheadOffsetSeconds, { timeout: 2_500 }).toBeGreaterThan(0);
  await journey.press('暂停');
  const paused = (await saved(page)).playheadOffsetSeconds;
  // Wait across one actual game tick to verify that pause preserves the frame.
  await page.waitForTimeout(1_100);
  expect((await saved(page)).playheadOffsetSeconds).toBe(paused);
  await journey.tabTo(journey.button('后一秒'));
  await page.keyboard.press('r');
  expect((await saved(page)).playheadOffsetSeconds).toBe(paused - 10);
  await page.keyboard.press('ArrowLeft');
  expect((await saved(page)).playheadOffsetSeconds).toBe(Math.max(-10, paused - 11));
  expect(monitor.errors).toEqual([]);
  expect(monitor.external).toEqual([]);
});

test('narrow screen touch, readable Chinese, visible focus and local resources', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'zh-CN' });
  const page = await context.newPage();
  const monitor = watchBrowser(page);
  await page.goto('/');
  await page.getByRole('button', { name: '新建调查', exact: true }).tap();
  await page.getByRole('button', { name: '接受双范围委托', exact: true }).tap();
  await expect(page.getByTestId('scene-id')).toContainText('M02');
  await page.getByRole('button', { name: '查询：四十天前', exact: true }).tap();
  await expect(page.getByTestId('time-display')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const bodyFont = await page.locator('body').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(bodyFont).toBeGreaterThanOrEqual(16);
  const journey = new Journey(page, true);
  await journey.tabTo(journey.button('精确回退十秒'));
  await expect(journey.button('精确回退十秒')).toBeFocused();
  const focus = await journey.button('精确回退十秒').evaluate(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
  });
  expect(focus).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/narrow.png', fullPage: true });
  expect(monitor.errors).toEqual([]);
  expect(monitor.external).toEqual([]);
  await context.close();
});
