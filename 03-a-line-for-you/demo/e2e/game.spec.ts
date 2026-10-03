import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { assertScene, controls, expectDialogFocus, monitorRuntime, readSave, SAVE_KEY, setCheckbox } from './helpers';

const screenshotDirectory = join(process.cwd(), 'screenshots');
const ids = ['page-1', 'page-2', 'page-3', 'page-4', 'page-5', 'page-6'];

async function screenshot(page: Page, name: string) {
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: join(screenshotDirectory, name), fullPage: true, animations: 'disabled' });
}

async function newGame(page: Page, keyboard: boolean) {
  await page.goto('/');
  await expect(page.getByText('你是小序，一名连接移动底座与桌面操作臂的家用 AI。')).toBeVisible();
  await controls(page, keyboard)('start-new');
  await assertScene(page, 'P01');
  await expect(page.locator('footer')).toContainText('小序 · AI');
}

async function collectPages(page: Page, keyboard: boolean) {
  const act = controls(page, keyboard);
  for (const id of [3, 1, 6, 2, 5, 4]) await act(`collect-page-${id}`);
  await act('start-rain');
  await assertScene(page, 'P02');
}

async function sortManuscript(page: Page, keyboard: boolean) {
  const act = controls(page, keyboard);
  const start = await readSave(page);
  expect(start.pageOrder.slice().sort()).toEqual(ids);
  expect(start.pageOrder).not.toEqual(ids);
  await expect(page.locator('.dialogue')).not.toContainText('那我们得把登记表改一下。');
  await expect(page.locator('.dialogue')).not.toContainText('先加到作者里');
  await act('hint');
  await expect(page.locator('.hint')).toContainText('先找到纸页 1');
  await act('hint');
  await expect(page.locator('.hint')).toContainText('页码就是顺序');
  // Wrong order cannot unlock the next scene. Keep the action entirely in the UI.
  const compile = page.getByTestId('compile');
  if (await compile.isEnabled()) await act('compile');
  await assertScene(page, 'P06');
  expect((await readSave(page)).compilationUnderstood).toBe(false);
  for (let index = 0; index < ids.length; index++) {
    let order = (await readSave(page)).pageOrder;
    while (order.indexOf(ids[index]) > index) {
      await act(`page-${ids[index]}-up`);
      order = (await readSave(page)).pageOrder;
    }
  }
  expect((await readSave(page)).pageOrder).toEqual(ids);
  await act('compile');
  expect((await readSave(page)).compilationUnderstood).toBe(true);
  const sortingButtons = page.locator('.tray .page-controls button');
  await expect(sortingButtons).toHaveCount(12);
  for (const control of await sortingButtons.all()) await expect(control).toBeDisabled();
}

async function memoryRoute(page: Page, options: {
  keyboard: boolean;
  rain: 'rain_count' | 'rain_plain';
  word: 'word_wait' | 'word_keep';
  chair: 'chair_window' | 'chair_angled';
  earlyCover: boolean;
  capture: boolean;
}) {
  const act = controls(page, options.keyboard);
  if (options.earlyCover) {
    await act('view-cover');
    await expect(page.getByRole('dialog')).toContainText('周淮');
    await expect(page.getByRole('dialog')).toContainText('小序');
    await act('close-modal');
    expect((await readSave(page)).coauthorSeen).toBe(true);
  }
  await collectPages(page, options.keyboard);
  if (options.capture) await screenshot(page, 'past-room.png');
  await act('move-basin');
  await expect(page.getByText(/落水|雨声|清楚/).first()).toBeVisible();
  await act(`rain-${options.rain}`);
  const rainSaved = await readSave(page);
  expect(rainSaved.rainChoice).toBe(options.rain);
  await act('finish-rain');
  await assertScene(page, 'P03');
  await act('link-rain');
  const historyBeforeCloud = JSON.stringify((await readSave(page)).memoryContributions);
  await act('open-cloud');
  await act('cloud-cloud_1');
  await act('cloud-draft');
  await act('cloud-draft');
  await act('cloud-cloud_2');
  await act('cloud-cloud_3');
  expect(JSON.stringify((await readSave(page)).memoryContributions)).toBe(historyBeforeCloud);
  await act('start-revision');
  await assertScene(page, 'P04');
  await act(`word-${options.word}`);
  await act('zhou-keep');
  const beforeRefresh = await readSave(page);
  await page.reload();
  await act('continue-game');
  await assertScene(page, 'P04');
  const afterRefresh = await readSave(page);
  expect(afterRefresh.rainChoice).toEqual(beforeRefresh.rainChoice);
  expect(afterRefresh.memoryContributions).toEqual(beforeRefresh.memoryContributions);
  expect(afterRefresh.pageOrder).toEqual(beforeRefresh.pageOrder);
  await act('commit-revision');
  await assertScene(page, 'P05');
  await act('try-chair');
  await act(`chair-${options.chair}`);
  await act('set-reminder');
  await act('finish-chair');
  await assertScene(page, 'P06');
  const contributions = (await readSave(page)).memoryContributions;
  expect(contributions).toHaveLength(3);
  expect(new Set(contributions.map((item) => item.contributionId)).size).toBe(3);
  await sortManuscript(page, options.keyboard);
  if (options.earlyCover) await expect(page.locator('[data-dialogue="P06.xu.early"]')).toContainText('名字我已经看到了。现在知道他为什么这样排了');
  else await expect(page.locator('.dialogue')).not.toContainText('先加到作者里');
  if (options.capture) {
    await act('open-manuscript');
    await mkdir(screenshotDirectory, { recursive: true });
    await page.getByRole('dialog').screenshot({ path: join(screenshotDirectory, 'compiled-manuscript.png'), animations: 'disabled' });
    for (const number of [2, 3, 4]) await act(`flip-page-${number}`);
    const flipped = await readSave(page);
    for (const number of [2, 3, 4]) expect(flipped.paperSidesInspected).toContain(`page-${number}:back`);
    // These captures use the real scrollable manuscript, with its selected revision and chair note.
    await page.getByTestId('manuscript-page-3').screenshot({ path: join(screenshotDirectory, 'revision-page.png'), animations: 'disabled' });
    await page.getByTestId('manuscript-page-4').screenshot({ path: join(screenshotDirectory, 'chair-page.png'), animations: 'disabled' });
    await act('close-modal');
  }
  await act('view-cover');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('周淮');
  await expect(dialog).toContainText('小序');
  await expectDialogFocus(page, dialog);
  if (options.capture) await dialog.screenshot({ path: join(screenshotDirectory, 'coauthor-page.png'), animations: 'disabled' });
  await act('close-modal');
  await act('start-final');
  await assertScene(page, 'P07');
}

