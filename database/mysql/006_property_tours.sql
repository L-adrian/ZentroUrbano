CREATE TABLE IF NOT EXISTS property_tours (
  property_slug VARCHAR(180) PRIMARY KEY,
  revision CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  manifest JSON NOT NULL,
  owner_approved_at DATETIME NULL,
  reviewed_by VARCHAR(190) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT property_tour_property_fk FOREIGN KEY (property_slug) REFERENCES properties(slug) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_tour_assets (
  property_slug VARCHAR(180) NOT NULL,
  filename VARCHAR(24) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  data MEDIUMBLOB NOT NULL,
  PRIMARY KEY (property_slug, filename),
  CONSTRAINT property_tour_asset_fk FOREIGN KEY (property_slug) REFERENCES property_tours(property_slug) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_tour_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_slug VARCHAR(180) NOT NULL,
  revision CHAR(36) NOT NULL,
  action VARCHAR(20) NOT NULL,
  admin_user VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY tour_audit_property_idx (property_slug, created_at)
) ENGINE=InnoDB;
