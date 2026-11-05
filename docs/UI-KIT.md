# Корпоративный UI-кит — справочник для тестового задания Frontend

Этот файл — всё, что нужно, чтобы привести страницу модуля ККД к визуалу платформы.
Значения взяты из реальной дизайн-системы.

> **Пакет кита вам недоступен** — он приватный, ставить его не нужно и не получится.
> Берите значения отсюда: скопируйте тему из раздела 1 в `ConfigProvider` и дальше
> тяните цвета и размеры из темы, а не из хардкода в компонентах.
>
> **Шрифт.** Фирменная гарнитура платформы распространяется вместе с приватным пакетом,
> поэтому здесь она заменена на свободный **Inter** (Google Fonts) с теми же метриками.
> Подойдёт Inter или любой близкий по метрикам гротеск — оценивается попадание
> в размеры и межстрочные интервалы, а не конкретная гарнитура.

---

## 1. Готовая тема — скопируйте и подключите

```ts
// theme.ts
import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // акцент и семантика
    colorPrimary: '#056cfd',
    colorInfo: '#056cfd',
    colorSuccess: '#039306',
    colorWarning: '#faad14',
    colorError: '#d43629',
    colorLink: '#1b4de3',
    // текст
    colorText: '#312921',
    colorTextSecondary: '#76726C',
    colorTextTertiary: '#9d9b99',
    // фоны и границы (тёплая, а не серая основа)
    colorBgContainer: '#fefcfa',
    colorBgElevated: '#fefcfa',
    colorBgLayout: '#f7f3f0',
    colorFill: '#eae4de',
    colorBorder: '#EAE7E5',
    colorBorderSecondary: '#e8e5e2',
    // типографика
    fontFamily: '"Inter", sans-serif',
    fontSize: 14,
    lineHeight: 1.5714,
    fontWeightStrong: 600,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    // геометрия
    borderRadius: 6,
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,
  },
  components: {
    Button: {
      paddingInline: 12,
      defaultColor: '#322c26',
      defaultBorderColor: '#eae4de',
      defaultHoverColor: '#1b4de3',
      defaultHoverBorderColor: '#1b4de3',
    },
    Layout: { bodyBg: '#fefcfa', siderBg: '#f7f3f0', headerHeight: 72, headerPadding: 0 },
    Menu: {
      itemBg: '#f7f3f0', itemColor: '#322c26', itemHeight: 32,
      itemHoverBg: '#eae4de', itemSelectedBg: '#d9e3f8', itemSelectedColor: '#1b4de3',
    },
    Table: { headerBg: '#fefcfa' },
    Select: { optionSelectedBg: '#ddeafd', optionSelectedColor: '#1b4de3' },
    Modal: { titleFontSize: 20, colorBgMask: 'rgba(50, 44, 38, 0.07)' },
    Tag: { defaultBg: '#f7f3f0' },
    Tooltip: { colorText: '#e4e6e2', colorBgBase: '#90928d' },
    Divider: { colorSplit: '#eae4de' },
  },
};
```

```tsx
// main.tsx
import { ConfigProvider, App } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { theme } from './theme';

<ConfigProvider theme={theme} locale={ruRU}>
  <App>{children}</App>
</ConfigProvider>
```

Шрифт подключается из Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 2. Палитра

**Акцент (синий).** `colorPrimary #056cfd`, hover `#1b4de3`, active `#0f2cc4`,
фон акцента `colorPrimaryBg #ddeafd`, ссылки `#1b4de3`.

**Текст и фоны.** Основа тёплая, не серая — это заметная черта платформы.

| Токен | Значение | Роль |
|---|---|---|
| `colorText` | `#312921` | Основной текст, тёплый тёмно-коричневый |
| `colorTextSecondary` | `#76726C` | Вторичный текст, подписи |
| `colorTextTertiary` | `#9d9b99` | Третичный, самый слабый |
| `colorBgContainer` | `#fefcfa` | Фон карточек и контейнеров |
| `colorBgLayout` | `#f7f3f0` | Фон страницы, тёплый бежевый |
| `colorFill` | `#eae4de` | Заливка, hover-фоны |
| `colorBorder` | `#EAE7E5` | Границы |
| `colorBorderSecondary` | `#e8e5e2` | Разделители |

