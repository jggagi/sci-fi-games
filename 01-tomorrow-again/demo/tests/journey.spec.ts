import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { GameState } from '../src/model';

const SAVE_KEY = 'sci-fi-games:01-tomorrow-again:v1';
const screenshotDirectory = new URL('./screenshots/', import.meta.url).pathname;
type Controls = 'mouse' | 'keyboard' | 'touch';
type Route = { meal: 'porridge' | 'flatbread'; hair: 'tidy' | 'leave'; controls: Controls; restores: boolean; screenshots: boolean; screenshotSuffix?: string };

/** Keyboard route sends only real Tab/Enter/Space/Escape, never programmatic focus or clicks. */
async function activate(page: Page, target: Locator, controls: Controls, key = 'Enter') {
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  if (controls === 'mouse') { await target.click(); return; }
  if (controls === 'touch') { await target.tap(); return; }
  for (let tabs = 0; tabs < 100; tabs++) {
    if (await target.evaluate(el => el === document.activeElement)) {
      await page.keyboard.press(key);
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`键盘Tab无法到达 ${await target.getAttribute('data-focus')}`);
}

async function saved(page: Page): Promise<GameState> {
  const raw = await page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
  expect(raw).not.toBeNull();
  return JSON.parse(raw!);
}

async function closeTool(page: Page, controls: Controls) {
  if (controls === 'keyboard') await page.keyboard.press('Escape');
  else await activate(page, page.locator('[role="dialog"] [data-close]').first(), controls);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function screenshot(page: Page, name: string) {
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: `${screenshotDirectory}${name}.png`, fullPage: true });
}

async function assertLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), '页面中文和控件不能导致横向溢出').toBe(false);
  const overflow = await page.locator('.dialogue, .hint, .choices button, .modal').evaluateAll(elements =>
    elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 80) })));
  expect(overflow, '对白、操作和工具面板不能水平截断').toEqual([]);
  if (await page.getByRole('dialog').count()) {
    const rect = await page.getByRole('dialog').boundingBox();
    const viewport = page.viewportSize()!;
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width + 1);
  }
}

async function restoreAtCurrentNode(page: Page, controls: Controls) {
  const before = await saved(page);
  const art = await page.locator('.scene-art').innerHTML();
  const dialogue = await page.locator('[data-dialogue]').textContent();
  await page.reload();
  await expect(page.locator('[data-continue]')).toBeVisible();
  await activate(page, page.locator('[data-continue]'), controls);
  await expect(page.locator('.game')).toHaveAttribute('data-node', before.nodeId);
  expect(await saved(page)).toEqual(before);
  expect(await page.locator('.scene-art').innerHTML()).toEqual(art);
  expect(await page.locator('[data-dialogue]').textContent()).toEqual(dialogue);
}

async function inspectKind(page: Page, kind: string, controls: Controls) {
  const card = page.locator(`[data-photo-kind="${kind}"]`);
  const frameId = await card.getAttribute('data-frame-id');
  expect(frameId).toBeTruthy();
  await activate(page, card.locator('[data-inspect]'), controls);
  await expect(page.locator('.frame-detail')).toHaveAttribute('data-frame-id', frameId!);
  const picture = await page.locator('.large-photo').innerHTML();
  await activate(page, page.locator('[data-list]'), controls);
  return { frameId: frameId!, picture };
}

