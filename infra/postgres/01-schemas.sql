-- One database, two schemas, two least-privilege users (mirror this setup in PlanetScale).
CREATE ROLE cetus_billing LOGIN PASSWORD 'cetus';
CREATE ROLE cetus_auth LOGIN PASSWORD 'cetus';

CREATE SCHEMA billing AUTHORIZATION cetus_billing;  -- Flyway (Java)
CREATE SCHEMA auth AUTHORIZATION cetus_auth;        -- Drizzle (Better Auth)

-- drizzle-kit migrate always runs CREATE SCHEMA IF NOT EXISTS "auth", and Postgres
-- checks CREATE on the database before honoring IF NOT EXISTS.
GRANT CREATE ON DATABASE cetus TO cetus_auth;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
