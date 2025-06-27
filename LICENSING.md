# 📄 CAG-Chains Licensing Guide

## 🔒 Business Source License 1.1

CAG-Chains использует **Business Source License 1.1** для защиты коммерческих интересов при сохранении принципов open source разработки.

## ✅ Что МОЖНО делать

### 🛠️ Разработка и исследования
- ✅ **Использовать для разработки** (development, testing, debugging)
- ✅ **Исследовательские проекты** (академические, некоммерческие исследования)
- ✅ **Внутреннее использование в компании** (internal tools, automation)
- ✅ **Модификация и форк** (создание собственных версий)
- ✅ **Распространение** (с сохранением лицензионных уведомлений)

### 🎓 Образование
- ✅ **Обучение программированию** (курсы, tutorials, workshops)
- ✅ **Студенческие проекты** (дипломные работы, проекты)
- ✅ **Демонстрации** (presentations, conferences, showcases)

### 💼 Бизнес-применения
- ✅ **Внутренние бизнес-процессы** (автоматизация, аналитика)
- ✅ **Интеграция в собственные продукты** (не конкурирующие)
- ✅ **Консалтинговые услуги** (настройка, кастомизация для клиентов)

## ❌ Что НЕЛЬЗЯ делать

### 🚫 Конкурирующие коммерческие сервисы
- ❌ **AI marketplace** (продажа AI компонентов или контекстов)
- ❌ **Agent orchestration platform** (коммерческая платформа для управления AI агентами)
- ❌ **Chain management service** (SaaS для создания и управления CAG-Chains)
- ❌ **Distributed AI network** (конкурирующая сеть AI узлов)
- ❌ **IPFS-based AI storage** (коммерческое хранение AI данных)

### 🔍 Определение "Competing Use"
Коммерческое использование для предоставления сервиса, который предлагает **ту же или существенно схожую функциональность** что и CAG-Chains.

## ⏰ Автоматический переход в MIT

**31 декабря 2028 года** лицензия автоматически изменится на MIT License, что сделает проект полностью открытым.

## 💰 Коммерческое лицензирование

Если ваше использование попадает под "Competing Use", свяжитесь с нами для получения коммерческой лицензии:
- 📧 Email: [your-email@example.com]
- 💼 Enterprise partnerships available
- 🤝 Custom licensing arrangements

## 📚 Примеры использования

### ✅ РАЗРЕШЕНО

```typescript
// Интеграция CAG-Chains в собственный продукт
import { CAGChain } from '@cag-chains/core';

// Использование для автоматизации внутренних процессов
const automationChain = new CAGChain({
  purpose: 'internal_data_processing',
  commercial: false
});

// Создание образовательного контента
const tutorialChain = new CAGChain({
  purpose: 'educational_demo',
  commercial: false
});
```

### ❌ ЗАПРЕЩЕНО

```typescript
// Создание конкурирующего AI marketplace
const competingMarketplace = new AIMarketplace({
  purpose: 'sell_ai_components', // ❌ Competing use
  commercial: true
});

// Предоставление Chain-as-a-Service
const chainService = new ChainOrchestrator({
  purpose: 'saas_ai_orchestration', // ❌ Competing use
  commercial: true
});
```

## 🔗 Связанные файлы

- [`LICENSE`](LICENSE) - Полный текст BSL 1.1
- [`NOTICE`](NOTICE) - Краткое уведомление о лицензировании
- [`README.md`](README.md) - Основная документация проекта

## ❓ FAQ

**Q: Могу ли я использовать CAG-Chains в своем SaaS продукте?**  
A: Да, если ваш продукт не конкурирует с CAG-Chains marketplace и Chain Nodes функциональностью.

**Q: Могу ли я предоставлять консалтинговые услуги?**  
A: Да, консалтинг, настройка и кастомизация разрешены.

**Q: Что произойдет в 2028 году?**  
A: Проект автоматически станет MIT Licensed - полностью открытым.

**Q: Могу ли я создать форк?**  
A: Да, но с теми же лицензионными ограничениями.

---

**Выбор BSL 1.1 обеспечивает баланс между открытостью и защитой инноваций!** 🚀 