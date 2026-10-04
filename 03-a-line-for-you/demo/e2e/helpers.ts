import { expect, type Locator, type Page } from '@playwright/test';

export const SAVE_KEY = 'sci-fi-games:03-a-line-for-you:v1';

export type GameSave = {
  sceneId: string;
  rainChoice: string | null;
  revisionChoice: string | null;
  chairChoice: string | null;
  pageOrder: string[];
  collectedPaperIds: string[];
  paperSidesInspected: string[];
  memoryContributions: { contributionId: string; text: string; [key: string]: unknown }[];
  coauthorSeen: boolean;
  compilationUnderstood: boolean;
  finalLineMode: string | null;
  finalLineText: string;
  authorshipConfirmed: boolean;
  [key: string]: unknown;
};

/** Inspect only the real game's save; never create or advance a game here. */
export async function readSave(page: Page): Promise<GameSave> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('The running game has not saved yet');
    const parsed = JSON.parse(raw);
    return parsed.state ?? parsed;
  }, SAVE_KEY);
}

/** Traverse the browser's actual Tab order. No direct focusing or DOM clicks. */
export async function activateWithKeyboard(page: Page, testId: string, key = 'Enter'): Promise<void> {
  const target = page.getByTestId(testId);
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  for (let step = 0; step < 100; step++) {
    const matches = await target.evaluate((element) => document.activeElement === element);
    if (matches) {
      await expect(target).toBeFocused();
      await page.keyboard.press(key);
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not reach ${testId} through 100 real Tab presses`);
}

export function controls(page: Page, keyboard = false) {
  return async (testId: string, key = 'Enter') => {
    if (keyboard) await activateWithKeyboard(page, testId, key);
    else {
      const control = page.getByTestId(testId);
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
      await control.click();
    }
  };
}

export async function assertScene(page: Page, sceneId: string) {
  await expect(page.locator(`[data-scene="${sceneId}"]`)).toBeVisible();
  await expect.poll(async () => (await readSave(page)).sceneId).toBe(sceneId);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${sceneId} has no horizontal overflow`).toBe(true);
}

export async function setCheckbox(page: Page, testId: string, checked: boolean, keyboard = false) {
  const input = page.getByTestId(testId);
  if ((await input.isChecked()) !== checked) await controls(page, keyboard)(testId, 'Space');
  await expect(input).toBeChecked({ checked });
}

export async function expectDialogFocus(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  const focusInside = await dialog.evaluate((element) => element.contains(document.activeElement));
  expect(focusInside, 'Opening a dialog puts keyboard focus inside it').toBe(true);
}

export function monitorRuntime(page: Page) {
  const errors: string[] = [];
  const resourceFailures: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) resourceFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => resourceFailures.push(`${request.failure()?.errorText}: ${request.url()}`));
  page.on('request', (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !/^http:\/\/127\.0\.0\.1:\d+(?:\/|$)/.test(url)) externalRequests.push(url);
  });
  return { errors, resourceFailures, externalRequests };
}
