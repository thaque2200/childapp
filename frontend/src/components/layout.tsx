// src/components/Layout.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

const tabs = [
  { name: "Smart Parent Assistant", path: "/smart-parent-chat" },
  { name: "Child Development Insights", path: "/child-insights" },
  { name: "Parental Well-being & Coaching", path: "/parents-insights" },
  { name: "Milestone Inference Engine", path: "/milestone-inference" },
];

const Layout: React.FC<{ children: React.ReactNode; onLogout: () => void }> = ({ children, onLogout }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <header className="bg-white shadow-sm py-3 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold">Parent Assistant</h1>
        <button
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded"
        >
          Logout
        </button>
      </header>

      <nav className="flex gap-4 px-6 py-2 bg-gray-100 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            to={tab.path}
            className={`px-3 py-1 rounded ${
              location.pathname === tab.path
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-blue-100"
            }`}
          >
            {tab.name}
          </Link>
        ))}
      </nav>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default Layout;