#!/usr/bin/env node
/**
 * Daily Carousel Generator
 *
 * Автоматически генерирует карусель карточек для Instagram:
 * 1. Claude API → тема + тексты карточек
 * 2. Kie.ai → AI-фоны
 * 3. Playwright → рендер HTML → PNG
 * 4. Publer → публикация в Instagram
 *
 * Env vars:
 *   ANTHROPIC_API_KEY, KIE_AI_API_KEY,
 *   PUBLER_API_KEY, PUBLER_WORKSPACE_ID, PUBLER_INSTAGRAM_ACCOUNT_ID
 */

import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execFileSync } from 'child_process';

// ─── Config ───
const DRY_RUN = process.argv.includes('--dry-run');
const WORK_DIR = resolve('./output');
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

const env = (key) => {
  const v = process.env[key];
  if (!v && !DRY_RUN) throw new Error(`Missing env: ${key}`);
  return v || 'dry-run-placeholder';
};

// ─── Step 1: Research topic + generate card content via Claude ───
async function generateContent() {
  console.log('📝 Шаг 1: Генерация контента через Claude...');

  const client = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY') });

  const today = new Date().toISOString().split('T')[0];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Ты — контент-продюсер Дениса Ффринга (@ffring). Твоя задача — придумать тему для карусели карточек в Instagram и написать тексты.

Сегодня: ${today}

ПРАВИЛА:
- Тема должна быть актуальной, полезной для предпринимателей и контент-мейкеров
- Темы: AI-инструменты, автоматизация, маркетинг, контент, бизнес-хаки
- Голос: разговорный, конкретный, без канцелярита, без ИИ-клише
- Маркеры речи: «короче», «расклад такой», скобки, риторические вопросы
- Цифры > слова. «12 минут» > «быстро»
- НЕ ВЫДУМЫВАЙ статистику — только достоверные факты
- Формат: 5-7 карточек (обложка + контент + CTA)

ВЫДАЙ JSON строго по формату (без markdown, только чистый JSON):
{
  "topic": "краткое название темы",
  "hashtags": "#тег1 #тег2 ...",
  "cards": [
    {
      "type": "cover",
      "title": "заголовок обложки (макс 8 слов)",
      "subtitle": "подзаголовок (макс 15 слов)",
      "bg_prompt": "prompt for background image in English, dark moody style, no text no letters"
    },
    {
      "type": "content",
      "number": 1,
      "emoji": "подходящий эмодзи",
      "title": "заголовок карточки (2-4 слова)",
      "tagline": "подзаголовок (5-10 слов)",
      "body": "основной текст (30-50 слов, конкретика, без воды)",
      "tag": "тег внизу (2-3 слова)",
      "accent_color": "CSS цвет для акцента (#hex)",
      "bg_prompt": "prompt for background image in English, dark cinematic, no text no letters"
    },
    {
      "type": "cta",
      "main_text": "финальный призыв (макс 20 слов)",
      "link": "@ffring в Telegram",
      "sub": "подпись под ссылкой",
      "bg_prompt": "dark abstract ethereal background, no text no letters"
    }
  ],
  "instagram_caption": "полный текст поста для Instagram (с эмодзи, хештегами, CTA)"
}`
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude не вернул валидный JSON');

  const content = JSON.parse(jsonMatch[0]);
  console.log(`   ✓ Тема: "${content.topic}" (${content.cards.length} карточек)`);
  return content;
}

// ─── Step 2: Generate backgrounds via Kie.ai ───
async function generateBackgrounds(cards) {
  console.log('🎨 Шаг 2: Генерация фонов через Kie.ai...');

  const apiKey = env('KIE_AI_API_KEY');
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // Launch all generations in parallel
  const tasks = await Promise.all(cards.map(async (card, i) => {
    const resp = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'nano-banana-pro',
        input: {
          prompt: card.bg_prompt + '. No text, no letters, no words, no numbers in the image. Clean background suitable for text overlay.',
          aspect_ratio: '4:5',
          output_format: 'png'
        }
      })
    });
    const data = await resp.json();
    console.log(`   ⏳ Card ${i + 1} → task ${data.data.taskId}`);
    return { index: i, taskId: data.data.taskId };
  }));

  // Poll all tasks
  const results = [];
  let pending = [...tasks];

  for (let attempt = 0; attempt < 20 && pending.length > 0; attempt++) {
    await sleep(5000);
    const stillPending = [];

    for (const task of pending) {
      const resp = await fetch(
        `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${task.taskId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const data = await resp.json();

      if (data.data.state === 'success') {
        const result = JSON.parse(data.data.resultJson);
        const url = result.resultUrls[0];
        const filename = `bg-${task.index}.png`;

        const imgResp = await fetch(url);
        const buffer = Buffer.from(await imgResp.arrayBuffer());
        writeFileSync(join(WORK_DIR, filename), buffer);

        results.push({ index: task.index, filename });
        console.log(`   ✓ Card ${task.index + 1} → ${filename}`);
      } else if (data.data.state === 'failed') {
        console.log(`   ✗ Card ${task.index + 1} FAILED`);
      } else {
        stillPending.push(task);
      }
    }
    pending = stillPending;
  }

  if (pending.length > 0) {
    console.log(`   ⚠ ${pending.length} backgrounds still pending after timeout`);
  }

  return results;
}

