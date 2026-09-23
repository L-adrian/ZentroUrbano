create table if not exists publication_plans (
  slug varchar(32) primary key,
  name varchar(80) not null,
  duration_label varchar(120) not null,
  price_usd decimal(10,2) not null,
  price_bob decimal(10,2) not null,
  visibility_rank int not null default 100,
  benefits json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

insert into publication_plans
  (slug, name, duration_label, price_usd, price_bob, visibility_rank, benefits)
values
  (
    'basic',
    'Basico',
    '1 mes',
    30,
    210,
    30,
    json_array(
      'Ficha publicada en Zentro Urbano',
      'Contacto por WhatsApp',
      'Mapa con ubicacion referencial',
      'Reporte semanal de vistas y clicks'
    )
  ),
  (
    'pro',
    'Pro',
    '3 meses',
    50,
    350,
    20,
    json_array(
      'Todo lo del plan Basico',
      'Mayor prioridad en busquedas',
      'Recomendaciones semanales para mejorar la ficha',
      'Ideal para inmobiliarias con rotacion constante'
    )
  ),
  (
    'premium',
    'Premium',
    'Hasta que se venda o alquile',
    80,
    560,
    10,
    json_array(
      'Todo lo del plan Pro',
      'Mayor visibilidad en mapa y fichas destacadas',
      'Seguimiento mensual de disponibilidad',
      'Prioridad para campanas y espacios publicitarios'
    )
  )
on duplicate key update
  name = values(name),
  duration_label = values(duration_label),
  price_usd = values(price_usd),
  price_bob = values(price_bob),
  visibility_rank = values(visibility_rank),
  benefits = values(benefits),
  updated_at = current_timestamp;

create table if not exists client_accounts (
  id varchar(64) primary key,
  kind varchar(24) not null,
  display_name varchar(160) not null,
  company_name varchar(180) null,
  email varchar(190) not null,
  phone varchar(80) null,
  avatar_initials varchar(8) not null,
  avatar_url varchar(600) null,
  role_label varchar(120) not null,
  location varchar(160) null,
  provider varchar(40) not null default 'email',
  status varchar(24) not null default 'active',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique key client_accounts_email_unique (email)
);

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='client_accounts' AND column_name='avatar_url')=0,
  'ALTER TABLE client_accounts ADD COLUMN avatar_url VARCHAR(600) NULL AFTER avatar_initials', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;

create table if not exists morada_users (
  id varchar(64) primary key,
  account_id varchar(64) not null,
  email varchar(190) not null,
  password_hash varchar(255) null,
  auth_provider varchar(40) not null default 'email',
  provider_subject varchar(190) null,
  status varchar(24) not null default 'active',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique key morada_users_email_unique (email),
  key morada_users_provider_idx (auth_provider, provider_subject),
  key morada_users_account_idx (account_id),
  constraint morada_users_account_fk
    foreign key (account_id) references client_accounts(id)
    on delete cascade
);

create table if not exists morada_sessions (
  id varchar(64) primary key,
  user_id varchar(64) not null,
  account_id varchar(64) not null,
  token_hash char(64) not null,
  expires_at timestamp not null,
  created_at timestamp not null default current_timestamp,
  unique key morada_sessions_token_unique (token_hash),
  key morada_sessions_user_idx (user_id),
  key morada_sessions_account_idx (account_id),
  constraint morada_sessions_user_fk
    foreign key (user_id) references morada_users(id)
    on delete cascade,
  constraint morada_sessions_account_fk
    foreign key (account_id) references client_accounts(id)
    on delete cascade
);

create table if not exists properties (
  id varchar(64) primary key,
  slug varchar(180) not null,
  title varchar(220) not null,
  type varchar(60) not null,
  operation varchar(60) not null,
  price decimal(14,2) not null default 0,
  currency varchar(8) not null default 'USD',
  city varchar(120) not null,
  zone varchar(160) not null,
  address varchar(255) null,
  bedrooms int not null default 0,
  bathrooms int not null default 0,
  garage int not null default 0,
  area int not null default 0,
  pets boolean not null default false,
  furnished boolean not null default false,
  security boolean not null default false,
  pool boolean not null default false,
  patio boolean not null default false,
  grill boolean not null default false,
  elevator boolean not null default false,
  short_description text not null,
  long_description text not null,
  requirements json not null,
  images json not null,
  video varchar(255) null,
  map_url varchar(500) null,
  whatsapp varchar(80) null,
  ideal_for json not null,
  tags json not null,
  listing_plan varchar(32) not null default 'standard',
  featured boolean not null default false,
  published boolean not null default false,
  is_seeded boolean not null default false,
  coordinates json not null,
  neighborhood_highlights json not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique key properties_slug_unique (slug),
  key properties_published_idx (published, listing_plan, updated_at),
  key properties_operation_idx (operation),
  key properties_type_idx (type),
  key properties_zone_idx (zone)
);

