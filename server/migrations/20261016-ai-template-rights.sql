-- Existing rows retain their original state; rights are not automatically certified.
ALTER TABLE vv_ai_template ADD COLUMN IF NOT EXISTS rights_basis TEXT;
ALTER TABLE vv_ai_template ADD COLUMN IF NOT EXISTS rights_note TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conname='vv_ai_template_rights_basis_check'
    AND conrelid='vv_ai_template'::regclass
 ) THEN
  ALTER TABLE vv_ai_template ADD CONSTRAINT vv_ai_template_rights_basis_check
   CHECK (rights_basis IS NULL OR rights_basis IN ('owned','licensed'));
 END IF;
END $$;
