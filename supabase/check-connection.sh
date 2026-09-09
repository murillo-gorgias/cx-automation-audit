#!/bin/bash
# Checks that the Supabase project is set up the way the app needs.
#
#   bash supabase/check-connection.sh
#
# It reads the URL and key straight out of js/config.js, so it always tests what
# the app would actually do. It writes one row flagged test = true, which Angelo
# filters out, and never touches anything else.

set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
URL=$(grep -o "url: '[^']*'"     "$HERE/js/config.js" | head -1 | cut -d"'" -f2)
KEY=$(grep -o "anonKey: '[^']*'" "$HERE/js/config.js" | head -1 | cut -d"'" -f2)

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "config.js has no Supabase URL or key yet. Nothing to check."
  exit 1
fi
echo "project: $URL"
echo

ID=$(uuidgen | tr 'A-Z' 'a-z')
row () {
  printf '{"id":"%s","created_at":"%s","synced_at":null,' "$ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '"first_name":"Connection","last_name":"Check","email":"check@example.com",'
  printf '"company":"Setup check","website":null,"consent":true,'
  printf '"role":"CX or support lead","platform":"Shopify or Shopify Plus","migration_interest":null,'
  printf '"channels":["Email"],"automation_today":"Nothing automated",'
  printf '"tickets_band":"1,000 - 5,000","tickets_value":3000,"agents_band":"3 - 5","agents_value":4,'
  printf '"traffic_band":"10,000 - 50,000","traffic_value":30000,"aov_band":"50 - 100","aov_value":75,'
  printf '"score_band":"Reactive","plan_recommended":"Pro",'
  printf '"cost_saved_annual":106630,"sa_revenue_annual":1162,"total_value_annual":107792,'
  printf '"return_multiple":8.42,"booking":%s,"test":true,' "$1"
  printf '"device":"connection-check","app_version":"1.0.0"}'
}

call () {  # method path body -> prints the status code
  local m=$1 p=$2 b=${3:-}
  if [ -n "$b" ]; then
    curl -s -o /tmp/cxa-check.txt -w "%{http_code}" -X "$m" "$URL/rest/v1/$p" \
      -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      -H "Prefer: return=minimal,resolution=merge-duplicates" -d "$b"
  else
    curl -s -o /tmp/cxa-check.txt -w "%{http_code}" -X "$m" "$URL/rest/v1/$p" \
      -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
  fi
}

report () {  # label expectation code
  local label=$1 want=$2 code=$3
  if [ "$want" = "ok" ]; then
    case "$code" in
      2*) echo "  PASS  $label (HTTP $code)"; return 0;;
      *)  echo "  FAIL  $label (HTTP $code)"; sed 's/^/        /' /tmp/cxa-check.txt | head -2; return 1;;
    esac
  else
    case "$code" in
      401|403) echo "  PASS  $label is refused, as it must be (HTTP $code)"; return 0;;
      2*) echo "  FAIL  $label SUCCEEDED. The key can do this and must not."; return 1;;
      *)  echo "  ?     $label gave HTTP $code"; sed 's/^/        /' /tmp/cxa-check.txt | head -2; return 1;;
    esac
  fi
}

bad=0
echo "Writing, which the app needs:"
report "add a row to audits_dev" ok "$(call POST audits_dev "$(row null)")"     || bad=1
report "add a row to audits"     ok "$(call POST audits     "$(row null)")"     || bad=1
report "set the booking on it"   ok "$(call POST audits     "$(row '"booked"')")" || bad=1
echo
echo "Reading and deleting, which the key must never be able to do:"
report "reading the leads"  no "$(call GET    'audits?select=email&limit=1')" || bad=1
report "deleting a lead"    no "$(call DELETE "audits?id=eq.$ID")"            || bad=1
echo
if [ "$bad" = 0 ]; then
  echo "All good. The app will sync."
else
  echo "Something is off. A 401 or 403 on a write usually means the grants in"
  echo "supabase/schema.sql did not apply. Run that file again, whole, nothing selected."
fi
exit "$bad"
