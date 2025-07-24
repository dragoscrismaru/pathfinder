✨ Features
🏗️ Layout Designer

Drag & Drop Interface: Intuitive block-based design system
Grid Snapping: Precise 0.1m alignment for professional layouts
Real-time Editing: Instant visual feedback with optimistic updates
Collision Detection: Prevent overlapping blocks (with toggle override)

📐 Smart Building Tools

Multiple Block Types: Walls, rooms, shelves, counters, checkouts, entrances
DXF Import: Import AutoCAD floor plans automatically
Rotation System: 90° increments with automatic dimension adjustment
Measurement System: Real-world meters for accurate scaling

🗺️ Navigation & Pathfinding

A Algorithm\*: Intelligent pathfinding with obstacle avoidance
Start/End Points: Visual route planning system
Path Optimization: Automatic route simplification
Distance Calculation: Real-world path measurements

💾 Data Management

Auto-Save: Changes saved automatically every 2 seconds
Cloud Storage: PostgreSQL database with Prisma ORM
Version Control: Track layout changes and updates
Real-time Sync: Multi-device synchronization

🚀 Tech Stack
Built with the T3 Stack for maximum developer experience and performance:

Next.js 14 - React framework with App Router
TypeScript - End-to-end type safety
tRPC - Typesafe API layer
Prisma - Database ORM with migrations
Tailwind CSS - Utility-first styling
PostgreSQL - Production database
Zod - Runtime type validation

📦 Installation
Prerequisites

Node.js 18.17 or later
PostgreSQL database
Docker (optional, for local database)

1. Clone the Repository
   bashgit clone https://github.com/yourusername/store-layout-designer.git
   cd store-layout-designer
2. Install Dependencies
   bashnpm install
3. Environment Setup
   Create a .env file in the root directory:
   env# Database
   DATABASE_URL="postgresql://username:password@localhost:5432/store_layout_designer"

# NextAuth.js (Optional)

NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Development

NODE_ENV="development" 4. Database Setup
Option A: Docker (Recommended)
bash# Start PostgreSQL with Docker
docker run --name store-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=store_layout_designer -p 5432:5432 -d postgres:15

# Or use Docker Compose

docker-compose up -d
Option B: Local PostgreSQL
Install PostgreSQL locally and create a database named store_layout_designer. 5. Database Migration
bash# Generate Prisma client
npx prisma generate

# Run database migrations

npx prisma db push

# (Optional) Seed database

npx prisma db seed 6. Start Development Server
bashnpm run dev
Open http://localhost:3000 in your browser! 🎉
🎮 Usage Guide
Getting Started

Create Store: Click "Create New Store" on the homepage
Design Layout: Use toolbar to select tools (1-8 keys)
Place Blocks: Click on canvas to place walls, shelves, etc.
Navigate: Use start/end points for pathfinding

Keyboard Shortcuts
KeyAction1-8Select tools (Select, Wall, Room, Shelf, Counter, Entrance, Checkout, Building)9, 0Place start/end points for pathfindingRRotate selected blockDelDelete selected blockOToggle overlap modeEscSwitch to select toolCtrl+SManual saveShift+ClickPan viewport
Advanced Features
DXF Import

Click "Import DXF" in toolbar
Select your AutoCAD file
Configure import settings (layers, scale, filters)
Review and confirm import

Pathfinding

Select start point tool (9) and click on canvas
Select end point tool (0) and click destination
Click "Find Path" to calculate optimal route
View distance and path visualization

Overlap Mode

Enable to allow blocks to overlap
Red highlighting shows overlapping areas
Useful for complex layouts and design flexibility

