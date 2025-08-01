import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { auth } from "../firebase";
import {
  Brain,
  School,
  Apple,
  Users,
  Stethoscope,
  Moon,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";


const API_URL = import.meta.env.VITE_API_URL;
const API_URL_PEDITRICIAN = import.meta.env.VITE_API_URL_PEDITRICIAN;
const API_URL_PSYCHOLOGIST= import.meta.env.VITE_API_URL_PSYCHOLOGIST;
const API_URL_SQL = import.meta.env.VITE_API_URL_SQL;


const INTENT_TO_PERSONA: Record<string, string> = {
  "Child Psychologist": "Child Psychologist",
  "Montessori Coach": "Montessori Coach",
  "Nutritionist": "Nutritionist",
  "out_of_scope": "Out of Scope",
  "Parenting Coach": "Parenting Coach",
  "Pediatrician": "Pediatrician",
  "Sleep Consultant": "Sleep Consultant",
  "error_classification": "Persona Inactive"
};

const PERSONA_ICONS: Record<string, JSX.Element> = {
  "Child Psychologist": <Brain className="w-4 h-4 inline-block mr-1 text-purple-600" />,
  "Montessori Coach": <School className="w-4 h-4 inline-block mr-1 text-orange-500" />,
  "Nutritionist": <Apple className="w-4 h-4 inline-block mr-1 text-green-600" />,
  "Parenting Coach": <Users className="w-4 h-4 inline-block mr-1 text-blue-700" />,
  "Pediatrician": <Stethoscope className="w-4 h-4 inline-block mr-1 text-rose-600" />,
  "Sleep Consultant": <Moon className="w-4 h-4 inline-block mr-1 text-indigo-500" />,
  "Out of Scope": <HelpCircle className="w-4 h-4 inline-block mr-1 text-gray-500" />,
  "Persona Inactive": <HelpCircle className="w-4 h-4 inline-block mr-1 text-gray-400" />
};



// ✅ Custom hook for sessionStorage-backed state
function useSessionState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

interface ChatEntry {
  question: string;
  response: string;
  timestamp: string;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [showSessionCompleteToast, setShowSessionCompleteToast] = useState(false);
  const [activePersona, setActivePersona] = useSessionState(
    "activePersona",
    "Persona Inactive"
  );
  const [parsedSymptom, setParsedSymptom] = useSessionState<Record<string, any> | null>("followUpSymptom", null);
  const [missingFields, setMissingFields] = useSessionState<string[]>("missingFields", []);
  const [followUpMode, setFollowUpMode] = useSessionState<boolean>("followUpMode", false);
  const [followUpBuffer, setFollowUpBuffer] = useSessionState<string[]>("followUpBuffer", []);
  const [requiredFields, setRequiredFields] = useSessionState<string[]>("requiredFields", []);
  const [followups, setFollowups] = useSessionState<Record<string, string>>("followups", {});
  const [primarySymptomAvailable, setPrimarySymptomAvailable] = useSessionState<boolean>("primarySymptomAvailable", false);
  const [psychologistFollowup, setPsychologistFollowup] = useState<string | null>(null);
  const [psychologistMessages, setPsychologistMessages] = useSessionState<{ role: string; content: string }[]>("psychologistMessages", []);
  const socketRef = useRef<WebSocket | null>(null);

  // ✅ Reset logic simplified
  const resetFollowUp = (clearPsychologist = true) => {
    setParsedSymptom(null);
    setMissingFields([]);
    setFollowUpBuffer([]);
    setRequiredFields([]);
    setFollowups({});
    setFollowUpMode(false);
    setPrimarySymptomAvailable(false);
    if (clearPsychologist) setPsychologistMessages([]);
  };

  // ✅ Scroll into view for psychologist follow-up
  useEffect(() => {
    if (psychologistFollowup) {
      document
        .querySelector('input[type="text"]')
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [psychologistFollowup]);

  // ✅ Close socket on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      socketRef.current?.close();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socketRef]);

  // ✅ Clear follow-up states on persona change
  useEffect(() => {
    setPsychologistFollowup(null);
    setFollowUpBuffer([]);
    setFollowUpMode(false);
    setMissingFields([]);
    setParsedSymptom(null);
  }, [activePersona]);

  // ✅ Fetch history on login
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken(true);
        const res = await axios.get(`${API_URL_SQL}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(res.data.history || []);
      } catch (err) {
        console.error("Error fetching chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    });
    return () => unsubscribe();
  }, []);



  useEffect(() => {
    // If session has psychologist messages and no active socket, reconnect
    const hadPsychologistSession =
      activePersona === "Child Psychologist" && psychologistMessages.length > 0;

    if (hadPsychologistSession && !socketRef.current) {
      const reconnect = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken(true);

        const wsUrl = `${API_URL_PSYCHOLOGIST.replace(
          "https",
          "wss"
        )}/ws/child-psychologist?token=${idToken}`;
        const newSocket = new WebSocket(wsUrl);
        socketRef.current = newSocket;

        newSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("📩 Restored WS:", data);
          if (Array.isArray(data.history)) setPsychologistMessages(data.history);
        };
      };

      reconnect();
    }

    return () => {
      // ❌ Do NOT close socket on unmount
      // socketRef.current?.close();  <-- remove this
    };
  }, []);



  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in");

    const idToken = await user.getIdToken();
    const rawInput = input.trim();
    if (!rawInput) return;
    setInput("");
    setLoadingResponse(true);

    const timestamp = new Date().toISOString();
    const question = rawInput;

    try {
      // ✅ Helper to save chat
      const saveChat = async (
        questionText: string,
        intent: string,
        response: string,
        parsedSymptom: Record<string, any> = {}
      ) => {
        await axios.post(
          `${API_URL_SQL}/save-chat`,
          {
            question: questionText,
            intent,
            parsed_symptom: parsedSymptom,
            response,
            timestamp,
          },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        setHistory((prev) => [
          { question: questionText, response, timestamp },
          ...prev,
        ]);
      };

      // 0️⃣ Psychologist Follow-up Mode
      if (activePersona === "Child Psychologist" && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ message: question }));
          setLoadingResponse(false);
          return;
      } else if (activePersona === "Child Psychologist") {
          // Socket closed, restart flow
          setActivePersona("Persona Inactive");
          resetFollowUp();
      }

      // ✅ Pediatrician Flow (multi-turn or single)
      if (followUpMode || activePersona === "Pediatrician") {
        const isFollowUp = followUpMode;
        const fullQuestion = isFollowUp
          ? [...followUpBuffer, question].join("\n")
          : question;

        const url = isFollowUp
          ? `${API_URL_PEDITRICIAN}/pediatrician/update`
          : `${API_URL_PEDITRICIAN}/pediatrician`;

        const payload = isFollowUp
          ? {
              primary_symptom_available: primarySymptomAvailable,
              new_message: question,
              existing_symptom: parsedSymptom,
              required_fields: requiredFields,
              followups,
            }
          : { message: question };

        const { data: responseData } = await axios.post(url, payload, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        // Update session states
        setParsedSymptom(responseData.parsed_symptom || {});
        setFollowUpBuffer((prev) => (isFollowUp ? [...prev, question] : [question]));
        setPrimarySymptomAvailable(responseData.primary_symptom_available || false);

        if (responseData.status === "incomplete") {
          // Continue collecting details
          setFollowUpMode(true);
          setMissingFields(responseData.missing_fields || []);
          setRequiredFields(responseData.required_fields || []);
          setFollowups(responseData.followup_questions || {});
        } else {
          // Session complete
          resetFollowUp(false);
          const guidance = responseData.guidance;
          setShowSessionCompleteToast(true);
          setTimeout(() => setShowSessionCompleteToast(false), 3000);

          await saveChat(fullQuestion, "Pediatrician", guidance, responseData.parsed_symptom || {});
        }

        setLoadingResponse(false);
        return;
      }

      // ✅ Intent Classification
      const intentRes = await axios.post(
        `${API_URL}/intent`,
        { message: question },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const intent = intentRes.data.response?.[0]?.label || "error_classification";
      const newPersona = INTENT_TO_PERSONA[intent] || "Persona Inactive";

      // ✅ Reset follow-up if persona actually changed
      if (newPersona !== activePersona) {
        resetFollowUp(false);  // keep psychologist messages intact
      }

      setActivePersona(newPersona);

      // ✅ Child Psychologist Flow
      if (intent === "Child Psychologist") {
        // Create a new socket if none exists or was closed
        const wsUrl = `${API_URL_PSYCHOLOGIST.replace(
          "https",
          "wss"
        )}/ws/child-psychologist?token=${idToken}`;

        const newSocket = new WebSocket(wsUrl);
        socketRef.current = newSocket;

        newSocket.onopen = () => {
          console.log("✅ WebSocket open, sending message:", question);
          newSocket.send(JSON.stringify({ message: question }));
        };

        newSocket.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          console.log("📩 WS message:", data);

          if (Array.isArray(data.history)) {
            setPsychologistMessages(data.history);
          }

          if (data.status === "incomplete") {
            setPsychologistFollowup(data.followup_question || null);
          }

          if (data.status === "complete") {
            setShowSessionCompleteToast(true);
            setPsychologistFollowup(null);
            setTimeout(() => setShowSessionCompleteToast(false), 3000);

            const userQuestion = (data.history || [])
              .filter((m) => m.role === "user")
              .map((m) => m.content)
              .join("\n");

            await saveChat(userQuestion, "Child Psychologist", data.guidance);

            // ✅ Clear session but keep socket alive for new conversation
            resetFollowUp();
            setPsychologistMessages([]);
          }
        };

        newSocket.onerror = (err) => {
          console.error("WebSocket error:", err);
          newSocket.close();
          socketRef.current = null;
        };

        newSocket.onclose = () => {
          console.log("🔌 WebSocket closed");
          socketRef.current = null;
        };

        setLoadingResponse(false);
        return;
      }


      // ✅ Out of Scope
      resetFollowUp();
      const fallback =
        intent === "out_of_scope"
          ? "I'm not trained to handle this kind of question yet. Please ask something related to your child’s health or development."
          : "I'm currently only trained to handle pediatric or child psychology queries. More personas coming soon.";
      await saveChat(question, intent || "Unknown", fallback);
    } catch (err) {
      console.error("Error in sendMessage:", err);
    } finally {
      setLoadingResponse(false);
    }
  };


  



  
  
  return (
      <div className="min-h-screen" style={{ backgroundColor: "#F2FAFD" }}>
        {/* Banner */}
        <div className="w-full">
          <img
            src="/banner-illustration.png"
            alt="Family with AI icons"
            className="w-full object-contain"
            style={{ height: "30vh", maxHeight: "300px" }}
          />
        </div>

        {/* Description */}
        <div className="bg-white w-full px-6 py-4 border-b border-gray-300">
          <p className="text-gray-700 max-w-screen-2xl mx-auto text-center">
            This platform puts the parent in control, respects real-world usage
            patterns, and builds a quietly intelligent memory of each child.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Smart Parent Assistant
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePersona}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center text-sm text-blue-600 mb-2 flex justify-center items-center gap-2"
            >
              {PERSONA_ICONS[activePersona] || (
                <HelpCircle className="w-4 h-4 text-gray-400" />
              )}
              <span>
                Persona Activated: <strong>{activePersona}</strong>
              </span>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something about baby care..."
              className="flex-1 p-3 border rounded"
            />

            <button
              onClick={sendMessage}
              disabled={loadingResponse || input.trim() === ""}
              className={`px-6 py-2 text-white rounded ${
                loadingResponse || input.trim() === ""
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Ask
            </button>

            {followUpMode && (
              <button
                onClick={resetFollowUp}
                className="px-6 py-2 text-white bg-red-500 hover:bg-red-600 rounded"
              >
                Reset Conversation
              </button>
            )}
          </div>

            {showSessionCompleteToast && (
              <div className="mt-3 px-4 py-2 text-sm rounded bg-green-100 text-green-800 border border-green-300 shadow-sm text-center">
                Session complete ✔️ You can ask a new question anytime.
              </div>
            )}

            
            {/* 🔹 Unified Follow-Up Section for Peditrician*/}
            {followUpMode && (
              <div className="mt-4 space-y-3">
                {/* 1️⃣ Prompt for primary symptom if not available */}
                {!primarySymptomAvailable && (
                  <div className="p-4 border border-yellow-200 rounded bg-yellow-50 shadow-sm text-sm text-yellow-800">
                    <h4 className="font-semibold text-yellow-700 mb-1">
                      Let's start with your main health concern.
                    </h4>
                    <p>Please tell me what primary symptom or issue your child is experiencing.</p>
                  </div>
                )}

                {/* 2️⃣ Symptom summary if we already have data */}
                {parsedSymptom && Object.keys(parsedSymptom).length > 0 && (
                  <div className="p-4 border border-blue-200 rounded bg-blue-50 shadow-sm text-sm text-blue-800">
                    <h4 className="font-semibold text-blue-700 mb-2">Symptom Summary So Far:</h4>
                    <ul className="list-disc pl-4">
                      {Object.entries(parsedSymptom).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key.replaceAll("_", " ")}:</strong>{" "}
                          {Array.isArray(value)
                            ? value.join(", ")
                            : value || <span className="text-gray-400">N/A</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3️⃣ Missing required fields / follow-up questions */}
                {missingFields.length > 0 && (
                  <div className="p-4 border border-yellow-300 rounded bg-yellow-50 shadow-sm text-sm text-yellow-800">
                    <h4 className="font-semibold text-yellow-700 mb-2">Still need a few details:</h4>
                    <ul className="list-disc pl-4">
                      {missingFields.map((field) => (
                        <li key={field}>{followups[field] || field}</li>
                      ))}
                    </ul>
                    <div className="text-xs text-blue-500 mt-1">
                      Collected {requiredFields.length - missingFields.length}/{requiredFields.length} required fields
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Psychologist Follow-up (above history) */}
            {psychologistFollowup && (
              <div className="mt-4 p-4 border border-purple-200 rounded bg-purple-50 shadow-sm text-sm text-purple-800">
                <h4 className="font-semibold text-purple-700 mb-1">Need a few more details before I can help you</h4>
                <p>{psychologistFollowup}</p>
              </div>
            )}

            {/* 🔹 Current Discussion (live user + AI exchanges from WebSocket) */}
            {socketRef.current && activePersona === "Child Psychologist" && psychologistMessages.length > 0 && (
              <div className="mt-4 p-4 border border-purple-100 rounded bg-white shadow-sm text-sm text-gray-700">
                <h4 className="font-semibold text-purple-600 mb-2">Current Discussion</h4>
                {psychologistMessages.map((msg, idx) => (
                  <div key={idx} className="mb-2">
                    {msg.role === "user" ? (
                      <p><strong>Q:</strong> {msg.content}</p>
                    ) : (
                      <p><strong>A:</strong> {msg.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {loadingResponse && (
              <div className="mt-4 p-4 bg-white rounded shadow text-center text-gray-600">
                <span className="animate-spin inline-block mr-2 border-2 border-blue-500 border-t-transparent rounded-full w-4 h-4"></span>
                Loading response...
              </div>
            )}

            {/* History now comes after follow-up & current discussion */}
            {loadingHistory ? (
              <div className="text-center text-gray-500 mt-6">Loading history...</div>
            ) : (
              history.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Recent Conversations</h3>
                  {history.map((entry, idx) => (
                    <div key={idx} className="mb-4 p-3 border rounded bg-white shadow-sm">
                      <p><strong>Q:</strong> {entry.question}</p>
                      <p><strong>A:</strong> {entry.response}</p>
                      <p className="text-sm text-gray-400">{format(new Date(entry.timestamp), "PPpp")}</p>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
      </div>
  );
}