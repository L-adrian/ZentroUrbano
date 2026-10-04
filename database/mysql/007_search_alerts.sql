-- "Avísame" alerts: a tenant leaves a WhatsApp number or email with consent, and the team
-- tells them by hand when a matching home is published. Additive and re-runnable.
CREATE TABLE IF NOT EXISTS search_alerts (
  id CHAR(36) PRIMARY KEY,
  contact_name VARCHAR(120) NULL,
  whatsapp_normalized VARCHAR(32) NULL,
  email VARCHAR(190) NULL,
  search_params VARCHAR(1000) NOT NULL,
  search_summary VARCHAR(400) NOT NULL,
  consent_text VARCHAR(400) NOT NULL,
  visitor_id CHAR(36) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_notified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY search_alerts_status_idx (status, created_at),
  KEY search_alerts_visitor_idx (visitor_id, created_at),
  KEY search_alerts_whatsapp_idx (whatsapp_normalized),
  KEY search_alerts_email_idx (email)
) ENGINE=InnoDB;
