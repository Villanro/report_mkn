import { NavLink, Outlet } from "react-router-dom";
import { FilterBar } from "@/components/FilterBar";
import { useFilters } from "@/lib/useFilters";
import { useAuth } from "@/lib/useAuth";

const NAV_ITEMS = [
  { to: "/", label: "BSC Principal", end: true },
  { to: "/detail", label: "All Detail" },
  { to: "/dp/1", label: "DP1" },
  { to: "/dp/2", label: "DP2" },
  { to: "/dp/6", label: "DP6" },
  { to: "/delivery", label: "Delivery" },
  { to: "/sos", label: "SOS" },
];

export function Layout() {
  const filters = useFilters();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200 bg-white px-4 py-2 print:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            Daily BSC — AETOS Bahamas
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              Imprimir / PDF
            </button>
            {user && (
              <button
                type="button"
                onClick={() => logout()}
                className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Salir ({user.username})
              </button>
            )}
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <FilterBar
        options={filters.options}
        selection={filters.selection}
        onChange={filters.setSelection}
      />
      {filters.error && (
        <p className="bg-red-50 px-4 py-1 text-xs text-red-700 print:hidden">{filters.error}</p>
      )}

      <main className="flex-1 p-4">
        <Outlet context={filters} />
      </main>
    </div>
  );
}
