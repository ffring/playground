# Поиск аномалий через Apify

Как искать ролики, которые залетели у небольших блогеров, по ключевому слову/хештегу. Не "видео с миллионом просмотров", а **"у автора 3к подписчиков, обычно 200 просмотров — а тут 500к"**. Это и есть свежие виральные форматы до того, как их подхватили крупные.

---

## Что считаем аномалией

### 3 формулы для скоринга

**1. Performance Score (главный)** — соотношение просмотров к подписчикам:
```
PS = views / followers
```
- < 0.5 — норма
- 1–5 — хороший пост
- **5–20 — потенциально вирусный**
- **> 20 — жёсткая аномалия, копируй формат**

**2. Outlier Score (z-score внутри автора)** — насколько ролик выбивается из его же базы:
```
z = (views - μ_author) / σ_author
```
- μ — средние просмотры автора по последним 20 постам
- z > 3 = аномалия, z > 5 = взрыв

**3. Engagement Quality** — фильтр от накруток:
```
EQ = (likes + comments*5 + shares*10) / views
```
- Комменты × 5, шеры × 10 (труднее накрутить, сильнее сигнал)
- Нормальный EQ = 0.05–0.15. Если меньше 0.02 при больших просмотрах — накрутка, фильтруй.

**Финальный rank**:
```
score = PS × log10(views) × EQ
```
Отсекает и тех, кто уже большой (низкий PS), и тех, у кого 50 просмотров от 5 подписчиков (низкий log).

---

## Pipeline на Apify

### Шаг 1. Тянем посты по ключу/хештегу

Лучшие акторы для TikTok:

| Актор | Цена | Особенности |
|---|---|---|
| [clockworks/tiktok-hashtag-scraper](https://apify.com/clockworks/tiktok-hashtag-scraper) | $0.005/видео | **Топ выбор**: 99.7% success rate, 11.8k юзеров. Видео + likes/views + creator data в одном запросе. |
| [novi/multiple-tiktok-hashtag-scraper](https://apify.com/novi/multiple-tiktok-hashtag-scraper) | $0.001/видео | Дешевле в 5 раз, мультихештеги |
| [scrape-creators/best-tiktok-hashtag-scraper](https://apify.com/scrape-creators/best-tiktok-hashtag-scraper) | $0.001/видео | Альтернатива |

Для других платформ:
- **Reels/IG** — `apify/instagram-hashtag-scraper`
- **YT Shorts** — `apidojo/youtube-scraper` с фильтром по длине < 60 сек

**Ключевой момент**: `clockworks/tiktok-hashtag-scraper` возвращает в одном вызове и метрики ролика, и `authorMeta.fans` (подписчики автора), и `authorMeta.heart` (общий счёт лайков). Не нужен второй запрос за автором — сразу есть всё для расчёта PS.

### Шаг 2. Считаем PS и фильтруем

```python
import math
from apify_client import ApifyClient

client = ApifyClient("APIFY_TOKEN")

run = client.actor("clockworks/tiktok-hashtag-scraper").call(run_input={
    "hashtags": ["вайбкодинг", "нейросети"],
    "resultsPerPage": 500,
    "shouldDownloadVideos": False
})

anomalies = []
for v in client.dataset(run["defaultDatasetId"]).iterate_items():
    followers = v["authorMeta"]["fans"]
    views = v["playCount"]

    # Отсекаем шум
    if followers < 100 or views < 10_000:
        continue

    ps = views / followers
    eq = (v["diggCount"] + v["commentCount"]*5 + v["shareCount"]*10) / views

    if ps > 5 and eq > 0.03:
        anomalies.append({
            "url": v["webVideoUrl"],
            "author": v["authorMeta"]["name"],
            "followers": followers,
            "views": views,
            "ps": ps,
            "eq": eq,
            "score": ps * math.log10(views) * eq
        })

anomalies.sort(key=lambda x: -x["score"])
```

### Шаг 3. (опционально) Z-score по автору

Если нужна жёсткая фильтрация — для каждого автора-аномалии второй вызов на актор профиля (`clockworks/tiktok-scraper` по `profile`), берёшь его последние 20 роликов, считаешь μ и σ, проверяешь z > 3. Так отсеешь авторов, у которых **каждый второй** пост залетает — это уже не аномалия, у них сложился формат и они его серийно эксплуатируют.

### Шаг 4. Свежесть

Дополнительный фильтр: `createTimeISO < 72 часа назад`. Аномалия имеет смысл только пока тренд горячий — нашёл, скопировал, выпустил, обогнал. Через неделю это уже эхо.

---

## Production-схема (cron)

**Запускай актор каждые 6 часов** на 10–20 хештегах твоей ниши. Складывай снимки в Postgres/Sheets. Главная фишка не в одном запуске, а в **сравнении со снимками** — видишь не просто "у видео 500k просмотров", а "за 6 часов набрало 200к, ускорение растёт". Это и есть `velocity` и `acceleration` из общих формул виральности.

Простейшая схема в Google Sheets:
- **Лист 1: snapshots** — актор пишет append каждые 6 ч
- **Лист 2: deltas** — формулой считает Δviews за интервал, сортирует по `PS × velocity`
- **Лист 3: alerts** — Apps Script кидает в Telegram если `score > threshold`

### Cron на Apify Schedule

В Apify Console → Schedules → Create:
- Cron: `0 */6 * * *` (каждые 6 часов)
- Actor: `clockworks/tiktok-hashtag-scraper`
- Input: твой набор хештегов
- Webhook: на свой эндпоинт, который дальше считает score и пишет в БД

---

## Чек-лист параметров для аномалии

| Условие | Порог |
|---|---|
| `views / followers` | > 5 (мягкий) / > 20 (жёсткий) |
| `views` минимум | 10 000 (отсекаем шум) |
| `followers` минимум | 100 (не учитываем мёртвые акки) |
| `EQ` (engagement quality) | > 0.03 (защита от накруток) |
| `z-score` против автора | > 3 |
| Свежесть | < 72 ч |
| Comments/views | > 0.005 (живая дискуссия) |

Только пересечение всех этих фильтров = настоящая аномалия, которую стоит копировать.
