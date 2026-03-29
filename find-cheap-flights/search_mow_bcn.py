#!/usr/bin/env python3
"""
Поиск дешёвых авиабилетов Москва → Барселона на конец мая — начало июня 2026.

Использует библиотеку fli (github.com/punitarani/fli) для поиска через Google Flights API.

Установка:
    pip install flights

Запуск:
    python search_mow_bcn.py
"""

import subprocess
import sys
import json


def run_fli_command(args: list[str]) -> str:
    """Run fli CLI command and return output."""
    result = subprocess.run(["fli"] + args, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        return ""
    return result.stdout


def main():
    # Московские аэропорты
    moscow_airports = ["SVO", "DME", "VKO"]
    destination = "BCN"

    print("=" * 70)
    print("Поиск дешёвых рейсов: Москва → Барселона")
    print("Период: 20 мая — 10 июня 2026")
    print("Длительность поездки: 7 дней (туда-обратно)")
    print("=" * 70)

    # 1. Поиск самых дешёвых дат (туда-обратно, 7 дней)
    print("\n📅 ПОИСК ДЕШЁВЫХ ДАТ (туда-обратно, 7 дней)")
    print("-" * 50)

    for airport in moscow_airports:
        print(f"\n🛫 Из {airport}:")
        args = [
            "dates", airport, destination,
            "--from", "2026-05-20",
            "--to", "2026-06-10",
            "-d", "7",
            "-R",               # round-trip
            "-s", "1",          # max 1 stop
            "--sort",           # sort by price
            "--format", "text",
        ]
        output = run_fli_command(args)
        if output:
            print(output)
        else:
            print("  Нет результатов или ошибка")

    # 2. Поиск конкретных рейсов на лучшие даты
    best_dates = [
        "2026-05-22",  # пятница
        "2026-05-25",  # понедельник
        "2026-05-29",  # пятница
        "2026-06-01",  # понедельник
        "2026-06-05",  # пятница
    ]

    print("\n\n✈️  КОНКРЕТНЫЕ РЕЙСЫ НА КЛЮЧЕВЫЕ ДАТЫ")
    print("-" * 50)

    for airport in moscow_airports:
        for date in best_dates:
            print(f"\n🛫 {airport} → {destination} | {date}:")
            args = [
                "flights", airport, destination,
                "--date", date,
                "--return", f"2026-06-{int(date.split('-')[2]) + 7:02d}" if date.startswith("2026-05") else date,
                "-s", "1",          # max 1 stop
                "--sort", "CHEAPEST",
                "--format", "text",
            ]
            output = run_fli_command(args)
            if output:
                # Show top 5 results
                lines = output.strip().split("\n")
                for line in lines[:30]:
                    print(f"  {line}")
                if len(lines) > 30:
                    print(f"  ... и ещё {len(lines) - 30} вариантов")
            else:
                print("  Нет результатов или ошибка")

    # 3. Поиск в одну сторону (самые дешёвые)
    print("\n\n💰 САМЫЕ ДЕШЁВЫЕ В ОДНУ СТОРОНУ")
    print("-" * 50)

    for airport in moscow_airports:
        print(f"\n🛫 Из {airport}:")
        args = [
            "dates", airport, destination,
            "--from", "2026-05-20",
            "--to", "2026-06-10",
            "-s", "1",
            "--sort",
            "--format", "text",
        ]
        output = run_fli_command(args)
        if output:
            print(output)
        else:
            print("  Нет результатов или ошибка")

    print("\n" + "=" * 70)
    print("Совет: откройте Google Flights для актуальных цен:")
    print("  https://www.google.com/travel/flights?q=flights+from+Moscow+to+Barcelona+May+2026")
    print("=" * 70)


if __name__ == "__main__":
    main()
