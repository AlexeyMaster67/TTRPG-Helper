# Инструкция по разработке, синхронизации и публикации релизов TTRPG Helper
> **Назначение:** Единый стандарт и пошаговый регламент для агентов Antigravity и разработчиков.

---

## 🏛️ Архитектура двух репозиториев

| Параметр | Рабочая папка (Dev) | Релизная папка (Public) |
| :--- | :--- | :--- |
| **Путь** | `D:\TTRPG-Helper` *(с дефисом)* | `D:\TTRPGHelper` *(БЕЗ дефиса)* |
| **Git Remote** | `https://github.com/TheZavo/DND-AIT.git` | `git@github.com:AlexeyMaster67/TTRPG-Helper.git` |
| **Протокол Git** | HTTPS (аккаунт `TheZavo`) | SSH (ключ с доступом к `AlexeyMaster67`) |
| **Назначение** | Написание кода, прогон тестов, компиляция бинарников и установщиков. | Публичный открытый репозиторий, откуда пользователи скачивают код и релизы. |

---

## 🛠️ Пошаговый пайплайн

### Шаг 1. Разработка и проверка в Dev-папке
Все изменения исходного кода производятся **строго** в `D:\TTRPG-Helper`.

```powershell
cd D:\TTRPG-Helper

# 1. Прогнать все тесты (все 34 файла / 520+ тестов должны быть зелеными)
npm.cmd test

# 2. Проверить сборку фронтенда (TypeScript + Vite)
npm.cmd run build
```

---

### Шаг 2. Обновление номеров версий
Перед релизом новой версии (например, `2.1.0`) необходимо синхронно обновить номер версии в 3 файлах:
1. `package.json` ➔ `"version": "2.1.0"`
2. `src-tauri/tauri.conf.json` ➔ `"version": "2.1.0"`
3. `src-tauri/Cargo.toml` ➔ `version = "2.1.0"`
*(Если менялся логотип/заголовок, также проверить `src/components/brand/BrandLogo.tsx`).*

---

### Шаг 3. Сборка Windows-инсталлятора (Setup.exe)
Сборка выполняется нативно через Rust + Tauri CLI + MinGW + NSIS:

```powershell
# 1. Настройка окружения компилятора MinGW, Cargo и Node
$env:PATH = "C:\Users\thezavo\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;$env:USERPROFILE\.cargo\bin;C:\Program Files\nodejs;$env:PATH"

cd D:\TTRPG-Helper

# 2. Сборка фронтенда
npm.cmd run build

# 3. Компиляция Tauri-приложения и создание NSIS-инсталлятора
node node_modules/@tauri-apps/cli/tauri.js build -r "$env:USERPROFILE\.cargo\bin\cargo.exe" -c '{\"build\":{\"beforeBuildCommand\":\"\"}}'

# 4. Копирование готового инсталлятора в корень и releases в обоих репозиториях
$builtExe = "D:\TTRPG-Helper\src-tauri\target\release\bundle\nsis\TTRPG Helper_2.1.0_x64-setup.exe"
Copy-Item $builtExe "D:\TTRPG-Helper\TTRPG_Helper_Setup.exe" -Force
Copy-Item $builtExe "D:\TTRPG-Helper\releases\TTRPG_Helper_Setup.exe" -Force
Copy-Item $builtExe "D:\TTRPGHelper\TTRPG_Helper_Setup.exe" -Force
Copy-Item $builtExe "D:\TTRPGHelper\releases\TTRPG_Helper_Setup.exe" -Force

# 5. Расчет контрольной суммы SHA-256
$hash = (Get-FileHash -Algorithm SHA256 "D:\TTRPGHelper\TTRPG_Helper_Setup.exe").Hash
Write-Host "INSTALLER SHA256: $hash"
```

---

### Шаг 4. Синхронизация файлов из Dev в Public (`D:\TTRPGHelper`)

