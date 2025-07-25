"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [newLayoutName, setNewLayoutName] = useState("");
  const [showCreateLayout, setShowCreateLayout] = useState(false);

  // Get store with all its layouts
  const {
    data: store,
    isLoading,
    refetch,
  } = api.store.getById.useQuery({ id: storeId });

  const createLayoutMutation = api.layout.create.useMutation({
    onSuccess: (layout) => {
      console.log(`✅ Created layout: ${layout.name}`);
      setNewLayoutName("");
      setShowCreateLayout(false);
      refetch();
    },
    onError: (error) => {
      alert(`Failed to create layout: ${error.message}`);
    },
  });

  const deleteLayoutMutation = api.layout.deleteLayout.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateLayout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLayoutName.trim()) {
      alert("Please enter a layout name");
      return;
    }

    try {
      await createLayoutMutation.mutateAsync({
        storeId,
        name: newLayoutName.trim(),
      });
    } catch (error) {
      console.error("Failed to create layout:", error);
    }
  };

  const handleDeleteLayout = async (layoutId: string, layoutName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${layoutName}"? This cannot be undone.`,
      )
    ) {
      try {
        await deleteLayoutMutation.mutateAsync({ layoutId, storeId });
      } catch (error) {
        alert(
          `Failed to delete layout: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading store details...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Store Not Found
          </h1>
          <Link href="/stores" className="text-blue-500 hover:text-blue-700">
            ← Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link
                href="/stores"
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                ← Back to Stores
              </Link>
              <div className="h-4 w-px bg-gray-300" />
              <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
            </div>
            {store.description && (
              <p className="text-gray-600">{store.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {store.layouts.length} layouts • {store._count?.products || 0}{" "}
              products
            </p>
          </div>

          <button
            onClick={() => setShowCreateLayout(true)}
            className="rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
          >
            + Create New Layout
          </button>
        </div>

        {/* Create Layout Modal */}
        {showCreateLayout && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">Create New Layout</h2>
              <form onSubmit={handleCreateLayout}>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Layout Name
                  </label>
                  <input
                    type="text"
                    value={newLayoutName}
                    onChange={(e) => setNewLayoutName(e.target.value)}
                    placeholder="e.g., Summer Layout, Holiday Setup"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLayout(false);
                      setNewLayoutName("");
                    }}
                    className="flex-1 rounded-lg bg-gray-500 py-2 text-white transition-colors hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLayoutMutation.isLoading}
                    className="flex-1 rounded-lg bg-green-500 py-2 text-white transition-colors hover:bg-green-600 disabled:bg-green-300"
                  >
                    {createLayoutMutation.isLoading
                      ? "Creating..."
                      : "Create Layout"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Layouts Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {store.layouts.map((layout, index) => (
            <div
              key={layout.id}
              className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {layout.name}
                  </h3>
                  {index === 0 && (
                    <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      Main Layout
                    </span>
                  )}
                </div>

                {store.layouts.length > 1 && (
                  <button
                    onClick={() => handleDeleteLayout(layout.id, layout.name)}
                    disabled={deleteLayoutMutation.isLoading}
                    className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    🗑️
                  </button>
                )}
              </div>

              <div className="mb-4">
                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    Blocks:{" "}
                    <span className="font-medium">
                      {((layout.blocks as any[]) || []).length}
                    </span>
                  </div>
                  <div>
                    PathPoints:{" "}
                    <span className="font-medium">
                      {((layout.pathPoints as any[]) || []).length}
                    </span>
                  </div>
                  <div>
                    Updated:{" "}
                    <span className="font-medium">
                      {new Date(layout.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/stores/${storeId}/layouts/${layout.id}`}
                className="block w-full rounded-lg bg-blue-500 py-2 text-center text-white transition-colors hover:bg-blue-600"
              >
                🏗️ Edit Layout
              </Link>
            </div>
          ))}
        </div>

        {store.layouts.length === 0 && (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">📋</div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">
              No layouts yet
            </h2>
            <p className="mb-6 text-gray-600">
              Create your first layout to start designing
            </p>
            <button
              onClick={() => setShowCreateLayout(true)}
              className="rounded-lg bg-green-500 px-6 py-3 text-white transition-colors hover:bg-green-600"
            >
              Create First Layout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
