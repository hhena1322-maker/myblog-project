---
description: shadcn/ui 기반 디자인 및 컴포넌트 관리 규칙
alwaysApply: true
---

# shadcn/ui 디자인 시스템 가이드

## shadcn/ui 컴포넌트 사용

디자인 및 UI 구현 시 shadcn/ui를 적극적으로 활용하세요.

### 컴포넌트 추가 방법

새로운 컴포넌트가 필요할 때는 **반드시 터미널 명령어**를 사용하여 추가합니다:

```bash
npx shadcn@latest add [component-name]
```

예시:

```bash
# 단일 컴포넌트 추가
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog

# 여러 컴포넌트 동시 추가
npx shadcn@latest add button card dialog
```

### 사용 가능한 주요 컴포넌트

- **Layout**: card, separator, aspect-ratio, scroll-area
- **Forms**: input, textarea, select, checkbox, radio-group, switch, slider
- **Navigation**: navigation-menu, tabs, breadcrumb, pagination
- **Feedback**: alert, alert-dialog, toast, dialog, sheet
- **Display**: avatar, badge, table, accordion, collapsible
- **Overlay**: popover, dropdown-menu, hover-card, tooltip, context-menu

### 디자인 원칙

1. **기존 컴포넌트 우선**: 새로운 UI가 필요할 때 먼저 shadcn/ui 컴포넌트로 구현 가능한지 확인
2. **커스터마이징**: shadcn/ui 컴포넌트를 프로젝트에 복사하여 필요에 따라 수정
3. **일관성**: 모든 UI 요소는 shadcn/ui의 디자인 시스템을 따름
4. **Tailwind CSS**: shadcn/ui는 Tailwind CSS 기반이므로 스타일링도 Tailwind 사용

### 컴포넌트 임포트

```typescript
// ✅ GOOD - shadcn/ui 컴포넌트 사용
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// ❌ BAD - 직접 구현하지 말 것
import { CustomButton } from "@/components/CustomButton"
```

### 주의사항

- 컴포넌트를 수동으로 복사하지 말고 항상 CLI 명령어 사용
- 컴포넌트 추가 후 `components.json` 설정 확인
- TypeScript 타입이 자동으로 포함됨
