-- Keep replacements permanent, including after a real listing is unpublished.
CREATE TABLE IF NOT EXISTS demo_listing_replacements (
  demo_slug VARCHAR(180) PRIMARY KEY,
  sort_order INT NOT NULL,
  property_slug VARCHAR(180) NULL,
  replaced_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY demo_replacement_order_unique (sort_order),
  UNIQUE KEY demo_replacement_property_unique (property_slug)
) ENGINE=InnoDB;

INSERT INTO demo_listing_replacements (demo_slug,sort_order) VALUES
  ('demo-monoambiente-equipetrol-norte',1),
  ('demo-departamento-dos-dormitorios-urbari',2),
  ('demo-casa-familiar-hamacas',3),
  ('demo-monoambiente-centro-calle-velasco',4),
  ('demo-departamento-tres-dormitorios-av-beni',5),
  ('demo-casa-piscina-zona-norte',6),
  ('demo-departamento-amoblado-equipetrol',7),
  ('demo-monoambiente-mutualista',8),
  ('demo-casa-condominio-las-palmas',9),
  ('demo-departamento-dos-dormitorios-urbari-sur',10)
ON DUPLICATE KEY UPDATE demo_slug=VALUES(demo_slug);
