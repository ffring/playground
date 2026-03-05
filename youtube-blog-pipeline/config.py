"""
Конфигурация YouTube Blog Pipeline
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Директории
BASE_DIR = Path(__file__).parent

load_dotenv(BASE_DIR / ".env", override=True)
OUTPUT_DIR = BASE_DIR / "output"
DATA_DIR = BASE_DIR / "data"
PROCESSED_FILE = DATA_DIR / "processed_videos.json"

# YouTube каналы: name -> channel_id
CHANNELS = {
    "Greg Isenberg": "UCPjNBjflYl0-HQtUvOx0Ibw",
    "Matt Wolfe": "UChpleBmo18P08aKCIgti38g",
    "AI Jason": "UCrXSVX9a1mj8l0CMLwKgMVw",
    "TheAIGRID": "UCbY9xX3_jW5c2fjlZVBI4cg",
    "Two Minute Papers": "UCbfYPyITQ-7l4upoX8nvctg",
    "Y Combinator": "UCcefcZRL2oaA_uBNeo5UOWg",
    "My First Million": "UCyaN6mg5u8Cjy2ZI4ikWaug",
    "Lenny's Podcast": "UC6t1O76G0jYXOAoYCm153dA",
    "Fireship": "UCsBjURrPoezykLs9EqgamOA",
    "Theo - t3.gg": "UCbRP3c757lWg9M-U7TyEkXA",
    "ThePrimeagen": "UC8ENHE5xdFSwx71u3fDH5Xw",
    "GaryVee": "UCctXZhXmG-kf3tlIXgVZUlw",
    "Alex Hormozi": "UCUyDOdBWhC1MCxEjC46d-zw",
    "Noah Kagan": "UCF2v8v8te3_u4xhIQ8tGy1g",
}

# RSS feed шаблон
RSS_URL_TEMPLATE = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

# Сколько последних видео проверять с каждого канала (RSS отдаёт до 15)
MAX_VIDEOS_PER_CHANNEL = 5

# Claude API
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"  # Sonnet — быстро и дёшево

# Язык статей
TARGET_LANGUAGE = "ru"
