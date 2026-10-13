-- Profile photo each account uploads in "Mi cuenta". Stored as a 320 px square WebP (about 20 KB),
-- like the team photos. client_accounts.avatar_url points to /media/cuentas/<id>/<version>.webp.
CREATE TABLE IF NOT EXISTS client_account_photos (
  account_id VARCHAR(64) NOT NULL PRIMARY KEY,
  photo MEDIUMBLOB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
