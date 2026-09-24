-- Provisioned owners may sign in with a username before supplying an email.
ALTER TABLE client_accounts MODIFY COLUMN email VARCHAR(190) NULL;
ALTER TABLE morada_users MODIFY COLUMN email VARCHAR(190) NULL;
SET @username_ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='morada_users' AND column_name='username')=0,
  'ALTER TABLE morada_users ADD COLUMN username VARCHAR(80) NULL, ADD UNIQUE KEY morada_users_username_unique (username)', 'SELECT 1');
PREPARE username_migration FROM @username_ddl;
EXECUTE username_migration;
DEALLOCATE PREPARE username_migration;
