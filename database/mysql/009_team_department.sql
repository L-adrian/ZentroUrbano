-- Department where each team member works (slug from src/lib/regions.ts). /nuestro-equipo shows
-- only the people of the department the visitor chose. Everyone registered before stays in
-- Santa Cruz. Run after 008_team_and_visits.
ALTER TABLE team_members ADD COLUMN department VARCHAR(40) NOT NULL DEFAULT 'santa-cruz' AFTER level;
ALTER TABLE team_members ADD KEY team_members_department_idx (department, status);
