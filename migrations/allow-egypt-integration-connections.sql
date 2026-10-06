-- ARWA/Egypt may configure shared integration connectors. The connector
-- catalogue remains profile filtered by the API; this widens only the row
-- market constraint and does not create or activate connections.
alter table public.integration_connections
  drop constraint if exists integration_connections_market_profile_check;
alter table public.integration_connections
  add constraint integration_connections_market_profile_check
  check (market_profile in ('INDIA', 'UAE', 'EGYPT', 'SHARED'));