🏗️ Project Structure
src/
├── app/ # Next.js App Router pages
│ ├── api/trpc/ # tRPC API endpoints
│ ├── stores/ # Store management pages
│ └── page.tsx # Homepage
├── components/ # Reusable UI components
│ ├── Canvas.tsx # Main drawing canvas
│ ├── Toolbar.tsx # Tool selection bar
│ ├── PropertiesPanel.tsx # Block properties editor
│ └── ui/ # Shadcn UI components
├── hooks/ # Custom React hooks
│ └── useStoreLayout.ts # Main layout state management
├── lib/ # Utility functions
│ ├── collision.ts # Collision detection algorithms
│ ├── pathfinding.ts # A\* pathfinding implementation
│ ├── geometry.ts # Coordinate transformations
│ └── blockConfig.ts # Block type configurations
├── server/ # tRPC server configuration
│ ├── api/ # API routers
│ └── db.ts # Database connection
├── types/ # TypeScript type definitions
└── styles/ # Global styles
🔧 Configuration
Block Types
Customize block types in src/lib/blockConfig.ts:
typescriptconst BLOCK_CONFIGS: Record<StoreBlockType, BlockConfig> = {
wall: { width: 1, height: 3, color: "#8B4513" },
shelf: { width: 1, height: 4, color: "#DDD" },
// Add your custom block types...
};
Pathfinding Settings
Adjust pathfinding parameters in src/lib/pathfinding.ts:
typescriptexport const PATHFINDING_CLEARANCE = 0.1; // Obstacle clearance (meters)
export const PATHFINDING_GRID_SIZE = 0.4; // Grid resolution (meters)
export const MAX_PATHFINDING_ITERATIONS = 20000; // Performance limit
🚀 Deployment
Vercel (Recommended)

Push your code to GitHub
Connect repository to Vercel
Add environment variables in Vercel dashboard
Deploy automatically on git push

Alternative Platforms

Railway: Great for full-stack apps with database
Render: Free tier available with PostgreSQL addon
AWS/GCP/Azure: For enterprise deployments

Environment Variables for Production
envDATABASE_URL="your-production-database-url"
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
🛠️ Development
Database Management
bash# View database in browser
npx prisma studio

# Reset database

npx prisma db push --force-reset

# Generate new migration

npx prisma migrate dev --name your-migration-name
Code Quality
bash# Type checking
npm run type-check

# Linting

npm run lint

# Formatting

npm run format
Testing
bash# Run tests
npm run test

# Run tests in watch mode

npm run test:watch
🤝 Contributing
We welcome contributions! Please follow these steps:

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

Development Guidelines

Follow TypeScript best practices
Write tests for new features
Update documentation for API changes
Use conventional commit messages
Ensure all tests pass before submitting

📝 API Documentation
tRPC Endpoints
Stores

store.getAll - Get all stores
store.getById - Get store with layout data
store.create - Create new store
store.updateLayout - Save layout changes
store.delete - Delete store

Products (Future)

product.getByStore - Get products for store
product.create - Add product to store
product.updatePosition - Move product location

🐛 Troubleshooting
Common Issues
Database Connection Error
bash# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify DATABASE_URL format

# postgresql://username:password@localhost:5432/database_name

Prisma Client Error
bash# Regenerate Prisma client
npx prisma generate

# Reset and migrate database

npx prisma db push --force-reset
TypeScript Errors
bash# Restart TypeScript server in VSCode

# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"

# Clear Next.js cache

rm -rf .next
npm run dev
Performance Issues

Enable auto-save debouncing in production
Use batch updates for multiple changes
Optimize database queries with proper indexing

📊 Performance Tips
Frontend Optimization

Debounce saves to reduce API calls
Use React.memo for expensive components
Implement virtualization for large layouts
Optimize SVG rendering with viewBox updates

Backend Optimization

Index database queries on storeId and updatedAt
Use database pooling for concurrent users
Implement caching with Redis (optional)
Batch similar operations to reduce round trips

Database Schema
sql-- Recommended indexes
CREATE INDEX idx_layouts_store_id ON layouts(store_id);
CREATE INDEX idx_layouts_updated_at ON layouts(updated_at);
CREATE INDEX idx_products_store_id ON products(store_id);
