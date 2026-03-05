"""
Модуль получения транскрипций YouTube видео.
Использует youtube-transcript-api для извлечения субтитров.
"""
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter


def get_transcript(video_id: str) -> str | None:
    """
    Получает транскрипцию видео.
    Пробует: английские субтитры → авто-сгенерированные → любые доступные.

    Returns:
        Текст транскрипции или None если субтитров нет.
    """
    ytt_api = YouTubeTranscriptApi()
    formatter = TextFormatter()

    try:
        # Пробуем получить английские субтитры (ручные или авто)
        transcript = ytt_api.fetch(video_id, languages=["en"])
        return formatter.format_transcript(transcript)
    except Exception:
        pass

    try:
        # Пробуем любые доступные субтитры
        transcript_list = ytt_api.list(video_id)
        # Берём первый доступный
        first = next(iter(transcript_list))
        transcript = ytt_api.fetch(video_id, languages=[first.language_code])
        return formatter.format_transcript(transcript)
    except Exception as e:
        print(f"  Не удалось получить транскрипцию для {video_id}: {e}")
        return None


if __name__ == "__main__":
    # Тест на свежем видео Greg Isenberg
    test_id = "l-J8RodcM_A"
    print(f"Тестируем транскрипцию для video_id={test_id}...")
    text = get_transcript(test_id)
    if text:
        print(f"Получено {len(text)} символов")
        print(f"Первые 500 символов:\n{text[:500]}")
    else:
        print("Транскрипция не найдена")
