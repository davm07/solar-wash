import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import VioIcon from "../components/icons/VioIcon";

export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* TOP BAR */}
      <header className="h-20 bg-olive-300 text-gray-900 flex items-center justify-between px-4 m-3 rounded-lg shadow-sm">
        <div className="flex items-center gap-4 ">
          <VioIcon className="h-fit" />
          <h1 className="font-bold w-full">Solar Wash Dashboard</h1>
        </div>

        <div className="flex items-center justify-center gap-4">
          <span className="text-sm opacity-90 text-center">
            {user?.name} ({user?.role})
          </span>

          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm text-white"
          >
            Logout
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 mx-3 mb-3">
        {/* SIDEBAR */}
        {/* <aside className="w-64 bg-olive-200/60 p-4 rounded-lg mr-3">
          <nav className="flex flex-col gap-2">
            <button className="text-left hover:bg-olive-300 p-2 rounded transition ">
              Plants
            </button>

            <button className="text-left hover:bg-olive-300 p-2 rounded transition ">
              Sessions
            </button>

            {user?.role === "admin" && (
              <button className="text-left hover:bg-olive-300 p-2 rounded">
                Admin Panel
              </button>
            )}
          </nav>
        </aside> */}

        {/* MAIN CONTENT */}
        <main className="flex-1 mt-3 overflow-auto rounded-lg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
