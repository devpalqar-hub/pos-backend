-- Fix campaigns table only if it exists
SET @table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name = 'campaigns'
);

SET @sql = IF(@table_exists > 0,
'ALTER TABLE `campaigns`
MODIFY `status` ENUM(''DRAFT'',''SCHEDULED'',''RUNNING'',''COMPLETED'',''PAUSED'',''CANCELLED'')
NOT NULL DEFAULT ''SCHEDULED'';',
'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fix order_sessions table only if it exists
SET @table_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name = 'order_sessions'
);

SET @sql = IF(@table_exists > 0,
'ALTER TABLE `order_sessions`
MODIFY `channel` ENUM(''DINE_IN'',''ONLINE_OWN'',''UBER_EATS'',''DOORDASH'')
NOT NULL DEFAULT ''DINE_IN'';',
'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;