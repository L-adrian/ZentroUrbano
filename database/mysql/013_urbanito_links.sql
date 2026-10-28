-- Urbanito (Telegram assistant) linked to an owner's account. Additive and re-runnable.
-- The owner asks for a 6-character code in Mi cuenta and sends "/vincular CODE" to the bot; the
-- code is stored only as a hash and lasts 15 minutes. One Telegram account per Zentro account.
CREATE TABLE IF NOT EXISTS urbanito_links (
  account_id VARCHAR(64) PRIMARY KEY,
  telegram_id BIGINT NULL,
  code_hash CHAR(64) NULL,
  code_expires_at DATETIME NULL,
  linked_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY urbanito_links_telegram_unique (telegram_id),
  UNIQUE KEY urbanito_links_code_unique (code_hash),
  CONSTRAINT urbanito_links_account_fk FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
