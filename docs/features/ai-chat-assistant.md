# AI Chat Assistant

Fitur AI Chat Assistant terintegrasi dalam GIMS menggunakan Cerebras AI untuk memberikan kemampuan agentic — mengeksekusi tindakan di data ERP melalui percakapan natural language.

## Fitur Utama
- Percakapan natural language dengan asisten AI
- Intent extraction otomatis dari pesan user (CREATE, UPDATE, DELETE, QUERY, REPORT)
- Permission-aware: validasi izin user sebelum menjalankan aksi
- Confirmation flow: aksi sensitif memerlukan konfirmasi user sebelum eksekusi
- Multi-session: riwayat percakapan tersimpan dan dapat dilanjutkan
- Floating chat widget di semua halaman dashboard
- Full-page chat mode di `/ai-chatbot`
- Admin panel: action logs dan intent registry

## Business Rules
- Setiap aksi yang mengubah data (CREATE, UPDATE, DELETE) memerlukan konfirmasi dari user
- GENERAL_CHAT bypass permission check (semua user yang login bisa chat)
- Admin bypass permission validation untuk semua intent
- Intent resolution menggunakan LLM dengan temperature 0.1 untuk konsistensi
- Session otomatis dibuat saat percakapan pertama dimulai
- Jika intent tidak dikenali, fallback ke GENERAL_CHAT
- Token usage dan durasi dicatat per pesan untuk monitoring

## Keputusan Teknis

- **Mengapa Cerebras AI (bukan OpenAI langsung)**:
  Cerebras menyediakan inference tercepat dengan OpenAI-compatible API. Trade-off: vendor lock-in pada model selection, namun abstraksi client memudahkan migrasi.

- **Mengapa intent resolution di-handle LLM, bukan regex/keyword**:
  LLM memberikan fleksibilitas bahasa natural yang jauh lebih baik. User bisa berkata "tolong buatkan karyawan baru" atau "create new employee" dan keduanya terdeteksi. Trade-off: latency tambahan ~200ms per request.

- **Mengapa confirmation flow bukan state machine library**:
  Flow hanya 4 state (PENDING_CONFIRMATION → SUCCESS/FAILED/CANCELLED), cukup sederhana tanpa library. Trade-off: validasi manual di usecase.

- **Mengapa floating widget + full-page mode**:
  Widget untuk quick queries tanpa meninggalkan halaman. Full-page untuk percakapan panjang/kompleks. Memberikan fleksibilitas UX terbaik.

## Struktur Folder

### Backend
```
apps/api/internal/ai/
├── data/
│   ├── models/
│   │   ├── ai_chat_session.go
│   │   ├── ai_chat_message.go
│   │   ├── ai_action_log.go
│   │   └── ai_intent_registry.go
│   └── repositories/
│       ├── chat_session_repository.go
│       ├── chat_message_repository.go
│       ├── action_log_repository.go
│       └── intent_registry_repository.go
├── domain/
│   ├── dto/
│   │   └── chat_dto.go
│   ├── mapper/
│   │   └── chat_mapper.go
│   └── usecase/
│       ├── ai_chat_usecase.go
│       ├── intent_resolver.go
│       ├── permission_validator.go
│       ├── entity_resolver.go
│       └── action_executor.go
└── presentation/
    ├── handler/
    │   ├── chat_handler.go
    │   ├── session_handler.go
    │   └── admin_handler.go
    ├── router/
    │   ├── chat_router.go
    │   ├── session_router.go
    │   └── admin_router.go
    └── routers.go
```

### Frontend
```
apps/web/src/features/ai-chat/
├── types/
│   └── index.d.ts
├── services/
│   └── ai-chat-service.ts
├── stores/
│   └── use-ai-chat-store.ts
├── hooks/
│   └── use-ai-chat.ts
├── components/
│   ├── index.ts
│   ├── ai-chat-widget.tsx      # Floating widget (button + panel)
│   ├── session-list.tsx         # Session sidebar
│   ├── message-list.tsx         # Message list with auto-scroll
│   ├── message-bubble.tsx       # Individual message bubble
│   ├── message-input.tsx        # Text input with auto-resize
│   └── action-card.tsx          # Action confirmation card
└── i18n/
    ├── en.ts
    └── id.ts
```

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/ai/chat/send` | Auth | Send message and get AI response |
| POST | `/ai/chat/confirm` | Auth | Confirm or cancel pending action |
| GET | `/ai/sessions` | Auth | List user's chat sessions |
| GET | `/ai/sessions/:id` | Auth | Get session detail with messages |
| DELETE | `/ai/sessions/:id` | Auth | Delete a chat session |
| GET | `/ai/admin/actions` | ai.admin | List all action logs (admin) |
| GET | `/ai/admin/intents` | ai.admin | Get intent registry (admin) |

## Agentic Pipeline

```
User Message
    ↓
