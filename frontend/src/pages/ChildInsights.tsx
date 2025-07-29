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
      setLoading(true);
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
        setLoading(false);
      }

      setData(
        selectedIntent
          ? parsed.filter((entry) => entry.intent === selectedIntent)
          : parsed
      );
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch timeline data:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Discussion Timeline</h2>

      <div className="mb-4">
        <label
          htmlFor="intentFilter"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Filter by Persona:
        </label>
        <select
          id="intentFilter"
          value={selectedIntent || ""}
          onChange={(e) => setSelectedIntent(e.target.value || null)}
          className="p-2 border rounded w-full sm:w-64"
        >
          <option value="">All Personas</option>
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

      <div className="flex justify-center w-full">
        <div className="w-full max-w-7xl overflow-x-auto rounded-lg border border-gray-200 shadow bg-white p-4">
          <div className="timeline-container relative min-h-[420px] w-full overflow-visible">
            {/* Central horizontal line */}
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-400 z-0" />

            <div className="relative z-10 flex flex-row gap-10 px-6 min-w-fit items-center">
              {[...data].reverse().map((entry, index) => {
                const isAbove = index % 2 === 0;
                const color = getColorForIntent(entry.intent);
                const key = `${entry.timestamp}-${entry.symptom}-${index}`;
                return (
                  <div key={key} className="relative flex flex-col items-center min-w-[140px] sm:min-w-[160px] h-full group">
                    {/* Dot anchored to exact center line */}
                    <div
                      className="absolute z-10 w-3 h-3 rounded-full border border-white shadow"
                      style={{
                        top: "0%",
                        transform: "translateY(-50%)",
                        backgroundColor: color,
                      }}
                    />

                    {isAbove && (
                      <div className="absolute top-[calc(50%-30px)] flex flex-col items-center">
                        <div className="h-10 w-0.5" style={{ backgroundColor: color }} />
                        <div className="mb-1 text-center bg-white border rounded shadow px-3 py-1 text-xs w-[140px]">
                          <div className="font-semibold text-sm text-gray-800">{entry.symptom}</div>
                          <div className="text-xs text-gray-500">{format(new Date(entry.timestamp), "dd MMM yyyy")}</div>
                        </div>
                      </div>
                    )}

                    {!isAbove && (
                      <div className="absolute top-[calc(50%+10px)] flex flex-col items-center">
                        <div className="h-10 w-0.5" style={{ backgroundColor: color }} />
                        <div className="mt-1 text-center bg-white border rounded shadow px-3 py-1 text-xs w-[140px]">
                          <div className="font-semibold text-sm text-gray-800">{entry.symptom}</div>
                          <div className="text-xs text-gray-500">{format(new Date(entry.timestamp), "dd MMM yyyy")}</div>
                        </div>
                      </div>
                    )}

                    {/* Tooltip remains unchanged */}
                    {entry.associated_symptoms?.length > 0 && (
                      <div
                        className={`absolute z-20 bg-white border shadow-md p-2 text-xs rounded w-48 ${
                          isAbove ? "top-[-160px]" : "bottom-[-160px]"
                        } left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition`}
                      >
                        <strong className="block text-gray-800 mb-1">Associated Symptoms:</strong>
                        <ul className="list-disc list-inside text-gray-600">
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
        </div>
      </div>




      )}
    </div>
  );
};

export default ChildDevelopmentInsights;