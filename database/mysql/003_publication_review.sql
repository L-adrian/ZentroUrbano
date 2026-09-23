-- Transactional requests, originals, moderated public photos and administrator audit.
CREATE TABLE IF NOT EXISTS publication_requests (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending_review',
  payload JSON NOT NULL,
  property_slug VARCHAR(180) NULL,
  reviewed_by VARCHAR(190) NULL,
  review_reason VARCHAR(1000) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY publication_retry_unique (account_id,idempotency_key),
  KEY publication_queue_idx (status,created_at),
  CONSTRAINT publication_owner_fk FOREIGN KEY (account_id) REFERENCES client_accounts(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS publication_photos (
  request_id VARCHAR(64) NOT NULL,
  filename VARCHAR(24) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(40) NOT NULL,
  byte_size INT NOT NULL,
  original_data MEDIUMBLOB NOT NULL,
  public_data MEDIUMBLOB NULL,
  PRIMARY KEY (request_id,filename),
  CONSTRAINT publication_photo_fk FOREIGN KEY (request_id) REFERENCES publication_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS publication_review_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL,
  admin_user VARCHAR(190) NOT NULL,
  decision VARCHAR(24) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT publication_audit_fk FOREIGN KEY (request_id) REFERENCES publication_requests(id)
) ENGINE=InnoDB;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='properties' AND column_name='owner_profile')=0,
  'ALTER TABLE properties ADD COLUMN owner_profile JSON NULL', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='properties' AND column_name='rental_details')=0,
  'ALTER TABLE properties ADD COLUMN rental_details JSON NULL', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='morada_users' AND index_name='google_subject_unique')=0,
  'ALTER TABLE morada_users ADD UNIQUE KEY google_subject_unique (provider_subject)', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;
