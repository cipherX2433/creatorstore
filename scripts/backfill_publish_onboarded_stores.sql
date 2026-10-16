-- Publish storefronts for creators who already finished onboarding.
-- Safe to re-run. Does not touch stores that were explicitly unpublished
-- after this backfill; those stay unpublished until published again.

UPDATE stores
SET published = true, updated_at = NOW()
WHERE published IS DISTINCT FROM true
  AND username IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM creator_profiles p
    WHERE p.creator_id = stores.creator_id
      AND p.onboarding_complete = true
  );
