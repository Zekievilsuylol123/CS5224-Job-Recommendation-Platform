#!/bin/bash

# API Endpoint Testing Script
# Tests all endpoints in the application

BASE_URL="http://localhost:8080/api"
AUTH_TOKEN="" # Will be set after login

echo "========================================="
echo "API Endpoint Testing"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local content_type=$5
    
    echo -e "${YELLOW}Testing:${NC} $description"
    echo "  → $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    elif [ "$method" = "POST" ]; then
        if [ -n "$content_type" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                -H "Content-Type: $content_type" \
                -d "$data" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" 2>&1)
        fi
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $AUTH_TOKEN" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Success (HTTP $http_code)${NC}"
        # Show first 200 chars of response
        echo "$body" | head -c 200
        echo "..."
    else
        echo -e "  ${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "$body"
    fi
    echo ""
}

echo "========================================="
echo "1. Health & Metadata Endpoints"
echo "========================================="
echo ""

test_endpoint "GET" "/health" "Health Check"
test_endpoint "GET" "/plans" "Get Plans"
test_endpoint "GET" "/jobs/meta/filters" "Get Job Filters Metadata"

echo ""
echo "========================================="
echo "2. Jobs Endpoints"
echo "========================================="
echo ""

test_endpoint "GET" "/jobs?limit=5" "Get Jobs List"
test_endpoint "GET" "/jobs?search=data&limit=5" "Search Jobs"
test_endpoint "GET" "/jobs/software-engineer-grab-singapore" "Get Job Detail (sample ID)"

echo ""
echo "========================================="
echo "3. Profile Endpoints (Requires Auth)"
echo "========================================="
echo ""

echo -e "${YELLOW}Note:${NC} Profile endpoints require authentication."
echo "Please set AUTH_TOKEN environment variable with a valid Supabase session token."
echo "Example: export AUTH_TOKEN='your-session-token-here'"
echo ""

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}⚠ AUTH_TOKEN not set. Skipping authenticated endpoints.${NC}"
    echo "To get a token:"
    echo "1. Open browser dev tools"
    echo "2. Login to the app"
    echo "3. Go to Application > Local Storage > supabase.auth.token"
    echo "4. Copy the access_token value"
    echo ""
else
    test_endpoint "GET" "/profile" "Get User Profile"
    test_endpoint "PUT" "/profile" "Update Profile" '{"name":"Test User","skills":["JavaScript","React"]}'
    
    echo ""
    echo "========================================="
    echo "4. Knowledge Sources Endpoints"
    echo "========================================="
    echo ""
    
    test_endpoint "GET" "/knowledge-sources" "Get Knowledge Sources"
    test_endpoint "POST" "/knowledge-sources/text" "Add Manual Text Source" '{"content":"I am a software engineer with 5 years of experience in React and Node.js"}'
    
    echo ""
    echo "========================================="
    echo "5. Preferences Endpoints"
    echo "========================================="
    echo ""
    
    test_endpoint "GET" "/preferences" "Get User Preferences"
    # Don't test predict automatically as it may fail without knowledge sources
    echo -e "${YELLOW}Skipping:${NC} POST /preferences/predict (requires knowledge sources)"
    
    echo ""
    echo "========================================="
    echo "6. Applications Endpoints"
    echo "========================================="
    echo ""
    
    test_endpoint "GET" "/applications" "Get Applications List"
    
    echo ""
    echo "========================================="
    echo "7. Resume Endpoints"
    echo "========================================="
    echo ""
    
    test_endpoint "GET" "/resume/analyses" "Get Resume Analyses"
    
    echo ""
    echo "========================================="
    echo "8. Material Generation Endpoints"
    echo "========================================="
    echo ""
    
    echo -e "${YELLOW}Note:${NC} Material generation requires valid job IDs and knowledge sources."
    echo -e "${YELLOW}Skipping${NC} to avoid unnecessary LLM API calls."
fi

echo ""
echo "========================================="
echo "Testing Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Green (✓): Endpoint working correctly"
echo "- Red (✗): Endpoint failed"
echo "- Yellow: Skipped or requires manual setup"
echo ""