**Семантика.**

| Роль | Основной | Фон | Текст |
|---|---|---|---|
| Success | `#039306` | `#e3edd8` | `#007802` |
| Warning | `#faad14` | `#fffbe6` | `#ca820e` |
| Error | `#d43629` | `#fce3d9` | `#b81301` |
| Info | `#056cfd` | `#d5edfa` | `#036c8f` |

---

## 3. Типографика

| Роль | Размер | Вес | line-height |
|---|---|---|---|
| Основной текст | 14px | 400 | 22px |
| Подпись, caption | 12px | 400–500 | 16–20px |
| Заголовок секции, модалки | 20px | 600 | 28px |
| Заголовок страницы | 20px | 600 | 28px |
| Крупные числа в карточках метрик | 24–30px | 600 | — |

Базовое правило: **14px / 22px** для текста, **20px / 600 / 28px** для заголовка.

---

## 4. Геометрия

**Радиусы.** Базовый 6px, мелкие элементы 4px, карточки и панели **8–16px**,
модальные окна **28px**, пилюли и чипы 20px.

**Высоты контролов.** Обычный **32px**, компактный 24px, крупный 40px, шапка 72px.

**Отступы.** Кратно 4: `4 / 8 / 12 / 16 / 20 / 24 / 40`. Внутри карточки обычно 20–24px,
между карточками 16px.

**Тени.** Почти не используются — «приподнятость» делается фоном `colorBgElevated #fefcfa`
на фоне раскладки `#f7f3f0` плюс граница `colorBorderSecondary`. Если тень всё же нужна
(модалка, дропдаун), берите antd-овскую по умолчанию.

---

## 5. Как применить это к странице ККД

Это не обязательная часть кита, а подсказка, как разложить его токены по экрану.

**Карточки метрик.** Фон `colorBgContainer`, граница `colorBorderSecondary`,
радиус 8–16px на фоне страницы `colorBgLayout`. Значение — крупно и весом 600,
подпись метрики — `colorTextSecondary` 12–14px.

**Дельта и trend.** Цвет берётся от поля `trend`, а не от знака числа:
`better` → `colorSuccess`, `worse` → `colorError`, `same` → `colorTextSecondary`.
Рядом с цветом обязательно стрелка и значение, иначе дельта не читается
без различения цветов. Если `previous` равен `null`, покажите «нет данных
для сравнения» в `colorTextTertiary`, а не ноль.

**Важность проблемы.** `critical` → `colorError`, `major` → `colorWarning`,
`minor` → `colorTextSecondary`. В таблице лучше бейдж (`Tag`) с текстом уровня,
а не только цветная точка.

**Статус дельты.** `new` — фон `#fce3d9`, `persisting` — нейтральный `colorFill`,
`resolved` — фон `#e3edd8`. Текст уровня тоже подписывайте словом.

**Таблица проблем.** `Table` с `headerBg #fefcfa`, разделители `colorBorderSecondary`,
высота строки под контрол 32px.

**Карточка проблемы.** `Modal` с радиусом 28px и заголовком 20px/600,
маска `rgba(50, 44, 38, 0.07)`.

---

## 6. Чек-лист перед сдачей

- [ ] Тема подключена через `ConfigProvider`, свой `ConfigProvider` поверх не создаётся.
- [ ] Никаких сторонних hex в компонентах — всё из `theme.token` или из токенов CSS-переменных.
- [ ] Акцент `#056cfd`, текст `#312921`, фон страницы `#f7f3f0`, фон карточек `#fefcfa`.
- [ ] Основной текст 14px с межстрочным 22px, заголовки 20px весом 600.
- [ ] Радиусы: карточки 8–16px, модалки 28px. Высота контролов 32px.
- [ ] Отступы кратны 4px.
- [ ] Цвет не единственный носитель смысла: у важности и у дельты есть текст или значок.
- [ ] Страница корректно выглядит на десктопе от 1280px.
