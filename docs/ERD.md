# ERD.md — Playbooked (Stage 5)

```mermaid
erDiagram
  users {
    uuid id PK
    string email "unique"
    string password_hash
    string role "investor|admin"
    timestamptz created_at
    timestamptz updated_at
  }

  watchlist_items {
    uuid id PK
    uuid user_id FK
    string ticker "uppercase"
    jsonb tags_json
    timestamptz created_at
    timestamptz updated_at
  }

  events {
    uuid id PK
    uuid user_id FK
    uuid watchlist_item_id FK
    string event_type
    string status "upcoming|completed"
    timestamptz event_datetime_at
    timestamptz completed_at
    string notes
    timestamptz created_at
    timestamptz updated_at
  }

  templates {
    uuid id PK
    string name
    string template_type
    int version
    jsonb checklist_items_json
    timestamptz created_at
    timestamptz updated_at
  }

  playbooks {
    uuid id PK
    uuid user_id FK
    uuid event_id FK "unique (1:1)"
    uuid template_id FK
    text thesis
    jsonb key_metrics_json
    text invalidation_rule
    numeric max_loss_percent
    jsonb checklist_state_json
    boolean is_locked
    timestamptz locked_at
    timestamptz created_at
    timestamptz updated_at
  }

  paper_trades {
    uuid id PK
    uuid user_id FK
    uuid playbook_id FK
    string ticker "snapshot"
    string status "planned|open|closed|cancelled"
    text entry_plan
    text stop_rule
    text take_profit_rule
    numeric position_size
    numeric pnl_percent
    text cancel_reason
    text outcome_notes
    text post_mortem_notes
    timestamptz opened_at
    timestamptz closed_at
    timestamptz cancelled_at
    timestamptz created_at
    timestamptz updated_at
  }

  gate_attempts {
    uuid id PK
    uuid user_id FK
    uuid playbook_id FK
    uuid event_id FK
    uuid paper_trade_id FK "nullable; set on 201"
    boolean blocked_by_existing_planned_trade
    jsonb gate_results_json "nullable when blocked"
    int passed_gate_count "nullable when blocked"
    int total_gates
    boolean all_passed
    timestamptz attempted_at
  }

  users ||--o{ watchlist_items : has
  users ||--o{ events : has
  watchlist_items ||--o{ events : creates
  users ||--o{ playbooks : has
  events ||--|| playbooks : has_one
  templates ||--o{ playbooks : used_by
  users ||--o{ paper_trades : has
  playbooks ||--o{ paper_trades : has
  users ||--o{ gate_attempts : logs
  playbooks ||--o{ gate_attempts : logs
  events ||--o{ gate_attempts : logs
  paper_trades ||--o{ gate_attempts : created_from

 ``` 

### Constraints & indexes (locked + required)
Uniqueness

users.email unique

watchlist_items unique(user_id, ticker)

playbooks.event_id unique (Event ↔ Playbook is 1:1 in MVP)

One planned trade per playbook (concurrency-safe): Postgres partial unique index:

unique(playbook_id) WHERE status = 'planned'

Required indexes

events(user_id, status, event_datetime_at)

gate_attempts(user_id, attempted_at)

paper_trades(user_id, status, created_at)

paper_trades(user_id, closed_at)

Validation constraints (DB/app)

paper_trades.pnl_percent required if status='closed'

opened_at <= closed_at when status='closed'

gate_attempts.passed_gate_count between 0 and 5 when not null

playbooks.max_loss_percent > 0 (app-enforced; can also be DB CHECK)