async function organizeAlbum(page: Page, route: Route) {
  await activate(page, page.locator('[data-open="album"]').first(), route.controls);
  await expect(page.locator('[data-filter="mine"]')).toHaveAttribute('aria-pressed', 'true');
  await activate(page, page.locator('[data-filter="wenxia"]'), route.controls);
  const before = await saved(page);
  const oldFrames = before.capturedFrames;
  const pictures = new Map<string, string>();
  for (const kind of ['breakfast_hands', 'hill_shadow', 'lake_reflection']) {
    const detail = await inspectKind(page, kind, route.controls);
    pictures.set(kind, detail.picture);
  }
  const reflection = page.locator('[data-photo-kind="lake_reflection"]');
  await activate(page, reflection.locator('[data-reorder][data-direction="-1"]'), route.controls);
  expect((await saved(page)).capturedFrames).toEqual(oldFrames);
  expect((await saved(page)).albumOrder).not.toEqual(before.albumOrder);
  await expect(page.locator('.album-task')).toContainText('3/3');
  await expect(page.locator('.album-task')).toContainText('已重排');
  await assertLayout(page);
  if (route.screenshots) await screenshot(page, `02-album${route.screenshotSuffix || ''}`);
  await closeTool(page, route.controls);
  if (route.restores) {
    await restoreAtCurrentNode(page, route.controls);
    await activate(page, page.locator('[data-open="album"]').first(), route.controls);
    await expect(page.locator('[data-filter="wenxia"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.album-task')).toContainText('3/3');
    for (const [kind, original] of pictures) {
      const restored = await inspectKind(page, kind, route.controls);
      expect(restored.picture).toEqual(original);
    }
    await closeTool(page, route.controls);
  }
  return pictures;
}

