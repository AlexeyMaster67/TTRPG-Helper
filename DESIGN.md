---
name: "TTRPG Helper — Obsidian & Gold"
version: "2.0.0"
theme: "Swiss Glassmorphism & Tactical Dark"
colors:
  canvas: "#090b10"
  surface: "rgba(18, 22, 30, 0.78)"
  card: "rgba(24, 29, 40, 0.65)"
  card-hover: "rgba(33, 40, 56, 0.85)"
  card-active: "rgba(41, 50, 70, 0.95)"
  border-glass: "rgba(255, 255, 255, 0.08)"
  accent:
    primary: "#f5b920"
    hover: "#fac742"
    active: "#e0a312"
    subtle: "rgba(245, 185, 32, 0.12)"
    glow: "rgba(245, 185, 32, 0.28)"
    text: "#0c0d12"
  semantic:
    damage: "#e5484d"
    heal: "#3dd68c"
    save: "#4f9cf9"
    magic: "#8b5cf6"
    warning: "#f59e0b"
  text:
    primary: "#f3f4f6"
    secondary: "#9ca3af"
    muted: "#6b7280"
    gold-light: "#fce79f"
typography:
  fontFamily:
    sans: "Manrope, Inter, system-ui, sans-serif"
    serif: "'Cinzel Decorative', Georgia, serif"
    mono: "'JetBrains Mono', monospace"
  fontSize:
    xs: "11px"
    sm: "12px"
    base: "13px"
    lg: "15px"
    xl: "18px"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
---

# TTRPG Helper: Design System (DESIGN.md)

## 1. Overview & Aesthetic Intent
Tactical DM cockpit combining **Swiss Editorial Grid** with **Dark Glassmorphism** (Obsidian & Gold).
- **High Information Density**: DM must view at least 8–12 combatants and full creature statblocks without scrolling or nested modal dialogs.
- **Strict Color Semantics**: Gold for current turn / tactical focus; Emerald for HP / Healing; Crimson for Damage / Bosses / Criticals; Sapphire for Saves.
- **Hardware-Accelerated Zero-Flicker**: All backdrops use subtle glass blur (`backdrop-blur-md`), dark slate alpha layers (`rgba(18, 22, 30, 0.78)`), and ultra-crisp 1px borders (`rgba(255, 255, 255, 0.08)`).

---

## 2. Desktop Workspace Architecture (3-Island Grid)

On PC / Desktop in Combat Mode, the application divides into 3 independent glass islands:

```
+---------------------------------------------------------------------------------------------------+
|  HEADER: [Logo] [Бой|Карта|Сплит] [Поиск Ctrl+K]   [Отряд] [Добыча] ... [Настройки] [Экран игроков]|
+----------------------------+------------------------------------------+---------------------------+
| 1. БЕСТИАРИЙ               | 2. РОСТЕР ИНИЦИАТИВЫ                     | 3. СТАТБЛОК / ИНСПЕКТОР   |
| (w-80 xl:w-[340px]         | (flex-1 min-w-[700px])                   | (w-[420px] fixed)         |
| 2xl:w-[360px])             |                                          |                           |
|                            | - Текущий ход (Gold Glass)               | - Живые статы, КД, ОЗ     |
| - Шапка: Бестиарий [100]   | - Очередь раунда (Card Rows)             | - 6 характеристик         |
| - Поиск & Папки            | - Быстрые действия: Урон, Спас, Атака   | - Действия и Атаки        |
| - Аккуратные 2-строчные    |                                          | - Лог d20 кубиков         |
|   карточки монстров        |                                          |                           |
+----------------------------+------------------------------------------+---------------------------+
```

---

## 3. Bestiary Library Layout Rules
- **Header Line**: Title `Бестиарий` must never be truncated. It uses `whitespace-nowrap` alongside a count badge (`[100]`) and compact action buttons (`+ Своё`, `+ Файл`).
- **Creature Cards (Fixed 2-Line Structure)**:
  - **Line 1**: Creature Name (`truncate flex-1 min-w-0`), custom badge (`✦ Своё`), and CR badge (`КО {cr}`, `shrink-0 whitespace-nowrap`). **Never wrap CR to a 3rd line**.
  - **Line 2**: Creature Type (`truncate max-w-[100px]`), AC badge (`Shield` + `{ac} КД`), and HP badge (`{hp} ОЗ`).
  - **Actions**: Action buttons (Folder, Clone, Add `+`) must remain aligned on the right with fixed sizes (`w-7 h-7 rounded-full`).

---

## 4. Header & Navigation Principles
- **No Mobile Switcher on PC**: The PC desktop application does not render a "Мобильный вид" button in the main navigation. The mobile view is reserved strictly for real mobile devices (`< 768px`) and the Android Companion app.
- **Search Bar Resilience**: The global search bar (`Ctrl+K`) must have `min-w-[180px]` and `hidden lg:flex` so that flexbox never crushes it down to a 0px broken element.
- **Master Tools**: Header tools (`Отряд`, `Добыча`, `Раздатки`, `Сражения`, `Аудио`, `Правила`, `NPC`, `Орда`, `Кузница`, `Настройки`) are enclosed in pill-containers with crisp hover states.

---

## 5. Components & Micro-interactions

### 5.1 Buttons
- **Primary / CTAs**: Amber gradient `from-amber-500 to-amber-600` with dark text `#0c0d12` and gold glow `shadow-[0_0_14px_rgba(245,185,32,0.4)]`.
- **Destructive / Boss**: Crimson `bg-gradient-to-r from-[#7a2016] to-[#991b1b] border border-red-500/50`.
- **Secondary / Ghost**: `bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] text-gray-200`.

### 5.2 Modals
- Fixed centered overlays with backdrop blur `backdrop-blur-md bg-black/60`.
- Border `border border-[rgba(255,255,255,0.12)]` with rounded `rounded-glass-xl`.
- Global `Escape` keyboard dismissal and input isolation (`data-hotkey-ignore`).

---

## 6. Do's & Don'ts for AI Agents

### DO:
- **DO** use `min-w-0` alongside `truncate` on text elements inside flex containers to prevent layout blowing out.
- **DO** preserve strict single-line headers and 2-line cards inside Bestiary and Combat Roster.
- **DO** verify all test suites via Puppeteer at 1920×1080 and 2560×1440 after making visual changes.
- **DO** keep colors semantic: Emerald for HP, Crimson for Damage, Sapphire for Saves, Amber for Initiative/Turn.

### DON'T:
- **DON'T** reintroduce "Мобильный вид" into the desktop header bar.
- **DON'T** use `flex-wrap` inside creature card headers where badges might drop beneath the name.
- **DON'T** use non-standard Tailwind arbitrary classes like `py-0.2` (use `py-0.5` or `py-[2px]`).
- **DON'T** allow flex containers with `min-w-0` to collapse to 0 width if they contain critical controls (always specify a reasonable min-width like `min-w-[180px]`).
