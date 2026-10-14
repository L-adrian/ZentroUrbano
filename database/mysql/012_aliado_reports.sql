-- Aliado daily log and personal panel. Additive and re-runnable. Run after 011_team_accounts.
-- aliado_reports: where an aliado advertised on a given day and how many people and owners it
-- brought; the aliado can edit or delete their own rows and the admin sees them in a calendar.
-- aliado_panels: the order of the cards in the aliado's panel and their personal to-do list.
CREATE TABLE IF NOT EXISTS aliado_reports (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  report_date DATE NOT NULL,
  channel VARCHAR(20) NOT NULL,
  place VARCHAR(160) NOT NULL,
  url VARCHAR(300) NULL,
  people INT NOT NULL DEFAULT 0,
  owners INT NOT NULL DEFAULT 0,
  note VARCHAR(300) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY aliado_reports_member_date_idx (member_id, report_date),
  KEY aliado_reports_date_idx (report_date),
  CONSTRAINT aliado_reports_member_fk FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS aliado_panels (
  member_id CHAR(36) PRIMARY KEY,
  card_order VARCHAR(300) NULL,
  todos TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT aliado_panels_member_fk FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE
) ENGINE=InnoDB;
