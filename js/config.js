/* Settings that change between machines or between now and the event.
   This is the only file that needs editing to go live.

   No ES modules anywhere in this app: `type="module"` is blocked on file://
   origins, which is where production runs (ADR-0011). Plain scripts, one global. */

window.CXA = window.CXA || {};

CXA.config = {
  version: '1.0.0',

  /* Which laptop this is. Shows in the admin panel and on every record, so two
     machines can be told apart when reconciling after the event. */
  device: 'unnamed-macbook',

  /* Production is the folder of files opened from disk; anything served over
     http(s) is the dev environment and writes to the dev table (ADR-0011). */
  get env() { return location.protocol === 'file:' ? 'production' : 'dev'; },
  get isProduction() { return this.env === 'production'; },

  supabase: {
    url: '',                        // https://<project>.supabase.co
    anonKey: '',                    // write-only anon key, RLS insert-only
    table: 'audits',                // production
    devTable: 'audits_dev'          // anything not opened from file://
  },

  /* Theo's HubSpot meetings page (ADR-0010). Angelo owns the UTM values —
     open question 3. */
  bookingUrl: 'https://meetings.hubspot.com/theodore-burns/ecom-expo-2026-with-gorgias',
  bookingUtm: {
    utm_source: 'ecommerce-expo-london',
    utm_medium: 'booth',
    utm_campaign: 'cx-automation-audit-2026'   // PLACEHOLDER — confirm with Angelo
  },

  /* Staff PIN for the admin panel (ADR-0005). Change it before the event and
     keep it in the setup guide, not in this repo. */
  pin: '2609',

  /* Idle timeouts in seconds (ADR-0005). */
  idle: { form: 120, question: 120, results: 300, warning: 10 },

  /* How often to retry a failed sync, in seconds. */
  syncRetrySeconds: 60,

  /* The stand number printed on the closing screen. */
  standNumber: '[STAND]'
};

CXA.config.tableName = function () {
  return CXA.config.isProduction ? CXA.config.supabase.table : CXA.config.supabase.devTable;
};
