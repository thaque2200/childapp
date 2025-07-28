import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const API_URL_SQL = import.meta.env.VITE_API_URL_SQL;

interface TimelineEntry {
  timestamp: string;
  symptom: string;
  intent: string;
  age: string;
  severity: string;
  duration: string;
}

const CACHE_KEY = "childTimelineCache";
const TIMESTAMP_KEY = "childTimelineCacheTimestamp";
const INTENTS_KEY = "childTimelineIntentCache";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ChildDevelopmentInsights: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<TimelineEntry[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [availableIntents, setAvailableIntents] = useState<string[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // ✅ Handle auth state + initial fetch
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/"); // redirect to login
      } else {
        setAuthorized(true);
        user.getIdToken(true).then((idToken) => {
          fetchTimelineData(idToken);
        });
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [navigate]);

  // ✅ Re-fetch when intent changes (if already authorized)
  useEffect(() => {
    if (!authorized) return;

    const fetch = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken(true);
      fetchTimelineData(token);
    };

    fetch();
  }, [selectedIntent, authorized]);

  // ✅ Core data + cache logic
  const fetchTimelineData = async (idToken: string) => {
    try {
      let parsed: TimelineEntry[] | null = null;

      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(TIMESTAMP_KEY);
      const intentsCache = localStorage.getItem(INTENTS_KEY);
      const now = Date.now();

      const isStale =
        !cached || !timestamp || now - parseInt(timestamp) > ONE_DAY_MS;

      if (isStale || selectedIntent) {
        const res = await axios.get(`${API_URL_SQL}/child-timeline`, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { intent: selectedIntent || undefined }
        });

        parsed = res.data;

        if (!selectedIntent) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
          localStorage.setItem(TIMESTAMP_KEY, now.toString());

          const foundIntents = Array.from(
            new Set(
              parsed
                .map((entry: TimelineEntry) => entry.intent)
                .filter((val) => typeof val === "string" && val.length > 0)
            )
          );
          setAvailableIntents(foundIntents);
          localStorage.setItem(INTENTS_KEY, JSON.stringify(foundIntents));
        }
      } else {
        parsed = JSON.parse(cached);
        const intentList = intentsCache ? JSON.parse(intentsCache) : [];
        setAvailableIntents(intentList);
      }

      setData(
        selectedIntent
          ? parsed.filter((entry) => entry.intent === selectedIntent)
          : parsed
      );
    } catch (error) {
      console.error("Failed to fetch timeline data:", error);
    }
  };

  if (!authChecked) {
    return <div className="text-center mt-20 text-gray-600">Checking authorization...</div>;
  }

  return (
    <div className="p-4">
      {/* Top Bar with Logout */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            auth.signOut();
            navigate("/");
          }}
          className="text-sm text-red-600 font-medium hover:underline"
        >
          Logout
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Symptom Timeline</h2>

      <div className="mb-4">
        <label htmlFor="intentFilter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Intent:
        </label>
        <select
          id="intentFilter"
          value={selectedIntent || ""}
          onChange={(e) => setSelectedIntent(e.target.value || null)}
          className="p-2 border rounded w-full sm:w-64"
        >
          <option value="">All Intents</option>
          {availableIntents.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      <button
        className="text-sm text-blue-600 underline mb-4"
        onClick={() => {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(TIMESTAMP_KEY);
          localStorage.removeItem(INTENTS_KEY);
          setSelectedIntent(null); // re-trigger
        }}
      >
        Refresh timeline data
      </button>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="symptom" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChildDevelopmentInsights;