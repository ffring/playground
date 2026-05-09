# Viral Content & Trend Detection — арсенал

Подборка опенсорс-решений и формул для детекции трендов и виральности контента в соцсетях. Собрано 2026-05-09.

---

## Часть 1. GitHub-репозитории

### TikTok (главный приоритет — самые ломкие, самые хайповые)

| Репо | Что | Звёзды | Статус |
|---|---|---|---|
| [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API) | Async REST API: видео, юзеры, hashtag/trending feed | 17.7k | ✅ 2026 |
| [drawrowfly/tiktok-scraper](https://github.com/drawrowfly/tiktok-scraper) | Trending + hashtag метрики, music feed | 5.1k | ✅ |
| [bellingcat/tiktok-hashtag-analysis](https://github.com/bellingcat/tiktok-hashtag-analysis) | Co-occurrence графы хештегов от Bellingcat | 360 | ✅ |
| [omkarcloud/tiktok-scraper](https://github.com/omkarcloud/tiktok-scraper) | Trending по странам, watermark-free | — | ✅ |
| [isaackogan/TikTokLive](https://github.com/isaackogan/TikTokLive) | Реалтайм live-метрики стримов | 1.4k | ✅ |

### Twitter/X (после закрытия API всё через скрейп)

| Репо | Что | Звёзды |
|---|---|---|
| [d60/twikit](https://github.com/d60/twikit) | Без API-ключа, через внутренний Twitter API | 4.4k |
| [vladkens/twscrape](https://github.com/vladkens/twscrape) | Мульти-аккаунты, ротация, прокси | 2.4k |
| [Altimis/Scweet](https://github.com/Altimis/Scweet) | Async, прокси, без API | 1.5k |
| [x0rz/tweets_analyzer](https://github.com/x0rz/tweets_analyzer) | Не скрейпер — аналитик: когда твитит, частоты, hashtag | 3k |
| [twitter/the-algorithm](https://github.com/twitter/the-algorithm) | **Официальные веса Heavy Ranker** (см. формулы ниже) | 63k |

### Instagram

- [postaddictme/instagram-php-scraper](https://github.com/postaddictme/instagram-php-scraper) — 3.3k, PHP
- [drawrowfly/instagram-scraper](https://github.com/drawrowfly/instagram-scraper) — hashtag, locations, лайкеры без логина
- [huaying/instagram-crawler](https://github.com/huaying/instagram-crawler) — посты, hashtag

### YouTube / Shorts

- [mitchelljy/Trending-YouTube-Scraper](https://github.com/mitchelljy/Trending-YouTube-Scraper) — trending по странам
- [LhanaAI/youtube-shorts-scraper](https://github.com/LhanaAI/youtube-shorts-scraper) — заточен под Shorts viral patterns
- [gdemos01/yttresearch-machine-learning-algorithms-analysis](https://github.com/gdemos01/yttresearch-machine-learning-algorithms-analysis) — ML-алгоритмы предсказания популярности

### Reddit / HN / агрегаторы

- [LayorX/WorldTrendScraper](https://github.com/LayorX/WorldTrendScraper) — Google Trends + BBC + Reddit + PTT в одном дашборде
- [aryanraokulkarni03-a11y/vibecodingscraper](https://github.com/aryanraokulkarni03-a11y/vibecodingscraper) — AI-trend scraper Reddit + Bluesky + HN с Gemini-оценкой
- [knguyenngo/reddit-trending-topics](https://github.com/knguyenngo/reddit-trending-topics) — full-stack визуализация Reddit-обсуждений

### Telegram (для нашего рынка — критично)

- [hamodywe/telegram-scraper-TeleGraphite](https://github.com/hamodywe/telegram-scraper-TeleGraphite) — быстрый скрейпер каналов
- [thomasjjj/tg-keyword-trends](https://github.com/thomasjjj/tg-keyword-trends) — поиск по ключевым словам в подписках, **прям про trend detection в TG**
- [edogab33/telegram-groups-crawler](https://github.com/edogab33/telegram-groups-crawler) — автопоиск групп
- [Steelio/Telegram-Post-Scraper](https://github.com/Steelio/Telegram-Post-Scraper) — через HTTP, обходит ToS-ограничения selfbot

### Trend detection и ML-предикторы виральности

- [xdevplatform/Gnip-Trend-Detection](https://github.com/xdevplatform/Gnip-Trend-Detection) — **классика от Twitter Inc**, time-series алгоритмы
- [snikolov/rumor](https://github.com/snikolov/rumor) — непараметрическая классификация трендов (MIT MEng thesis)
- [juanls1/TikTok-Virality-Predictor](https://github.com/juanls1/TikTok-Virality-Predictor) — DL-модель для TikTok
- [harbarex/tiktok-virality-prediction](https://github.com/harbarex/tiktok-virality-prediction) — ViViT (Video Vision Transformer)
- [nimathing2052/TikTok_MultiModal_Virality_Prediction](https://github.com/nimathing2052/TikTok_MultiModal_Virality_Prediction) — **самый современный**: Whisper + CLIP + GPT-4V + текст + метаданные

### End-to-end платформы

- **[obsei/obsei](https://github.com/obsei/obsei)** — самый серьёзный listening-pipeline. Observer → Analyzer → Informer (Slack/email/DB). Бери если хочешь готовую трубу.
- [huginn/huginn](https://github.com/huginn/huginn) — 49k, "IFTTT на стероидах" для своего listening-стека
- **[sokomishalov/skraper](https://github.com/sokomishalov/skraper)** — универсальный: FB, IG, X, YT, TikTok, TG, Reddit, **VK, ОК, Pikabu** (для нас уникален)

---

## Часть 2. Формулы виральности

### Базовые (универсальные)

**K-factor (вирусный коэффициент)**
```
K = i × c
```
- `i` — приглашений на юзера, `c` — конверсия в нового
- Порог: K > 1 = экспоненциальный рост, K = 1 — линейный, < 0.5 — мёртв

**Engagement Rate by Reach (ERR) — главная для Telegram/Reels**
```
ERR = (Reactions + Comments + Shares) / Reach × 100%
```
- Telegram норма: 25–30% для канала >500 подписчиков

**Velocity (скорость) — лучший ранний сигнал**
```
V = ΔEngagements / Δt
```
- Порог: `V_1h > μ + 2σ` от среднего канала = viral candidate

**Acceleration (вторая производная) — пик решает «масштабировать?»**
```
a = (V₂ - V₁) / Δt
```
- Пик ускорения обычно в первые 15–60 минут

### TikTok — leaked algorithm (NYT, дек 2021)
```
Score = P_like·V_like + P_comment·V_comment + E_playtime·V_playtime + P_play·V_play
```
- Иерархия весов 2025: **shares > comments > saves > likes**
- **Completion Rate ≥ 60%** = шанс попасть в FYP
- **Shares/Views > 1%** = почти гарантия
- Первичный тест на 100–500 юзерах в первые 3 часа

### YouTube Shorts
```
APV = AVD / Video_Length × 100%        # ≥80% для роликов <60 сек
SAR = Swipes_first_seconds / Impressions  # порог 20-25%
```
- CTR не считается (autoplay). Оптимизация — «satisfaction per swipe»

### Instagram Reels (2025)
```
ER_reels = (Likes + Comments + Shares + Saves) / Plays × 100%
Save_Rate = Saves / Reach    # >2% — сильный пост
```
- IG в 2025 уравнял веса saves/shares с likes/comments

### Twitter/X — Heavy Ranker (опенсорс веса)
```
Score = 1·L + 20·RT + 13.5·R + 12·PC + 11·LC + 10·B
```
- L=likes, RT=retweets, R=replies, PC=profile clicks, LC=link clicks, B=bookmarks
- **Reply с ответом автора оригинала ≈ 75 retweets** (multiplier)

### Reddit Hot
```
score = sign(s)·log₁₀(max(|s|,1)) + (t - 1134028003) / 45000
```
- Логарифм гасит насыщение голосов, 45000 сек ≈ 12.5 ч "полураспад"

### Hacker News
```
Score = (P - 1) / (T + 2)^G
```
- P = points, T = часы, G = gravity (1.8 default)

### Telegram (наш рынок)
```
Forward_Rate = Forwards / Views × 100%        # пересылка = единственный органический канал
ΔSub_per_post = Subs_after - Subs_before      # >15% месячного прироста = нашёл viral formula
```

### Универсальные виральные метрики
```
Virality_Rate (Hootsuite) = Shares / Impressions × 100%
Amplification_Rate (Sprout) = Shares / Followers × 100%
Shares_to_Views (TikTok) = Shares / Views      # >1% хорошо, >2% viral
```

### ML-фичи для предсказания (по силе сигнала)

1. **Раннее поведение**: velocity на 5/15/60 мин — самые мощные предикторы
2. **Author**: followers, prior virality rate, account age, verified
3. **Контент**: длина, sentiment, emoji, embeddings (BERT)
4. **Тайминг**: час, день недели, recency
5. **Network**: in-degree, betweenness в авторской community

NYU Botelho даёт F1 ≈ 0.8 на классификации top-1% к 13–17 часу жизни поста, используя Momentary engagement → Velocity → Acceleration.

### Cheat sheet порогов

| Метрика | Платформа | Viral threshold |
|---|---|---|
| K-factor | Любая | >1 |
| Completion Rate | TikTok | ≥60% |
| Shares/Views | TikTok | >1–2% |
| APV | YT Shorts | ≥80% |
| Save Rate | Instagram | >2% |
| ERR | Telegram | 25–30% |
| First-hour velocity | Любая | >μ+2σ |

---

## Что делать дальше

1. **Для Plaan.ai (мониторинг трендов в ИИ)**: связка `obsei` + `vibecodingscraper` (HN+Reddit+Bluesky про AI) + кастомный TG-скрейпер на `tg-keyword-trends`. На выходе — daily-дайджест "что хайпует в ИИ".
2. **Для контент-движка (что снимать в Reels/Shorts)**: `sokomishalov/skraper` для VK + `Evil0ctal` для TikTok → собираешь топ-постов в нише за 24 часа → фильтруешь по `Velocity > μ+2σ` и `STV > 1%` → получаешь **виральные форматы до того, как все скопировали**.
3. **Для оценки своих постов**: считай `velocity` в первый час против исторической базы канала. Если выше 2σ — пушь рекламой/кросспостами. Если нет — не трать бюджет.

Главный сигнал во всех платформах одинаковый: **первый час, скорость, ускорение**. Всё остальное — обвес.

---

## Источники формул

- [Viral Coefficient | WallStreetPrep](https://www.wallstreetprep.com/knowledge/viral-coefficient/)
- [K-factor | First Round Review](https://review.firstround.com/glossary/k-factor-virality/)
- [Reddit ranking algorithms | Salihefendic](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9)
- [Deriving the Reddit Formula | Evan Miller](https://www.evanmiller.org/deriving-the-reddit-formula.html)
- [How Hacker News ranking works | Medium](https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d)
- [Twitter's Recommendation Algorithm | X Engineering](https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm)
- [Leaked TikTok 'Algo 101' | DeepLearning.AI](https://www.deeplearning.ai/the-batch/what-makes-tiktok-tick/)
- [TikTok Algorithm Guide 2026 | Buffer](https://buffer.com/resources/tiktok-algorithm/)
- [YouTube Shorts Algorithm 2026 | Shortimize](https://www.shortimize.com/blog/how-does-youtube-shorts-algorithm-work)
- [Instagram Engagement Benchmarks 2026 | SocialInsider](https://www.socialinsider.io/social-media-benchmarks/instagram)
- [Predicting Virality | NYU Cybersecurity](https://medium.com/cybersecurity-for-democracy/predicting-virality-how-soon-can-we-tell-dc153a98774f)
- [ViralBERT | arXiv 2206.10298](https://arxiv.org/pdf/2206.10298)
- [ViralGCN | MDPI](https://www.mdpi.com/2227-7390/11/14/3059)
- [Characterizing and Predicting Viral Video Content | CIKM'15](https://shlomo-berkovsky.github.io/files/pdf/CIKM15.pdf)
