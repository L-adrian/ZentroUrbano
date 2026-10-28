-- What Urbanito did for a linked owner, shown in the Urbanito tab of Mi cuenta. Additive and re-runnable.
-- The bot sends a fresh copy after each chat (upcoming reminders, PDF fichas, plan, the last few messages).
-- show_chat = 0 means the owner turned off "Lo último que hablaron": the site drops the chat and the bot
-- stops sending it. Unlinking deletes the row.
CREATE TABLE IF NOT EXISTS urbanito_snapshots (
  account_id VARCHAR(64) PRIMARY KEY,
  snapshot LONGTEXT NOT NULL,
  show_chat TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT urbanito_snapshots_account_fk FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