test('A：默认揭晓、数雨／等着／椅子原位，真实 Tab 键盘完整通关并填写最后一行', async ({ page }) => {
  const runtime = monitorRuntime(page);
  const act = controls(page, true);
  await newGame(page, true);
  await act('open-settings');
  await expectDialogFocus(page, page.getByRole('dialog'));
  await setCheckbox(page, 'setting-typewriter', true, true);
  await setCheckbox(page, 'setting-typewriter', false, true);
  await setCheckbox(page, 'setting-motion', true, true);
  await setCheckbox(page, 'setting-sound', true, true);
  await setCheckbox(page, 'setting-sound', false, true);
  await act('close-modal');
  expect(await page.locator('.rain-streak').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await memoryRoute(page, { keyboard: true, rain: 'rain_count', word: 'word_wait', chair: 'chair_window', earlyCover: false, capture: true });
  await act('final-chair');
  await act('save-final');
  await assertScene(page, 'P08');
  expect((await readSave(page)).authorshipConfirmed).toBe(false);
  await expect(page.locator('.dialogue')).not.toContainText('收到');
  await act('confirm-authorship', 'Space');
  await act('save-authors');
  await expect(page.getByTestId('epilogue')).toBeVisible();
  await expect(page.locator('.dialogue')).toContainText('收到');
  const ending = await readSave(page);
  expect(ending.authorshipConfirmed).toBe(true);
  expect(ending.finalLineMode).toBe('fixed');
  expect(ending.finalLineText).toBe('窗边的椅子，我还没有搬。');
  expect(ending.rainChoice).toBe('rain_count');
  expect(ending.revisionChoice).toBe('word_wait');
  expect(ending.chairChoice).toBe('chair_window');
  await screenshot(page, 'epilogue.png');
  await act('open-manuscript');
  const manuscript = page.getByRole('dialog');
  await expectDialogFocus(page, manuscript);
  for (const contribution of ending.memoryContributions) await expect(manuscript).toContainText(contribution.text);
  await expect(manuscript).toContainText(ending.finalLineText);
  const regularSize = await page.getByTestId('manuscript-page-1').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  await act('paper-zoom');
  await expect(page.getByTestId('paper-zoom')).toHaveAttribute('aria-pressed', 'true');
  const zoomedSize = await page.getByTestId('manuscript-page-1').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(zoomedSize).toBeGreaterThan(regularSize);
  await act('close-modal');
  await page.reload();
  await act('continue-game');
  await expect(page.getByTestId('epilogue')).toBeVisible();
  expect(await readSave(page)).toEqual(ending);
  expect(runtime.errors).toEqual([]);
  expect(runtime.resourceFailures).toEqual([]);
  expect(runtime.externalRequests).toEqual([]);
});

test('B：提前看署名、就是雨／保留守着／斜放椅子，留白并保留可探索尾声', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtime = monitorRuntime(page);
  const act = controls(page);
  await newGame(page, false);
  await memoryRoute(page, { keyboard: false, rain: 'rain_plain', word: 'word_keep', chair: 'chair_angled', earlyCover: true, capture: false });
  await act('final-deferred');
  await act('save-final');
  await assertScene(page, 'P08');
  await act('confirm-authorship');
  await act('save-authors');
  await expect(page.getByTestId('epilogue')).toBeVisible();
  const ending = await readSave(page);
  expect(ending.coauthorSeen).toBe(true);
  expect(ending.compilationUnderstood).toBe(true);
  expect(ending.finalLineMode).toBe('deferred');
  expect(ending.finalLineText).toBe('');
  expect(ending.authorshipConfirmed).toBe(true);
  expect(ending.rainChoice).toBe('rain_plain');
  expect(ending.revisionChoice).toBe('word_keep');
  expect(ending.chairChoice).toBe('chair_angled');
  await act('open-manuscript');
  await expect(page.getByRole('dialog')).toContainText('待小序续写');
  await expect(page.getByRole('dialog')).toContainText('不像什么，就是雨。');
  await expect(page.getByRole('dialog')).toContainText('这是人的愿望，不是风的工作');
  await expect(page.getByRole('dialog')).not.toContainText('像有人在给窗户数数。');
  await expect(page.getByRole('dialog')).not.toContainText('夜风替屋子等着灯');
  await act('close-modal');
  for (const place of ['window', 'desk', 'chair', 'cup']) {
    await page.getByTestId(`room-${place}`).click();
    if (place === 'desk') await act('close-modal');
  }
  await page.reload();
  await act('continue-game');
  await expect(page.getByTestId('epilogue')).toBeVisible();
  expect((await readSave(page)).memoryContributions).toEqual(ending.memoryContributions);
  expect((await readSave(page)).finalLineMode).toBe('deferred');
  // A restart only removes this story's game state. Other projects' data survives.
  await page.evaluate(() => localStorage.setItem('sci-fi-games:02-ten-seconds-earlier:v1', 'other-story-sentinel'));
  await act('restart-game');
  await expect(page.getByRole('dialog')).toContainText(/重新|重开/);
  await act('restart-confirm');
  await assertScene(page, 'P01');
  const restarted = await readSave(page);
  expect(restarted.memoryContributions).toEqual([]);
  expect(restarted.rainChoice).toBeNull();
  expect(restarted.revisionChoice).toBeNull();
  expect(restarted.chairChoice).toBeNull();
  expect(restarted.coauthorSeen).toBe(false);
  expect(restarted.authorshipConfirmed).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('sci-fi-games:02-ten-seconds-earlier:v1'))).toBe('other-story-sentinel');
  expect(runtime.errors).toEqual([]);
  expect(runtime.resourceFailures).toEqual([]);
  expect(runtime.externalRequests).toEqual([]);
});

