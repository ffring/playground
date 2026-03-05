"""
Парсер RSS фидов YouTube каналов.
Получает список свежих видео с каждого канала.
"""
import json
import feedparser
from datetime import datetime
from config import CHANNELS, RSS_URL_TEMPLATE, MAX_VIDEOS_PER_CHANNEL, PROCESSED_FILE


def load_processed() -> set:
    """Загружает множество уже обработанных video_id."""
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE, "r") as f:
            return set(json.load(f))
    return set()


def save_processed(processed: set):
    """Сохраняет множество обработанных video_id."""
    PROCESSED_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED_FILE, "w") as f:
        json.dump(list(processed), f, indent=2)


def mark_as_processed(video_id: str):
    """Добавляет video_id в список обработанных."""
    processed = load_processed()
    processed.add(video_id)
    save_processed(processed)


def get_new_videos() -> list[dict]:
    """
    Проверяет RSS всех каналов и возвращает новые (необработанные) видео.

    Returns:
        Список словарей с ключами: video_id, title, url, channel, published
    """
    processed = load_processed()
    new_videos = []

    for channel_name, channel_id in CHANNELS.items():
        url = RSS_URL_TEMPLATE.format(channel_id=channel_id)
        feed = feedparser.parse(url)

        for entry in feed.entries[:MAX_VIDEOS_PER_CHANNEL]:
            video_id = entry.yt_videoid
            if video_id in processed:
                continue

            new_videos.append({
                "video_id": video_id,
                "title": entry.title,
                "url": entry.link,
                "channel": channel_name,
                "published": entry.published,
            })

    # Сортируем по дате (свежие первые)
    new_videos.sort(key=lambda v: v["published"], reverse=True)
    return new_videos


if __name__ == "__main__":
    videos = get_new_videos()
    print(f"Найдено {len(videos)} новых видео:\n")
    for v in videos:
        print(f"  [{v['channel']}] {v['title']}")
        print(f"    {v['url']}")
        print(f"    {v['published']}\n")