create table if not exists property_contact_leads (
  id varchar(64) primary key,
  property_slug varchar(180) null,
  contact_name varchar(180) null,
  whatsapp_raw varchar(120) not null,
  whatsapp_normalized varchar(32) not null,
  source_platform varchar(80) not null default 'facebook_marketplace',
  source_url varchar(700) null,
  source_excerpt text null,
  status varchar(32) not null default 'pending',
  usage_consent boolean not null default false,
  last_contacted_at timestamp null,
  notes text null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  key contact_leads_status_idx (status, created_at),
  key contact_leads_whatsapp_idx (whatsapp_normalized),
  key contact_leads_property_idx (property_slug)
);

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='properties' AND column_name='availability_confirmed_at')=0,
  'ALTER TABLE properties ADD COLUMN availability_confirmed_at TIMESTAMP NULL AFTER published', 'SELECT 1');
PREPARE patch FROM @ddl; EXECUTE patch; DEALLOCATE PREPARE patch;

create table if not exists client_account_properties (
  id varchar(64) primary key,
  account_id varchar(64) not null,
  property_slug varchar(180) not null,
  plan_slug varchar(32) not null default 'basic',
  status varchar(24) not null default 'active',
  available_until date null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique key client_property_unique (account_id, property_slug),
  key client_property_slug_idx (property_slug),
  constraint client_property_account_fk
    foreign key (account_id) references client_accounts(id)
    on delete cascade
);

create table if not exists property_performance_snapshots (
  id varchar(64) primary key,
  account_property_id varchar(64) not null,
  period_start date not null,
  period_end date not null,
  views int not null default 0,
  property_clicks int not null default 0,
  map_views int not null default 0,
  whatsapp_clicks int not null default 0,
  gallery_opens int not null default 0,
  weekly_views json not null,
  recommendation text null,
  created_at timestamp not null default current_timestamp,
  unique key performance_property_period_unique (account_property_id, period_start),
  constraint performance_property_fk
    foreign key (account_property_id) references client_account_properties(id)
    on delete cascade
);

create table if not exists weekly_reports (
  id varchar(64) primary key,
  account_id varchar(64) not null,
  period_start date not null,
  period_end date not null,
  period_label varchar(80) not null,
  headline varchar(180) not null,
  summary text not null,
  views int not null default 0,
  property_clicks int not null default 0,
  whatsapp_clicks int not null default 0,
  action text not null,
  created_at timestamp not null default current_timestamp,
  key weekly_reports_account_idx (account_id, period_start),
  constraint weekly_reports_account_fk
    foreign key (account_id) references client_accounts(id)
    on delete cascade
);

create table if not exists tracking_events (
  id bigint unsigned primary key auto_increment,
  event_type varchar(80) not null,
  property_slug varchar(180) null,
  ad_id varchar(120) null,
  path varchar(500) null,
  referrer varchar(500) null,
  user_agent varchar(500) null,
  metadata json not null,
  created_at timestamp not null default current_timestamp,
  key tracking_event_type_idx (event_type, created_at),
  key tracking_property_idx (property_slug, created_at),
  key tracking_ad_idx (ad_id, created_at)
);

create table if not exists monthly_availability_checks (
  id varchar(64) primary key,
  account_property_id varchar(64) not null,
  scheduled_for date not null,
  status varchar(32) not null default 'pending',
  notes text null,
  completed_at timestamp null,
  created_at timestamp not null default current_timestamp,
  key monthly_checks_property_idx (account_property_id, scheduled_for),
  constraint monthly_checks_property_fk
    foreign key (account_property_id) references client_account_properties(id)
    on delete cascade
);
