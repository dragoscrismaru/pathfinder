"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { useState } from "react";

export default function StoresPage() {
  const { data: stores, isLoading, refetch } = api.store.getAll.useQuery();
  const deleteStoreMutation = api.store.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This cannot be undone.`,
      )
    ) {
      setDeletingId(id);
      try {
        await deleteStoreMutation.mutateAsync({ id });
      } catch (error) {
        console.error("Failed to delete store:", error);
        alert("Failed to delete store. Please try again.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading your stores...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">My Stores</h1>
            <p className="mt-2 text-gray-600">
              Manage your store layouts and designs
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-lg bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
            >
              ← Back to Home
            </Link>
            <Link
              href="/stores/new"
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              + Create New Store
            </Link>
          </div>
        </div>

        {/* Stores Grid */}
        {stores && stores.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className="rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between">
                  <h3 className="truncate text-xl font-semibold text-gray-900">
                    {store.name}
                  </h3>
                  <button
                    onClick={() => handleDelete(store.id, store.name)}
                    disabled={deletingId === store.id}
                    className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === store.id ? "..." : "🗑️"}
                  </button>
                </div>

                {store.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                    {store.description}
                  </p>
                )}

                <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                  <span>{store.layouts.length} layouts</span>
                  <span>{store._count.products} products</span>
                  <span>
                    Updated {new Date(store.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* 🆕 Updated button - goes to store detail page */}
                <Link
                  href={`/stores/${store.id}`}
                  className="block w-full rounded-lg bg-blue-500 py-2 text-center text-white transition-colors hover:bg-blue-600"
                >
                  📋 Manage Layouts
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">🏪</div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">
              No stores yet
            </h2>
            <p className="mb-6 text-gray-600">
              Create your first store to start designing layouts
            </p>
            <Link
              href="/stores/new"
              className="inline-block rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600"
            >
              Create Your First Store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
