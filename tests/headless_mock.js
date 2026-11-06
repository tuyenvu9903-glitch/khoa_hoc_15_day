/* Headless check for mock exams: English only while taking the exam, Vietnamese back after submit.
   Run through tests/test_mock_headless.py. Needs the `playwright` npm package and Chromium. */
const path = require('path');
const { chromium } = require('playwright');

const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
// Every exam mode. `lang` is the saved language setting, which must not matter during the exam.
const MODES = [
  { key: 1, lang: 'vi' }, { key: 2, lang: 'both' }, { key: 3, lang: 'enfirst' }, { key: 4, lang: 'vi' },
  { key: 'v10', lang: 'vi' }, { key: 'half', lang: 'both' }, { key: 'sc:S1', lang: 'vi' },
];
const VIEWS = [{ width: 1400, height: 900 }, { width: 420, height: 800 }];

const visible = (page) => page.evaluate(() => document.body.innerText);
const offending = (text) => text.split('\n').filter((line) => VI.test(line));

async function exam(browser, mode, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(FILE);
  await page.evaluate((lang) => { s.mode = lang; s.view = 'mock'; save(); }, mode.lang);
  await page.evaluate((key) => startMock(key), mode.key);
  await page.waitForSelector('#mockView .mq');
  const ctx = `${mode.key}/${mode.lang}/${viewport.width}`;
  const fail = (m) => { throw new Error(`${ctx}: ${m}`); };

  // The whole page, with scenario boxes opened and the map opened on mobile.
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  if (viewport.width < 900) await page.click('#qmTog');
  let bad = offending(await visible(page));
  if (bad.length) fail(`Vietnamese visible while taking the exam: ${bad.slice(0, 3).join(' | ')}`);

  // Flagging and answering redraw parts of the screen.
  await page.evaluate(() => { document.querySelector('.mflag').click(); document.querySelector('.option').click(); });
  bad = offending(await visible(page));
  if (bad.length) fail(`Vietnamese after answering: ${bad.slice(0, 3).join(' | ')}`);

  // The pre-submit prompt.
  const prompts = [];
  page.on('dialog', async (d) => { prompts.push(d.message()); await d.accept(); });
  await page.evaluate(() => document.querySelector('#qmSubmit').click());
  await page.waitForSelector('#mockView .mrev');
  if (!prompts.length || VI.test(prompts.join(' '))) fail(`pre-submit prompt: ${prompts.join(' | ')}`);

  // After submit the language setting applies again.
  const after = await visible(page);
  if (!VI.test(after)) fail('Vietnamese did not come back after submit');
  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  await context.close();
  return ctx;
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWS) for (const mode of MODES) console.log('ok', await exam(browser, mode, viewport));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message); process.exit(1); });
