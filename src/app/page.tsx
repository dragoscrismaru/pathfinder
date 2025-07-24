import Link from "next/link";
import { api, HydrateClient } from "@/trpc/server";

export default async function HomePage() {
  // Prefetch stores data for better performance
  void api.store.getAll.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-900">
              Store Layout Designer
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              Design your store layout with precision. Create floor plans, place
              products, and find optimal paths for customer navigation.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-12 flex justify-center gap-4">
            <Link
              href="/stores/new"
              className="rounded-lg bg-blue-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-600"
            >
              🏪 Create New Store
            </Link>
            <Link
              href="/stores"
              className="rounded-lg bg-green-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-600"
            >
              📋 My Stores
            </Link>
          </div>

          {/* Features Grid */}
          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-3xl">🏗️</div>
              <h3 className="mb-2 text-xl font-semibold">Layout Designer</h3>
              <p className="text-gray-600">
                Create precise store layouts with walls, rooms, shelves, and
                counters using an intuitive drag-and-drop interface.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-3xl">📐</div>
              <h3 className="mb-2 text-xl font-semibold">DXF Import</h3>
              <p className="text-gray-600">
                Import existing AutoCAD floor plans and convert them
                automatically into editable store layouts.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-3xl">🗺️</div>
              <h3 className="mb-2 text-xl font-semibold">Smart Navigation</h3>
              <p className="text-gray-600">
                Advanced pathfinding algorithm helps customers find products
                efficiently, just like Google Maps.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-3xl">📦</div>
              <h3 className="mb-2 text-xl font-semibold">Product Placement</h3>
              <p className="text-gray-600">
                Place products on shelves and walls, then let customers search
                and navigate directly to items.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-3xl">🔄</div>
              <h3 className="mb-2 text-xl font-semibold">Real-time Editing</h3>
              <p className="text-gray-600">
                Make changes instantly with live preview, grid snapping, and
                collision detection for perfect layouts.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 text-3xl">💾</div>
              <h3 className="mb-2 text-xl font-semibold">Cloud Storage</h3>
              <p className="text-gray-600">
                Your store layouts are automatically saved to the cloud with
                full version history and backup.
              </p>
            </div>
          </div>

          {/* Recent Stores Section */}
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold">Get Started</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-medium">🚀 Quick Start</h3>
                <ol className="list-inside list-decimal space-y-2 text-gray-600">
                  <li>Create a new store or import DXF file</li>
                  <li>Design your layout with walls and fixtures</li>
                  <li>Add products to shelves and displays</li>
                  <li>Test navigation with pathfinding</li>
                </ol>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-medium">
                  ⌨️ Keyboard Shortcuts
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>1-8: Select tools • 9,0: Place start/end points</div>
                  <div>R: Rotate • Del: Delete • O: Toggle overlap</div>
                  <div>Esc: Select tool • Shift+Click: Pan view</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
