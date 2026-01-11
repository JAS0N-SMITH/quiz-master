#!/bin/bash

# QuizMaster Setup Script
# This script sets up the complete project for development

set -e

echo "🚀 Setting up QuizMaster project..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}❌ Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Check if PostgreSQL is accessible
echo -e "${BLUE}📦 Checking PostgreSQL connection...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found. Make sure PostgreSQL is installed and accessible.${NC}"
    echo -e "${YELLOW}   If using Docker, ensure the container is running.${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL client found${NC}"
fi

# Install root dependencies
echo -e "${BLUE}📦 Installing root dependencies...${NC}"
npm install

# Install API dependencies
echo -e "${BLUE}📦 Installing API dependencies...${NC}"
cd quizmaster-api
npm install
cd ..

# Install UI dependencies
echo -e "${BLUE}📦 Installing UI dependencies...${NC}"
cd quizmaster-ui
npm install
cd ..

# Generate Prisma Client
echo -e "${BLUE}📦 Generating Prisma Client...${NC}"
cd quizmaster-api
npx prisma generate
cd ..

# Run database migrations
echo -e "${BLUE}📦 Running database migrations...${NC}"
cd quizmaster-api
echo -e "${YELLOW}⚠️  Make sure your database is running and DATABASE_URL is set in .env${NC}"
npx prisma migrate dev --name init || echo -e "${YELLOW}⚠️  Migration failed or already applied. Continuing...${NC}"
cd ..

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "   1. Make sure PostgreSQL is running"
echo -e "   2. Create a .env file in quizmaster-api/ with your DATABASE_URL"
echo -e "   3. Run 'npm run dev' to start both API and UI"
echo ""
