# App Portfolio Analytics

A comprehensive analytics platform for managing and analyzing app portfolio data with AI-powered SQL query generation.

## Features

- **CRUD Operations**: Manage apps, metrics, and queries
- **SQL Query Builder**: Execute pre-built templates and custom SQL queries
- **AI Chat Interface**: Natural language to SQL query generation
- **Real-time Analytics**: Dashboard with key metrics
- **BAML Integration**: Structured AI responses with tool calling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# OpenAI API Key (required for chat functionality)
OPENAI_API_KEY="your-openai-api-key-here"

# Anthropic API Key (optional, for Claude models)
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with sample data
node seed-db.js
```

### 4. BAML Setup (Optional)

If you want to use the full BAML integration:

```bash
# Install BAML CLI
npm install -g @boundaryml/baml

# Generate BAML client
baml generate
```

### 5. Start Development Server

```bash
npm run dev
```

## Usage

### Chat Interface

1. Navigate to the chat section
2. Ask questions in natural language like:
   - "What are the top 3 apps by revenue?"
   - "Show me total downloads by platform"
   - "Compare iOS vs Android performance"
   - "What's the ROI for each app?"

### Query Builder

1. Use pre-built templates for common analytics
2. Write custom SQL queries
3. View results in formatted tables

### App Management

1. Add new apps with revenue, downloads, and UA spend data
2. View and edit existing apps
3. Delete apps as needed

## Architecture

- **Frontend**: Next.js 15 with React and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma ORM
- **AI**: OpenAI GPT-4 with BAML for structured responses
- **Tools**: SQL execution, query templates, database stats

## API Endpoints

- `GET /api/apps` - Get all apps
- `POST /api/apps` - Create new app
- `GET /api/apps/[id]` - Get specific app
- `PUT /api/apps/[id]` - Update app
- `DELETE /api/apps/[id]` - Delete app
- `GET /api/metrics` - Get all metrics
- `POST /api/metrics` - Create new metric
- `GET /api/query` - Get query templates
- `POST /api/query` - Execute SQL query
- `POST /api/chat` - Chat with AI assistant

## Database Schema

### Apps Table
- `id`: Unique identifier
- `name`: App name
- `platform`: iOS or Android
- `country`: App's target country
- `revenue`: Revenue amount
- `popularity`: Download count
- `uaSpend`: User acquisition spend
- `createdAt`, `updatedAt`: Timestamps

### Metrics Table
- `id`: Unique identifier
- `appId`: Reference to app
- `date`: Metric date
- `metricType`: Type of metric (revenue, downloads, etc.)
- `value`: Metric value
- `createdAt`: Timestamp

### Queries Table
- `id`: Unique identifier
- `userId`: User who made the query
- `appId`: Optional app reference
- `queryText`: Natural language query
- `sqlGenerated`: Generated SQL
- `result`: Query result (JSON)
- `timestamp`: Query timestamp

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
