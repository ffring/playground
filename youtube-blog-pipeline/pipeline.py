#!/usr/bin/env python3
"""
YouTube Blog Pipeline — главный скрипт.

Полный цикл:
1. Проверяет RSS каналов на новые видео
2. Получает транскрипции
3. Генерирует SEO/GEO-статьи через Claude
4. Сохраняет результат: JSON (данные) + MDX (для блога)

Запуск: python3 pipeline.py [количество] [--dry] [--publish]
"""
import json
import sys
import shutil
from datetime import datetime
from pathlib import Path

from config import OUTPUT_DIR
from parser_rss import get_new_videos, mark_as_processed
from transcriber import get_transcript
from article_generator import generate_article

# Путь к блогу для автопубликации
BLOG_CONTENT_DIR = Path.home() / "projects" / "ai-blog" / "src" / "content" / "blog"


def save_article(article: dict, video: dict, publish: bool = False):
    """Сохраняет статью в JSON + MDX файлы."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    slug = article.get("slug", video["video_id"])
    base_name = f"{date_str}-{slug}"

    # --- JSON (полные данные для аналитики) ---
    json_path = OUTPUT_DIR / f"{base_name}.json"
    full_data = {
        **article,
        "_source": {
            "video_id": video["video_id"],
            "title": video["title"],
            "url": video["url"],
            "channel": video["channel"],
            "published": video["published"],
        },
        "_generated_at": datetime.now().isoformat(),
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)

    # --- MDX (для блога Синапс) ---
    tags_yaml = json.dumps(article.get("tags", []), ensure_ascii=False)
    faq_mdx = ""
    if article.get("faq"):
        faq_mdx = "\n## FAQ\n"
        for q in article["faq"]:
            faq_mdx += f"\n### {q['question']}\n\n{q['answer']}\n"

    mdx_content = f"""---
title: "{article.get('h1', '').replace('"', '\\"')}"
description: "{article.get('meta_description', '').replace('"', '\\"')}"
date: {date_str}
tags: {tags_yaml}
---

{article.get('content_mdx', '')}
{faq_mdx}"""

    mdx_path = OUTPUT_DIR / f"{base_name}.mdx"
    with open(mdx_path, "w", encoding="utf-8") as f:
        f.write(mdx_content)

    # --- Автопубликация в блог ---
    if publish and BLOG_CONTENT_DIR.exists():
        blog_mdx_path = BLOG_CONTENT_DIR / f"{slug}.mdx"
        shutil.copy2(mdx_path, blog_mdx_path)
        print(f"  📤 Опубликовано: {blog_mdx_path}")

    return json_path, mdx_path


def run(limit: int = 3, dry_run: bool = False, publish: bool = False):
    """
    Запускает пайплайн.

    Args:
        limit: Максимум видео за один запуск
        dry_run: Только показывает видео, не генерирует статьи
        publish: Копирует MDX в папку блога
    """
    print("=" * 60)
    print("Синапс — YouTube Blog Pipeline")
    print("=" * 60)

    # 1. Получаем новые видео
    print("\n[1/3] Проверяю RSS каналов...")
    videos = get_new_videos()
    print(f"  Найдено {len(videos)} новых видео")

    if not videos:
        print("\n  Нет новых видео. Выход.")
        return

    if dry_run:
        print("\n  DRY RUN — только список:")
        for v in videos[:limit]:
            print(f"    - [{v['channel']}] {v['title']}")
        return

    processed_count = 0
    for video in videos[:limit]:
        print(f"\n{'─' * 60}")
        print(f"📺 {video['title']}")
        print(f"   {video['channel']} | {video['url']}")

        # 2. Получаем транскрипцию
        print("\n  [2/3] Транскрипция...")
        transcript = get_transcript(video["video_id"])
        if not transcript:
            print("  ⏭ ПРОПУСК: транскрипция недоступна")
            mark_as_processed(video["video_id"])
            continue
        print(f"  ✓ {len(transcript):,} символов")

        # 3. Генерируем статью
        print("\n  [3/3] Генерация статьи...")
        article = generate_article(video["title"], transcript, video["channel"])
        if not article:
            print("  ❌ Не удалось сгенерировать")
            continue

        # 4. Сохраняем
        json_path, mdx_path = save_article(article, video, publish=publish)
        mark_as_processed(video["video_id"])
        processed_count += 1

        print(f"\n  ✅ {article.get('h1', 'N/A')}")
        print(f"     JSON: {json_path}")
        print(f"     MDX:  {mdx_path}")

    print(f"\n{'=' * 60}")
    print(f"Готово: {processed_count}/{len(videos[:limit])}")
    print(f"Файлы: {OUTPUT_DIR}/")
    if publish:
        print(f"Блог:  {BLOG_CONTENT_DIR}/")


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    pub = "--publish" in sys.argv

    limit = 1  # По умолчанию 1 видео
    for arg in sys.argv[1:]:
        if arg.isdigit():
            limit = int(arg)

    run(limit=limit, dry_run=dry, publish=pub)
