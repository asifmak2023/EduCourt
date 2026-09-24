"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </main>
    );
  }

  const modules = Array.from(
    new Set(user.permissions.map((permission) => permission.split(".")[0]))
  ).sort();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {user.institution?.name ?? "Institution"}
            </p>
            <p className="text-xs text-slate-500">
              {user.campus?.name ?? "All campuses"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace("/login"));
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          This is the foundation shell. Module dashboards are added phase by
          phase.
        </p>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Roles" value={user.roles.length} />
          <StatCard label="Permissions" value={user.permissions.length} />
          <StatCard label="Modules" value={modules.length} />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Your roles</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Accessible modules
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {modules.map((module) => (
                <span
                  key={module}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
