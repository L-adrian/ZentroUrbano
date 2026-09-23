-- Nullable for existing listings; those retain the platform conversion fallback.
SET @has_exchange_rate = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'exchange_rate'
);
SET @exchange_rate_ddl = IF(@has_exchange_rate = 0,
  'ALTER TABLE properties ADD COLUMN exchange_rate DECIMAL(10,4) NULL AFTER currency',
  'SELECT 1'
);
PREPARE exchange_rate_migration FROM @exchange_rate_ddl;
EXECUTE exchange_rate_migration;
DEALLOCATE PREPARE exchange_rate_migration;