```powershell
# 1. Зеркальная синхронизация исходников (исключая git, node_modules и билд-кэш):
robocopy D:\TTRPG-Helper D:\TTRPGHelper /E /XD .git node_modules src-tauri\target .gemini .system_generated /XF *.log

# 2. Проверка статуса в Public-репозитории:
cd D:\TTRPGHelper
git status

# 3. Прогон тестов в релизной папке для финального подтверждения:
npm.cmd test
```

> [!WARNING]
> **Контроль кодировок имён файлов:**
> Никогда не добавляйте файлы с битой кодировкой CP866/CP1251 (`\342...`). Проверить чистоту индекса:
> `git ls-files | Select-String "\\342"` (должно вернуть 0).

---

### Шаг 5. Коммит и Пуш в оба репозитория

#### 5.1. Пуш в публичный репозиторий (`AlexeyMaster67/TTRPG-Helper`)
```powershell
cd D:\TTRPGHelper
git add .
git commit -m "feat: release v2.1.0 with Worldbuilding and 2D graph"
git push origin main
```
*(Пушится по SSH через ключ `git@github.com:AlexeyMaster67/TTRPG-Helper.git`).*

#### 5.2. Пуш в dev-репозиторий (`TheZavo/DND-AIT`)
```powershell
# Убедиться, что активен аккаунт TheZavo для HTTPS
gh auth switch -u TheZavo

cd D:\TTRPG-Helper
git add .
git commit -m "feat: release v2.1.0 with Worldbuilding and 2D graph"
git push origin main
```

---

### Шаг 6. Публикация и обновление GitHub Release

В системе настроен `gh CLI` с двумя аккаунтами в связке ключей (`TheZavo` и `AlexeyMaster67`).

```powershell
# 1. Переключить gh CLI на аккаунт AlexeyMaster67
gh auth switch -u AlexeyMaster67

cd D:\TTRPGHelper

# 2. Вариант А: Создание НОВОГО релиза:
gh release create v2.1.0 .\TTRPG_Helper_Setup.exe --title "TTRPG Helper v2.1.0 - Worldbuilding & Knowledge Graph" --notes-file release_notes_v210.md

# 2. Вариант Б: Замена / обновление бинарника в СУЩЕСТВУЮЩЕМ релизе:
gh release upload v2.1.0 .\TTRPG_Helper_Setup.exe --clobber

# 3. Обновление текста описания релиза (notes):
gh release edit v2.1.0 --notes-file release_notes_v210.md

# 4. Проверка прикрепленных ассетов и хэша:
gh release view v2.1.0 --json assets,name,tagName

# 5. Возврат активного аккаунта TheZavo для штатной работы с dev-репозиторием:
gh auth switch -u TheZavo
```

---

## ⚠️ Важные правила для агентов (Cheat Sheet)

1. **Разделитель команд PowerShell:** Всегда используйте точку с запятой `;`, а не `&&` (например: `cd D:\TTRPGHelper; git status`).
2. **Исполняемые файлы скриптов:** Из-за политики выполнения PowerShell не запускайте `npx` или `npm` напрямую как `.ps1`. Всегда используйте `npm.cmd`, `npx.cmd` или `node <скрипт>`.
3. **Раздельные Origin:** Никогда не пушьте напрямую из `D:\TTRPG-Helper` в `AlexeyMaster67` или наоборот. Репозитории имеют разные удаленные адреса и разные протоколы (HTTPS vs SSH).
4. **Контрольная сумма в Release Notes:** Перед публикацией всегда вычисляйте реальный SHA-256 собранного `TTRPG_Helper_Setup.exe` и вставляйте его в описание релиза.
5. **Проверка авторизации gh CLI:** Перед выполнением команд `gh release` для `AlexeyMaster67/TTRPG-Helper` обязательно проверяйте активный аккаунт через `gh auth status` и переключайте на `AlexeyMaster67` через `gh auth switch -u AlexeyMaster67`.
