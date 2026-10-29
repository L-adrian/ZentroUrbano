-- Calendar of Mi cuenta. Additive and re-runnable.
-- calendar_events: what the owner adds by hand (calls, contract signings, rent collection, visits
-- arranged outside Zentro). Visits booked on the listing and the availability checks are not stored
-- here; the calendar reads them from visit_bookings and properties.
-- starts_at is UTC, like visit_bookings. repeat_monthly repeats the event on the same day each month.
CREATE TABLE IF NOT EXISTS calendar_events (
  id CHAR(36) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  title VARCHAR(120) NOT NULL,
  starts_at DATETIME NOT NULL,
  all_day TINYINT(1) NOT NULL DEFAULT 0,
  repeat_monthly TINYINT(1) NOT NULL DEFAULT 0,
  property_slug VARCHAR(180) NULL,
  person_name VARCHAR(120) NULL,
  person_whatsapp VARCHAR(32) NULL,
  note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY calendar_events_account_idx (account_id, starts_at),
  CONSTRAINT calendar_events_account_fk FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
