-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('investor', 'admin');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('earnings', 'macro', 'company_event', 'other');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('upcoming', 'completed');

-- CreateEnum
CREATE TYPE "PaperTradeStatus" AS ENUM ('planned', 'open', 'closed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'investor',
    "learning_goal" TEXT,
    "default_max_loss_percent" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "tags_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "watchlist_item_id" UUID NOT NULL,
    "event_type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'upcoming',
    "event_datetime_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "template_type" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "checklist_items_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbooks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "thesis" TEXT,
    "key_metrics_json" JSONB NOT NULL DEFAULT '[]',
    "invalidation_rule" TEXT,
    "max_loss_percent" DECIMAL(5,2),
    "checklist_state_json" JSONB NOT NULL DEFAULT '{}',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_trades" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "playbook_id" UUID NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "status" "PaperTradeStatus" NOT NULL DEFAULT 'planned',
    "entry_plan" TEXT,
    "stop_rule" TEXT,
    "take_profit_rule" TEXT,
    "position_size" DECIMAL(18,4),
    "pnl_percent" DECIMAL(8,2),
    "cancel_reason" TEXT,
    "outcome_notes" TEXT,
    "post_mortem_notes" TEXT,
    "opened_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "paper_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "playbook_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "created_paper_trade_id" UUID,
    "blocked_by_existing_planned_trade" BOOLEAN NOT NULL DEFAULT false,
    "gate_results_json" JSONB,
    "passed_gate_count" INTEGER,
    "total_gates" INTEGER NOT NULL DEFAULT 5,
    "all_passed" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_user_id_ticker_key" ON "watchlist_items"("user_id", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_user_id_id_key" ON "watchlist_items"("user_id", "id");

-- CreateIndex
CREATE INDEX "events_user_id_status_event_datetime_at_idx" ON "events"("user_id", "status", "event_datetime_at");

-- CreateIndex
CREATE UNIQUE INDEX "events_user_id_id_key" ON "events"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "templates_name_version_key" ON "templates"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "playbooks_event_id_key" ON "playbooks"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "playbooks_user_id_event_id_key" ON "playbooks"("user_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "playbooks_user_id_id_key" ON "playbooks"("user_id", "id");

-- CreateIndex
CREATE INDEX "paper_trades_user_id_status_created_at_idx" ON "paper_trades"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "paper_trades_user_id_closed_at_idx" ON "paper_trades"("user_id", "closed_at");

-- CreateIndex
CREATE INDEX "gate_attempts_user_id_attempted_at_idx" ON "gate_attempts"("user_id", "attempted_at");

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_watchlist_item_id_fkey" FOREIGN KEY ("user_id", "watchlist_item_id") REFERENCES "watchlist_items"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_user_id_event_id_fkey" FOREIGN KEY ("user_id", "event_id") REFERENCES "events"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_user_id_playbook_id_fkey" FOREIGN KEY ("user_id", "playbook_id") REFERENCES "playbooks"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_user_id_playbook_id_fkey" FOREIGN KEY ("user_id", "playbook_id") REFERENCES "playbooks"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_user_id_event_id_fkey" FOREIGN KEY ("user_id", "event_id") REFERENCES "events"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_attempts" ADD CONSTRAINT "gate_attempts_created_paper_trade_id_fkey" FOREIGN KEY ("created_paper_trade_id") REFERENCES "paper_trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "paper_trades_one_planned_trade_per_playbook_idx"
ON "paper_trades"("playbook_id")
WHERE "status" = 'planned'::"PaperTradeStatus";

-- AddConstraint
ALTER TABLE "playbooks"
ADD CONSTRAINT "playbooks_max_loss_percent_positive_check"
CHECK ("max_loss_percent" IS NULL OR "max_loss_percent" > 0);

-- AddConstraint
ALTER TABLE "gate_attempts"
ADD CONSTRAINT "gate_attempts_passed_gate_count_range_check"
CHECK ("passed_gate_count" IS NULL OR ("passed_gate_count" >= 0 AND "passed_gate_count" <= 5));

-- AddConstraint
ALTER TABLE "gate_attempts"
ADD CONSTRAINT "gate_attempts_total_gates_is_five_check"
CHECK ("total_gates" = 5);

-- AddConstraint
ALTER TABLE "gate_attempts"
ADD CONSTRAINT "gate_attempts_blocked_branch_shape_check"
CHECK (
  (
    "blocked_by_existing_planned_trade" = true
    AND "gate_results_json" IS NULL
    AND "passed_gate_count" IS NULL
    AND "all_passed" = false
  )
  OR "blocked_by_existing_planned_trade" = false
);

-- AddConstraint
ALTER TABLE "paper_trades"
ADD CONSTRAINT "paper_trades_closed_trade_requires_pnl_check"
CHECK ("status" <> 'closed'::"PaperTradeStatus" OR "pnl_percent" IS NOT NULL);

-- AddConstraint
ALTER TABLE "paper_trades"
ADD CONSTRAINT "paper_trades_opened_before_closed_check"
CHECK (
  "opened_at" IS NULL
  OR "closed_at" IS NULL
  OR "opened_at" <= "closed_at"
);
