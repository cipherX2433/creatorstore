-- CreateTable
CREATE TABLE IF NOT EXISTS "forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL,
    "section_id" UUID,
    "form_type" TEXT NOT NULL DEFAULT 'contact',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "button_text" TEXT,
    "success_message" TEXT,
    "notification_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "form_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID,
    "creator_id" UUID NOT NULL,
    "form_type" TEXT NOT NULL DEFAULT 'contact',
    "name" TEXT,
    "email" TEXT,
    "message" TEXT,
    "rating" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "answers" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL,
    "form_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    "consent_given" BOOLEAN NOT NULL DEFAULT true,
    "consent_text" TEXT,
    "consent_timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT DEFAULT 'storefront_form',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_forms_creator_status" ON "forms"("creator_id", "status");
CREATE INDEX IF NOT EXISTS "idx_forms_section_id" ON "forms"("section_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_form_submissions_creator_read" ON "form_submissions"("creator_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_form_submissions_form_date" ON "form_submissions"("form_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_form_submissions_creator_type" ON "form_submissions"("creator_id", "form_type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_newsletter_subscribers_creator_email" ON "newsletter_subscribers"("creator_id", "email");
CREATE INDEX IF NOT EXISTS "idx_newsletter_subscribers_creator_status" ON "newsletter_subscribers"("creator_id", "status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forms_creator_id_fkey') THEN
        ALTER TABLE "forms" ADD CONSTRAINT "forms_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'form_submissions_form_id_fkey') THEN
        ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'form_submissions_creator_id_fkey') THEN
        ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_subscribers_creator_id_fkey') THEN
        ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_subscribers_form_id_fkey') THEN
        ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
