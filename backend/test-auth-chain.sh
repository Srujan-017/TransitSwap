#!/usr/bin/env bash
# TransitSwap — Phase 1 Authentication Chain Test
# Usage: ./test-auth-chain.sh
# Requires: backend running on localhost:5000 (npm run dev)

BASE="http://localhost:5000/api"
PASS=0
FAIL=0
TOKEN=""
RESP_BODY=""
HTTP_STATUS=""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ PASS${NC}  $1"; ((PASS++)); }
fail() { echo -e "${RED}  ✗ FAIL${NC}  $1"; echo -e "       ${RED}→ $2${NC}"; ((FAIL++)); }
info() { echo -e "\n${BLUE}▸ $1${NC}"; }

# Execute a curl request, storing body in RESP_BODY and status in HTTP_STATUS
do_request() {
  local TMP
  TMP=$(mktemp)
  HTTP_STATUS=$(curl -s -o "$TMP" -w "%{http_code}" "$@")
  RESP_BODY=$(cat "$TMP")
  rm -f "$TMP"
}

check_status() {
  local label="$1" expected="$2"
  if [ "$HTTP_STATUS" = "$expected" ]; then
    ok "$label — HTTP $HTTP_STATUS"
    return 0
  else
    fail "$label — expected HTTP $expected, got HTTP $HTTP_STATUS" "$RESP_BODY"
    return 1
  fi
}

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  TransitSwap Phase 1 — Auth Chain Test       ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── STEP 0: Validation failure → 400 ────────────────────────────────
info "STEP 0 — Validation: bad payload → 400"
do_request -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"not-an-email","password":"123"}'

if check_status "Validation failure returns 400" "400"; then
  HAS_ERRORS=$(echo "$RESP_BODY" | grep -o '"errors":{')
  if [ -n "$HAS_ERRORS" ]; then
    ok "Validation response includes field-level errors object"
  else
    fail "Validation response missing field-level errors object" "$RESP_BODY"
  fi
fi

# ── STEP 1: Health check ──────────────────────────────────────────────
info "STEP 1 — GET /api/health → 200"
do_request "$BASE/health"
if check_status "Health endpoint" "200"; then
  DB=$(echo "$RESP_BODY" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
  ok "DB status: $DB"
fi

# ── STEP 2: Successful registration → 201 ────────────────────────────
info "STEP 2 — POST /api/auth/register → 201"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@transitswap.test"
TEST_NAME="Test User"
TEST_PASS="TestPass@1234"
TEST_PROFILE="wheelchair"

do_request -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_NAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASS\",
    \"accessibilityProfile\": \"$TEST_PROFILE\"
  }"

REGISTRATION_OK=0
if check_status "Registration returns 201" "201"; then
  REGISTRATION_OK=1
  TOKEN=$(echo "$RESP_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$TOKEN" ]; then
    ok "Registration returns JWT token"
  else
    fail "Registration response missing token" "$RESP_BODY"
  fi

  STORED_PROFILE=$(echo "$RESP_BODY" | grep -o '"accessibilityProfile":"[^"]*"' | cut -d'"' -f4)
  if [ "$STORED_PROFILE" = "$TEST_PROFILE" ]; then
    ok "accessibilityProfile preserved as '$STORED_PROFILE'"
  else
    fail "accessibilityProfile mismatch — sent '$TEST_PROFILE', got '$STORED_PROFILE'" "$RESP_BODY"
  fi

  PW_LEAK=$(echo "$RESP_BODY" | grep -o '"password"')
  if [ -z "$PW_LEAK" ]; then
    ok "Password NOT exposed in registration response"
  else
    fail "Password leaked in registration response" "$RESP_BODY"
  fi
fi

if [ "$REGISTRATION_OK" -eq 0 ]; then
  echo -e "\n${RED}  ✗ Registration failed — skipping dependent tests (steps 3, 4, 5, 6)${NC}"
  ((FAIL+=5))
else

  # ── STEP 3: Duplicate email → 409 ──────────────────────────────────
  info "STEP 3 — Duplicate email → 409"
  do_request -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Dup\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"

  if check_status "Duplicate email returns 409" "409"; then
    MSG=$(echo "$RESP_BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$MSG" ]; then
      ok "Duplicate email error message present: $MSG"
    else
      fail "Duplicate email response missing message field" "$RESP_BODY"
    fi
  fi

  # ── STEP 4: Successful login → 200 ─────────────────────────────────
  info "STEP 4 — POST /api/auth/login → 200"
  do_request -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"

  if check_status "Login returns 200" "200"; then
    LOGIN_TOKEN=$(echo "$RESP_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$LOGIN_TOKEN" ]; then
      ok "Login returns JWT token"
      TOKEN="$LOGIN_TOKEN"
    else
      fail "Login response missing token" "$RESP_BODY"
    fi
  fi

  # ── STEP 5: Wrong password → 401 ───────────────────────────────────
  info "STEP 5 — Wrong password → 401"
  do_request -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword\"}"
  check_status "Wrong password returns 401" "401"

  # ── STEP 6: GET /me with valid token → 200 ─────────────────────────
  info "STEP 6 — GET /api/auth/me (valid token) → 200"
  do_request -X GET "$BASE/auth/me" \
    -H "Authorization: Bearer $TOKEN"

  if check_status "Authenticated /me returns 200" "200"; then
    RETURNED_EMAIL=$(echo "$RESP_BODY" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    if [ "$RETURNED_EMAIL" = "$TEST_EMAIL" ]; then
      ok "/me returns correct email: $RETURNED_EMAIL"
    else
      fail "/me email mismatch — expected $TEST_EMAIL, got $RETURNED_EMAIL" "$RESP_BODY"
    fi

    PW_LEAK=$(echo "$RESP_BODY" | grep -o '"password"')
    if [ -z "$PW_LEAK" ]; then
      ok "Password NOT exposed in /me response"
    else
      fail "Password leaked in /me response" "$RESP_BODY"
    fi
  fi

fi  # end REGISTRATION_OK block

# ── STEP 7: Missing token → 401 ──────────────────────────────────────
info "STEP 7 — GET /api/auth/me (no token) → 401"
do_request -X GET "$BASE/auth/me"
check_status "Missing token returns 401" "401"

# ── STEP 8: Invalid token → 401 ──────────────────────────────────────
info "STEP 8 — GET /api/auth/me (invalid token) → 401"
do_request -X GET "$BASE/auth/me" \
  -H "Authorization: Bearer thisisnotavalidtoken"
check_status "Invalid token returns 401" "401"

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════${NC}"
echo -e "  PASSED: ${GREEN}$PASS${NC}  |  FAILED: ${RED}$FAIL${NC}"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  PHASE 1 AUTH CHAIN: ALL TESTS PASSED ✅${NC}"
else
  echo -e "${RED}  PHASE 1 AUTH CHAIN: $FAIL TEST(S) FAILED ❌${NC}"
fi
echo -e "${YELLOW}══════════════════════════════════════════════${NC}"
echo ""