Intent Resolver (LLM call, temp 0.1)
    ↓
Intent Identified? ──No──→ GENERAL_CHAT (direct LLM response)
    ↓ Yes
Permission Validator
    ↓
Has Permission? ──No──→ 403 FORBIDDEN
    ↓ Yes
Requires Confirmation?
    ↓ Yes                     ↓ No
Return ActionPreview      Execute Action
(PENDING_CONFIRMATION)         ↓
    ↓                     Return Result
User Confirms/Cancels
    ↓
Execute or Cancel Action
```

## Registered Intents

| Intent Code | Module | Action | Permission | Confirmation |
|------------|--------|--------|------------|-------------|
| CREATE_EMPLOYEE | hrd | CREATE | hrd.employee.create | Yes |
| UPDATE_EMPLOYEE | hrd | UPDATE | hrd.employee.update | Yes |
| QUERY_EMPLOYEE | hrd | QUERY | hrd.employee.read | No |
| DELETE_EMPLOYEE | hrd | DELETE | hrd.employee.delete | Yes |
| CREATE_PRODUCT | product | CREATE | product.create | Yes |
| UPDATE_PRODUCT | product | UPDATE | product.update | Yes |
| QUERY_PRODUCT | product | QUERY | product.read | No |
| QUERY_STOCK | inventory | QUERY | inventory.read | No |
| GENERATE_REPORT | reports | REPORT | reports.generate | Yes |
| GENERAL_CHAT | general | QUERY | - | No |

## Manual Testing
1. Login sebagai admin
2. Klik floating chat button di kanan bawah
3. Ketik "show me all employees" → should return QUERY_EMPLOYEE response
4. Ketik "create new employee named John" → should show action confirmation card
5. Klik Confirm → should execute and return success
6. Klik Cancel → should cancel action
7. Navigate ke `/ai-chatbot` → full-page chat mode
8. Buka sidebar, buat percakapan baru
9. Hapus percakapan lama
10. Login sebagai user biasa tanpa permission → ketik "delete employee" → should return 403

## Automated Testing
- **Backend Unit Tests**: `apps/api/internal/ai/domain/usecase/*_test.go` (TBD)
- **Integration Tests**: `apps/api/test/ai/*_test.go` (TBD)

**Run Tests**:
```bash
# Backend
cd apps/api && go test ./internal/ai/...

# Frontend type check
cd apps/web && npx tsc --noEmit
```

## Dependencies
- **Backend**: GORM (models), Cerebras AI (LLM inference), Gin (HTTP), UUID (IDs)
- **Frontend**: TanStack Query (data fetching), Zustand (UI state), Framer Motion (animations), date-fns (date formatting), Sonner (toasts)
- **Integration**: Employee module (entity resolution), Product module (entity resolution), Warehouse module (entity resolution), Sales module (customer resolution)

## Environment Variables
```env
CEREBRAS_API_KEY=your-api-key
CEREBRAS_BASE_URL=https://api.cerebras.ai
CEREBRAS_MODEL=llama-4-scout-17b-16e-instruct
```

## Notes & Improvements
- **Known Limitation**: Streaming responses (SSE) not yet connected to frontend
- **Future Improvement**:
  - Add streaming response display (typing effect)
  - Add more intents (Purchase, Finance, Stock Opname)
  - Add conversation memory/context window management
  - Add file/image upload in chat
  - Add voice input support
  - Add intent analytics dashboard for admin
  - Add rate limiting per user on chat endpoint
- **Performance**: Intent resolution adds ~200ms latency; consider caching common intents
