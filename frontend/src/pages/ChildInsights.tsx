import React, { useEffect, useState } from "react";
import axios from "axios";
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

const ChildDevelopmentInsights: React.FC = () => {
  const [data, setData] = useState<TimelineEntry[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [availableIntents, setAvailableIntents] = useState<string[]>([]);

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const res = await axios.get(`${API_URL_SQL}/child-timeline`, {
          params: { intent: selectedIntent || undefined },
        });

        setData(res.data);

        if (!selectedIntent) {
          const foundIntents = Array.from(
            new Set(
              res.data
                .map((entry: TimelineEntry) => entry.intent)
                .filter((val) => typeof val === "string" && val.length > 0)
            )
          );
          setAvailableIntents(foundIntents);
        }
      } catch (error) {
        console.error("Failed to fetch timeline data:", error);
      }
    };

    fetchTimelineData();
  }, [selectedIntent]);

  return (
    <div className="p-4">
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
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

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