async function completeRoute(page: Page, route: Route) {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.url()} ${request.failure()?.errorText}`));
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('[data-continue]')).toHaveCount(0);
  await activate(page, page.locator('[data-start]'), route.controls);
  await expect(page.locator('.game')).toHaveAttribute('data-node', 'T01.00');
  if (route.screenshots) await screenshot(page, `01-opening${route.screenshotSuffix || ''}`);
  await activate(page, page.locator('[data-open="settings"]'), route.controls);
  await expect(page.locator('[data-setting="typewriter"]')).not.toBeChecked();
  await expect(page.locator('[data-setting="muted"]')).toBeChecked();
  await activate(page, page.locator('[data-setting="reducedMotion"]'), route.controls, 'Space');
  await expect(page.locator('html')).toHaveClass(/reduced-motion/);
  if (route.controls === 'mouse') {
    await activate(page, page.locator('[data-setting="reducedMotion"]'), route.controls, 'Space');
    await expect(page.locator('html')).not.toHaveClass(/reduced-motion/);
    await activate(page, page.locator('[data-setting="muted"]'), route.controls, 'Space');
    await expect(page.locator('[data-setting="muted"]')).not.toBeChecked();
    await activate(page, page.locator('[data-setting="muted"]'), route.controls, 'Space');
    await expect(page.locator('[data-setting="muted"]')).toBeChecked();
  }
  await closeTool(page, route.controls);

  const preference: Record<string, string> = {
    'T01.03': route.meal === 'porridge' ? 'T01.answer_records' : 'T01.answer_forgot',
    'T02.01': `T02.meal_${route.meal}`,
    'T02.05': route.meal === 'porridge' ? 'T02.vinegar_dip' : 'T02.vinegar_pour',
    'T02.07': route.meal === 'porridge' ? 'T02.stool_help' : 'T02.stool_leave',
    'T03.00': route.meal === 'porridge' ? 'T03.route_observation' : 'T03.route_lookout',
    'T04.00': route.meal === 'porridge' ? 'T04.view_left' : 'T04.view_right',
    'T04.03': 'T04.clear_offer',
    'T04.08': route.meal === 'porridge' ? 'T04.tomorrow_new' : 'T04.tomorrow_ask',
    'T05.03': route.meal === 'porridge' ? 'T05.repair' : 'T05.report',
    'T06.04': route.meal === 'porridge' ? 'T06.answer_unthought' : 'T06.answer_silent',
    'T07.04': `T07.hair_${route.hair}`,
    'T08.00': route.meal === 'porridge' ? 'T08.photo_sky' : 'T08.photo_mirror',
    'T08.02': route.meal === 'porridge' ? 'T08.route_river' : 'T08.route_blank',
    'T08.04': 'T08.finish',
  };
  let archivedPictures = new Map<string, string>();
  let sawAcknowledged = false;
  let sawClosed = false;
  for (let steps = 0; steps < 150; steps++) {
    if (await page.locator('.ending').count()) break;
    const node = await page.locator('.game').getAttribute('data-node');
    expect(node).toBeTruthy();
    await assertLayout(page);
    if (/^T0[1-6]\./.test(node!) || node === 'T07.00' || node === 'T07.01') {
      await expect(page.locator('.scene-art [data-portrait]')).toHaveCount(0);
    } else if (node!.startsWith('T07.')) {
      await expect(page.locator('.scene-art [data-portrait]')).toHaveCount(1);
    }
    if (node === 'T02.04' || node === 'T05.06') {
      const stateBefore = await saved(page);
      await activate(page, page.locator('[data-open="album"]'), route.controls);
      await activate(page, page.locator('[data-filter="wenxia"]'), route.controls);
      await expect(page.locator('[data-photo-kind="breakfast_hands"]')).toBeVisible();
      await inspectKind(page, 'breakfast_hands', route.controls);
      await closeTool(page, route.controls);
      await expect(page.locator('.game')).toHaveAttribute('data-node', node);
      expect((await saved(page)).capturedFrames).toEqual(stateBefore.capturedFrames);
    }
    if (node === 'T03.02') {
      await activate(page, page.locator('.choices [data-choice="T03.point_one_wrong"]'), route.controls);
      await expect(page.locator('.game')).toHaveAttribute('data-node', node);
      await expect(page.locator('.notice')).toContainText('断开的纹理');
    }
    if (node === 'T04.02' && route.restores) await restoreAtCurrentNode(page, route.controls);
    if (node === 'T06.00') archivedPictures = await organizeAlbum(page, route);
    if (node === 'T07.05a' || node === 'T07.05b') {
      const current = await saved(page);
      expect(current.hairChoice).toEqual(route.hair);
      expect(current.portraitSaved).toEqual(false);
      if (route.restores) await restoreAtCurrentNode(page, route.controls);
      if (route.screenshots) await screenshot(page, `03-mirror${route.screenshotSuffix || ''}`);
    }
    if (node === 'T07.08') {
      sawAcknowledged = true;
      await expect(page.locator('[data-dialogue]')).toContainText('已确认收到');
      const current = await saved(page);
      expect(current.portraitSaved).toEqual(true);
      expect(current.saveAcknowledged).toEqual(true);
      expect(current.channelClosed).toEqual(false);
      if (route.restores) await restoreAtCurrentNode(page, route.controls);
    }
    if (node === 'T08.00') {
      sawClosed = true;
      expect(sawAcknowledged).toBe(true);
      const before = await saved(page);
      expect(before.finished).toEqual(false);
      expect(before.channelClosed).toEqual(true);
      await activate(page, page.locator('[data-open="camera"]'), route.controls);
      await activate(page, page.locator('[data-view="left"]'), route.controls);
      await activate(page, page.locator('[data-shutter]'), route.controls);
      await activate(page, page.locator('[data-view="right"]'), route.controls);
      await activate(page, page.locator('[data-shutter]'), route.controls);
      await closeTool(page, route.controls);
      const after = await saved(page);
      expect(after.wenxiaMarks).toEqual(before.wenxiaMarks);
      expect(after.capturedFrames.some(f => f.kind === 'epilogue_mirror')).toBe(true);
      expect(after.capturedFrames.some(f => f.kind === 'epilogue_sky')).toBe(true);
      expect(after.finished).toEqual(false);
      await activate(page, page.locator('[data-open="album"]'), route.controls);
      await activate(page, page.locator('[data-filter="wenxia"]'), route.controls);
      for (const [kind, original] of archivedPictures) {
        const current = await inspectKind(page, kind, route.controls);
        expect(current.picture, '后来修改构图不能改写旧照片').toEqual(original);
      }
      const portrait = page.locator('[data-photo-kind="portrait"]');
      await expect(portrait).toContainText('已保存');
      await closeTool(page, route.controls);
      if (route.screenshots) await screenshot(page, `04-epilogue${route.screenshotSuffix || ''}`);
    }
    const selector = preference[node!] ? `.choices [data-choice="${preference[node!]}"]` : '.choices [data-choice]';
    const target = page.locator(selector).first();
    await activate(page, target, route.controls);
    if (node === 'T08.04') {
      await expect(page.locator('.ending')).toBeVisible();
      expect((await saved(page)).finished).toBe(true);
    } else await expect(page.locator('.game')).not.toHaveAttribute('data-node', node!);
  }
  await expect(page.locator('.ending')).toBeVisible();
  const final = await saved(page);
  expect(final.finished).toEqual(true);
  expect(final.visitedScenes).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08']);
  expect(final.mealChoice).toEqual(route.meal);
  expect(final.hairChoice).toEqual(route.hair);
  expect(final.capturedFrames.find(f => f.kind === 'breakfast_hands')?.variant.mealChoice).toEqual(route.meal);
  expect(final.capturedFrames.find(f => f.kind === 'portrait')?.variant.hairChoice).toEqual(route.hair);
  const endingFrame = final.capturedFrames.find(f => f.frameId === final.endingFrameId);
  expect(endingFrame?.kind).toEqual(route.meal === 'porridge' ? 'epilogue_sky' : 'epilogue_mirror');
  await expect(page.locator('.ending-art svg')).toHaveAttribute('aria-label', endingFrame!.description);
  await expect(page.locator('.ending-art svg')).toHaveAttribute('data-frame-kind', endingFrame!.kind);
  expect(sawClosed).toBe(true);
  expect(new Set(final.capturedFrames.map(f => f.frameId)).size).toEqual(final.capturedFrames.length);
  await activate(page, page.locator('[data-open="album"]').first(), route.controls);
  await expect(page.getByRole('dialog')).toBeVisible();
  await closeTool(page, route.controls);
  expect(errors, '页面和浏览器console不应有错误').toEqual([]);
  expect(failedRequests, '资源应全部加载成功').toEqual([]);
  expect(externalRequests, '游戏不应请求外网').toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}

test('生产完整鼠标路线：热粥×整理头发；早期相册、T04/T06/T07刷新、原图稳定与可玩尾声', async ({ page }) => {
  await completeRoute(page, { meal: 'porridge', hair: 'tidy', controls: 'mouse', restores: true, screenshots: true });
});

test('生产完整纯键盘路线：面饼×不整理；真实Tab/Enter/Space/Esc从开场至自主结束', async ({ page }) => {
  await completeRoute(page, { meal: 'flatbread', hair: 'leave', controls: 'keyboard', restores: false, screenshots: false });
});

test('生产360px窄屏完整触控路线：面饼×整理头发；逐场中文布局、相册与尾声', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true, baseURL });
  const page = await context.newPage();
  await completeRoute(page, { meal: 'flatbread', hair: 'tidy', controls: 'touch', restores: false, screenshots: true, screenshotSuffix: '-mobile' });
  await context.close();
});

test('窄屏触控、弹窗焦点、重开确认和损坏恢复只影响本故事', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await page.locator('[data-start]').tap();
  await expect(page.locator('.game')).toHaveAttribute('data-node', 'T01.00');
  await expect(page.locator('.choices [data-choice]').first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.locator('[data-open="settings"]').tap();
  await expect(page.locator('[role="dialog"] [data-close]').first()).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-open="settings"]')).toBeFocused();
  const prior = await saved(page);
  await page.locator('[data-home]').tap();
  await page.locator('[data-start]').tap();
  await expect(page.getByRole('dialog')).toContainText('重新开始行程');
  await page.getByRole('button', { name: '保留当前行程' }).tap();
  expect(await saved(page)).toEqual(prior);
  await page.locator('[data-start]').tap();
  await page.locator('[data-confirm-restart]').tap();
  expect((await saved(page)).runId).not.toEqual(prior.runId);
  // Corruption fixture is used only to verify recovery, never to manufacture a completed route.
  await page.evaluate(key => {
    localStorage.setItem('sci-fi-games:02-ten-seconds-earlier:v1', 'other-game-preserved');
    localStorage.setItem(key, '{damaged');
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('存档损坏');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBe('{damaged');
  await page.locator('[data-start]').tap();
  await page.locator('[data-confirm-restart]').tap();
  await expect(page.locator('.game')).toHaveAttribute('data-node', 'T01.00');
  expect(await page.evaluate(() => localStorage.getItem('sci-fi-games:02-ten-seconds-earlier:v1'))).toBe('other-game-preserved');
  expect((await saved(page)).capturedFrames).toEqual([]);
  await context.close();
});
