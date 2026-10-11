-- Zentro team and visit bookings. Additive and re-runnable.
-- team_members: real people of Zentro (embajadores and colaboradores) shown on /nuestro-equipo.
-- property_team: who works on each home; the embajador can take the visits.
-- property_visit_settings: the days and hours a home can be visited (defaults apply when missing).
-- visit_bookings: visits booked on the listing page. slot_key is set only while a booking is
-- active, so a slot can be booked again after a cancellation.
CREATE TABLE IF NOT EXISTS team_members (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(80) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'colaborador',
  whatsapp_normalized VARCHAR(32) NULL,
  zone VARCHAR(120) NULL,
  bio VARCHAR(300) NULL,
  photo MEDIUMBLOB NULL,
  photo_version INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY team_members_slug_unique (slug),
  KEY team_members_status_idx (status, full_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_team (
  property_slug VARCHAR(180) NOT NULL,
  member_id CHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  handles_visits TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_slug, member_id),
  KEY property_team_member_idx (member_id),
  CONSTRAINT property_team_member_fk FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_visit_settings (
  property_slug VARCHAR(180) PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  weekdays VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6',
  start_minute SMALLINT NOT NULL DEFAULT 540,
  end_minute SMALLINT NOT NULL DEFAULT 1080,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visit_bookings (
  id CHAR(36) PRIMARY KEY,
  property_slug VARCHAR(180) NOT NULL,
  starts_at DATETIME NOT NULL,
  slot_key VARCHAR(220) NULL,
  visitor_name VARCHAR(120) NOT NULL,
  visitor_whatsapp VARCHAR(32) NOT NULL,
  note VARCHAR(300) NULL,
  host_kind VARCHAR(20) NOT NULL DEFAULT 'owner',
  host_member_id CHAR(36) NULL,
  visitor_id CHAR(36) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  cancelled_by VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY visit_bookings_slot_unique (slot_key),
  KEY visit_bookings_property_idx (property_slug, starts_at),
  KEY visit_bookings_visitor_idx (visitor_id, created_at),
  KEY visit_bookings_host_idx (host_member_id, starts_at)
) ENGINE=InnoDB;
