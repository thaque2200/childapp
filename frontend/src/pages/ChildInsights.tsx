import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase";
import { format } from "date-fns";

const API_URL_SQL = import.meta.env.VITE_API_URL_SQL;

interface TimelineEntry {
  timestamp: string;
  symptom: string;
  intent: string;
  age: string;
  severity: string;
  duration: string;
  associated_symptoms?: string[];
}

const CACHE_KEY = "childTimelineCache";
const TIMESTAMP_KEY = "childTimelineCacheTimestamp";
const INTENTS_KEY = "childTimelineIntentCache";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Generate consistent colors for different intents
const getColorForIntent = (intent: string) => {
  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#14b8a6", "#e11d48", "#f97316", "#6366f1"
  ];
  let hash = 0;
  for (let i = 0; i < intent.length; i++) {
    hash = intent.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

const ChildDevelopmentInsights: React.FC = () => {
  const [data, setData] = useState<TimelineEntry[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [availableIntents, setAvailableIntents] = useState<string[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      setAuthChecked(true);
      user.getIdToken(true).then((idToken) => {
        fetchTimelineData(idToken);
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const el = document.querySelector(".timeline-container");
    el?.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [data]);

  useEffect(() => {
    if (!authChecked) return;
    const fetch = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken(true);
      fetchTimelineData(token);
    };
    fetch();
  }, [selectedIntent]);

  const fetchTimelineData = async (idToken: string) => {
    try {
      setLoading(true); // add this
      let parsed: TimelineEntry[] = [];
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(TIMESTAMP_KEY);
      const intentsCache = localStorage.getItem(INTENTS_KEY);
      const now = Date.now();
      const isStale = !cached || !timestamp || now - parseInt(timestamp) > ONE_DAY_MS;

      if (isStale || selectedIntent) {
        const res = await axios.get(`${API_URL_SQL}/child-timeline`, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { intent: selectedIntent || undefined },
        });

        parsed = res.data;

        if (!selectedIntent) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
          localStorage.setItem(TIMESTAMP_KEY, now.toString());

          const foundIntents = Array.from(
            new Set(
              parsed.map((entry: TimelineEntry) => entry.intent).filter(Boolean)
            )
          );
          setAvailableIntents(foundIntents);
          localStorage.setItem(INTENTS_KEY, JSON.stringify(foundIntents));
        }
      } else {
        try {
          parsed = JSON.parse(cached);
        } catch (e) {
          console.warn("Corrupt cache, clearing...");
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(TIMESTAMP_KEY);
        }
        const intentList = intentsCache ? JSON.parse(intentsCache) : [];
        setAvailableIntents(intentList);
        setLoading(false); // ✅ ensure this is set here too
      }

      setData(
        selectedIntent
          ? parsed.filter((entry) => entry.intent === selectedIntent)
          : parsed
      );
      setLoading(false);  // ✅ ensure it's always reset
    } catch (error) {
      console.error("Failed to fetch timeline data:", error);
      setLoading(false); // ensure UI doesn't hang
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Symptom Timeline</h2>

      <div className="mb-4">
        <label
          htmlFor="intentFilter"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
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

      {loading ? (
          <div className="text-center text-gray-500 mt-6">Loading timeline...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-gray-400 mt-6">No symptoms found.</div>
        ) : (
          <div className="relative h-[300px] overflow-x-auto overflow-y-visible timeline-container">
            {/* Central horizontal line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-orange-500 z-0" />

          {/* Events */}
          <div className="flex flex-row gap-10 px-4 justify-start h-full items-center relative z-10">
            {[...data].reverse().map((entry, index) => {
              const isAbove = index % 2 === 0;
              return (
                <div
                  key={index}
                  className="relative flex flex-col items-center min-w-[140px] sm:min-w-[160px] h-full group"
                >
                  {/* Symptom label (above the dot) */}
                  {isAbove && (
                    <div className="mb-2 text-xs font-medium text-center max-w-[100px]">
                      {entry.symptom}
                    </div>
                  )}

                  {/* Vertical line (from timeline up or down) */}
                  <div
                    className={`absolute w-0.5 ${
                      isAbove
                        ? "bottom-1/2 translate-y-1/2 h-16"
                        : "top-1/2 -translate-y-1/2 h-16"
                    }`}
                    style={{ backgroundColor: getColorForIntent(entry.intent) }}
                  />

                  {/* Dot */}
                  <div
                    className="w-3 h-3 rounded-full z-10"
                    style={{ backgroundColor: getColorForIntent(entry.intent) }}
                  />

                  {/* Symptom label (below the dot) */}
                  {!isAbove && (
                    <div className="mt-2 text-xs font-medium text-center max-w-[100px]">
                      {entry.symptom}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-sm text-gray-600 mt-1">
                    {format(new Date(entry.timestamp), "dd MMM yyyy")}
                  </div>

                  {/* Tooltip */}
                  {entry.associated_symptoms?.length > 0 && (
                    <div
                      className={`absolute ${
                        isAbove ? "top-[-100px]" : "bottom-[-100px]"
                      } left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-white border shadow-lg p-2 text-xs rounded max-w-xs z-20 whitespace-normal`}
                    >
                      <strong>Associated Symptoms:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {entry.associated_symptoms.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

};

export default ChildDevelopmentInsights;