// ─── Step 3: Build HTML ───
function buildHTML(content) {
  console.log('🔨 Шаг 3: Сборка HTML...');

  const totalCards = content.cards.length;

  const progressDots = (active, total) =>
    Array.from({ length: total }, (_, i) =>
      `<div class="dot${i === active ? ' active' : ''}"></div>`
    ).join('');

  const cardHTMLs = content.cards.map((card, i) => {
    if (card.type === 'cover') {
      return `
  <div class="card" id="card-${i + 1}">
    <div class="card-bg" style="background-image: url('./bg-${i}.png')"></div>
    <div class="overlay" style="background: linear-gradient(180deg, rgba(5,5,8,0.4) 0%, rgba(5,5,8,0.15) 30%, rgba(5,5,8,0.75) 85%, rgba(5,5,8,0.95) 100%)"></div>
    <div class="card-content">
      <div class="card-header"><span class="brand">@ffring</span><span class="slide-number">${i + 1}/${totalCards}</span></div>
      <div class="cover-body">
        <h1 class="cover-title">${card.title}</h1>
        <p class="cover-sub">${card.subtitle}</p>
      </div>
      <div class="card-footer">
        <div class="progress-dots">${progressDots(i, totalCards)}</div>
        <span class="swipe-hint">листай →</span>
      </div>
    </div>
  </div>`;
    }

    if (card.type === 'cta') {
      return `
  <div class="card" id="card-${i + 1}">
    <div class="card-bg" style="background-image: url('./bg-${i}.png')"></div>
    <div class="overlay" style="background: linear-gradient(180deg, rgba(5,5,8,0.5) 0%, rgba(5,5,8,0.3) 40%, rgba(5,5,8,0.7) 100%)"></div>
    <div class="overlay" style="background: radial-gradient(ellipse at center, rgba(124,58,237,0.1) 0%, transparent 65%)"></div>
    <div class="card-content">
      <div class="card-header"><span class="brand">@ffring</span><span class="slide-number">${i + 1}/${totalCards}</span></div>
      <div class="cta-body">
        <p class="cta-main">${card.main_text}</p>
        <span class="cta-link">${card.link}</span>
        <p class="cta-sub">${card.sub}</p>
      </div>
      <div class="card-footer">
        <div class="progress-dots">${progressDots(i, totalCards)}</div>
        <span></span>
      </div>
    </div>
  </div>`;
    }

    const color = card.accent_color || '#a78bfa';
    return `
  <div class="card" id="card-${i + 1}">
    <div class="card-bg" style="background-image: url('./bg-${i}.png')"></div>
    <div class="overlay" style="background: linear-gradient(180deg, rgba(5,5,8,0.3) 0%, rgba(5,5,8,0.15) 20%, rgba(5,5,8,0.65) 65%, rgba(5,5,8,0.92) 100%)"></div>
    <div class="card-content">
      <div class="card-header"><span class="brand">@ffring</span><span class="slide-number">${i + 1}/${totalCards}</span></div>
      <div class="content-body">
        <div class="card-num" style="background: ${color}22; color: ${color};">${card.number}</div>
        <span class="card-emoji">${card.emoji}</span>
        <h2 class="card-title">${card.title}</h2>
        <p class="card-tagline" style="color: ${color};">${card.tagline}</p>
        <div class="desc-box">
          <p class="desc-text">${card.body}</p>
        </div>
        <span class="example-tag">${card.tag}</span>
      </div>
      <div class="card-footer">
        <div class="progress-dots">${progressDots(i, totalCards)}</div>
        <span class="swipe-hint">→</span>
      </div>
    </div>
  </div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050508; display: flex; flex-direction: column; align-items: center; gap: 48px; padding: 48px; font-family: 'Inter', sans-serif; }
    .card { width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; position: relative; overflow: hidden; }
    .card-bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
    .overlay { position: absolute; inset: 0; }
    .card-content { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 60px 72px; color: #fff; z-index: 2; }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 24px; font-weight: 600; opacity: 0.4; letter-spacing: 1px; }
    .slide-number { font-size: 22px; font-weight: 600; opacity: 0.35; }
    .cover-body { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 28px; }
    .cover-title { font-size: 78px; font-weight: 900; line-height: 1.05; letter-spacing: -3px; max-width: 900px; text-shadow: 0 4px 40px rgba(0,0,0,0.5); }
    .cover-sub { font-size: 34px; font-weight: 400; opacity: 0.5; max-width: 700px; line-height: 1.45; }
    .content-body { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 20px; }
    .card-num { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 16px; font-size: 32px; font-weight: 900; margin-bottom: 28px; }
    .card-emoji { font-size: 56px; margin-bottom: 20px; }
    .card-title { font-size: 72px; font-weight: 900; line-height: 1; letter-spacing: -3px; margin-bottom: 8px; text-shadow: 0 4px 30px rgba(0,0,0,0.4); }
    .card-tagline { font-size: 38px; font-weight: 600; line-height: 1.2; margin-bottom: 24px; }
    .desc-box { background: rgba(0,0,0,0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 32px 36px; margin-bottom: 20px; max-width: 920px; }
    .desc-text { font-size: 32px; font-weight: 400; line-height: 1.55; opacity: 0.9; }
    .example-tag { display: inline-block; font-size: 24px; font-weight: 600; padding: 10px 24px; border-radius: 100px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); opacity: 0.6; }
    .cta-body { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 44px; }
    .cta-main { font-size: 54px; font-weight: 800; line-height: 1.2; max-width: 820px; }
    .cta-link { font-size: 38px; font-weight: 700; padding: 24px 64px; border: 2px solid rgba(255,255,255,0.25); border-radius: 100px; background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
    .cta-sub { font-size: 28px; opacity: 0.35; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; }
    .swipe-hint { font-size: 26px; font-weight: 500; opacity: 0.25; }
    .progress-dots { display: flex; gap: 8px; align-items: center; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); }
    .dot.active { width: 24px; border-radius: 4px; background: rgba(255,255,255,0.6); }
  </style>
</head>
<body>
${cardHTMLs.join('\n')}
</body>
</html>`;

  const htmlPath = join(WORK_DIR, 'cards.html');
  writeFileSync(htmlPath, html);
  console.log(`   ✓ HTML → ${htmlPath}`);
  return htmlPath;
}

// ─── Step 4: Render PNG via Playwright ───
async function renderPNG(htmlPath, cardCount) {
  console.log('📸 Шаг 4: Рендер PNG через Playwright...');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 1500 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const pngs = [];
  for (let i = 1; i <= cardCount; i++) {
    const el = await page.$(`#card-${i}`);
    if (el) {
      const filePath = join(WORK_DIR, `card-${i}.png`);
      await el.screenshot({ path: filePath });
      const size = statSync(filePath).size;
      console.log(`   ✓ card-${i}.png (${Math.round(size / 1024)}KB)`);
      pngs.push(filePath);
    }
  }

  await browser.close();
  return pngs;
}

// ─── Step 5: Upload to Publer + Publish ───
async function publishToInstagram(pngs, caption) {
  console.log('📤 Шаг 5: Публикация в Instagram через Publer...');

  const apiKey = env('PUBLER_API_KEY');
  const wsId = env('PUBLER_WORKSPACE_ID');
  const accountId = env('PUBLER_INSTAGRAM_ACCOUNT_ID');

  const headers = {
    'Authorization': `Bearer-API ${apiKey}`,
    'Publer-Workspace-Id': wsId
  };

  // Upload each image via curl (multipart)
  const mediaIds = [];
  for (const pngPath of pngs) {
    const filename = pngPath.split('/').pop();
    console.log(`   ⏳ Uploading ${filename}...`);

    const result = execFileSync('curl', [
      '-s', '-X', 'POST',
      'https://app.publer.com/api/v1/media',
      '-H', `Authorization: Bearer-API ${apiKey}`,
      '-H', `Publer-Workspace-Id: ${wsId}`,
      '-F', `file=@${pngPath}`
    ], { encoding: 'utf8' });

    const data = JSON.parse(result);
    if (data.id) {
      mediaIds.push(data.id);
      console.log(`   ✓ ${filename} → ${data.id}`);
    } else {
      console.log(`   ✗ ${filename} → ${result.slice(0, 200)}`);
    }
  }

  if (mediaIds.length === 0) throw new Error('No media uploaded');

  // Create carousel post
  const payload = {
    bulk: {
      state: 'scheduled',
      posts: [{
        networks: {
          instagram: {
            type: 'photo',
            text: caption,
            media: mediaIds.map(id => ({ id, type: 'image' }))
          }
        },
        accounts: [{ id: accountId }]
      }]
    }
  };

  const resp = await fetch('https://app.publer.com/api/v1/posts/schedule/publish', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const job = await resp.json();
  console.log(`   ⏳ Job: ${job.job_id}`);

  // Poll for completion
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const statusResp = await fetch(
      `https://app.publer.com/api/v1/job_status/${job.job_id}`,
      { headers }
    );
    const status = await statusResp.json();

    if (status.status === 'complete') {
      const postLink = status.payload?.[0]?.post?.post_link || 'link not available';
      console.log(`   ✓ Опубликовано! ${postLink}`);
      return postLink;
    }
    if (status.status === 'failed') {
      throw new Error(`Publer publish failed: ${JSON.stringify(status)}`);
    }
  }
  throw new Error('Publer publish timeout');
}

// ─── Helpers ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ───
async function main() {
  console.log('🚀 Daily Carousel Generator');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`   Date: ${new Date().toISOString()}\n`);

  if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

  // 1. Generate content
  const content = await generateContent();
  writeFileSync(join(WORK_DIR, 'content.json'), JSON.stringify(content, null, 2));

  // 2. Generate backgrounds
  await generateBackgrounds(content.cards);

  // 3. Build HTML
  const htmlPath = buildHTML(content);

  // 4. Render PNG
  const pngs = await renderPNG(htmlPath, content.cards.length);

  if (DRY_RUN) {
    console.log('\n🏁 DRY RUN завершён. Файлы в ./output/');
    console.log(`   ${pngs.length} карточек готовы к публикации`);
    return;
  }

  // 5. Publish
  const postLink = await publishToInstagram(pngs, content.instagram_caption);
  console.log(`\n🏁 Готово! ${postLink}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