test.describe('基础触控', () => {
test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
test('窄屏触控、手稿放大、设置和损坏存档恢复', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');
  await page.getByTestId('start-new').tap();
  await assertScene(page, 'P01');
  expect((await readSave(page)).collectedPaperIds).toEqual([]);
  await page.getByTestId('open-manuscript').tap();
  await page.getByTestId('flip-page-1').tap();
  const inspected = await readSave(page);
  expect(inspected.collectedPaperIds).toEqual(['page-1']);
  expect(inspected.paperSidesInspected).toEqual(['page-1:front', 'page-1:back']);
  await page.getByTestId('close-modal').tap();
  await expect(page.getByTestId('collect-page-1')).toBeDisabled();
  for (const id of [3, 6, 2, 5, 4]) await page.getByTestId(`collect-page-${id}`).tap();
  await page.getByTestId('start-rain').tap();
  await assertScene(page, 'P02');
  await page.getByTestId('move-basin').tap();
  await expect(page.getByTestId('move-basin')).toBeDisabled();
  await page.getByTestId('rain-rain_rice').tap();
  expect((await readSave(page)).rainChoice).toBe('rain_rice');
  await page.getByTestId('open-manuscript').tap();
  await expectDialogFocus(page, page.getByRole('dialog'));
  const regularSize = await page.getByTestId('manuscript-page-1').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  await page.getByTestId('paper-zoom').tap();
  await expect(page.getByTestId('paper-zoom')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.getByTestId('manuscript-page-1').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(regularSize);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByTestId('close-modal').tap();
  await page.getByTestId('open-settings').tap();
  for (const [id, checked] of [['setting-motion', true], ['setting-typewriter', false], ['setting-sound', false]] as const) {
    if ((await page.getByTestId(id).isChecked()) !== checked) await page.getByTestId(id).tap();
    await expect(page.getByTestId(id)).toBeChecked({ checked });
  }
  await page.getByTestId('close-modal').tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.evaluate((key) => localStorage.setItem(key, '{not valid JSON'), SAVE_KEY);
  await page.reload();
  await expect(page.getByText(/损坏|无法读取|不能读取/).first()).toBeVisible();
  await page.getByTestId('start-new').tap();
  await assertScene(page, 'P01');
  expect((await readSave(page)).memoryContributions).toEqual([]);
  expect(runtime.errors).toEqual([]);
  expect(runtime.resourceFailures).toEqual([]);
  expect(runtime.externalRequests).toEqual([]);
});
});
