import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../firebase";
import {
  Baby,
  Brain,
  Moon,
  Stethoscope,
  School,
  Apple,
  Users,
  HelpCircle
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

export default function Chat() {
  const [input, setInput] = useState("");
  interface ChatEntry {
    question: string;
    response: string;
    timestamp: string;
  }
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [activePersona, setActivePersona] = useState(() => {
    return sessionStorage.getItem("activePersona") || "Persona Inactive";
  });

  useEffect(() => {
    sessionStorage.setItem("activePersona", activePersona);
  }, [activePersona]);

  const [parsedSymptom, setParsedSymptom] = useState<Record<string, any> | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [followUpBuffer, setFollowUpBuffer] = useState<string[]>([]); // To collect all related messages
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [followups, setFollowups] = useState<Record<string, string>>({});
  const [primarySymptomAvailable, setPrimarySymptomAvailable] = useState(false);
  const [showSessionCompleteToast, setShowSessionCompleteToast] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [psychologistFollowup, setPsychologistFollowup] = useState<string | null>(null);
  const [psychologistMessages, setPsychologistMessages] = useState(() => {
  const stored = sessionStorage.getItem("psychologistMessages");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    sessionStorage.setItem("psychologistMessages", JSON.stringify(psychologistMessages));
  }, [psychologistMessages]);

  const resetFollowUp = () => {
    setParsedSymptom(null);
    setMissingFields([]);
    setFollowUpBuffer([]);
    setRequiredFields([]);
    setFollowups({});
    setFollowUpMode(false);
    setPrimarySymptomAvailable(false);
    setPsychologistMessages([]); // 🔹 Clear live chat

    [
      "followUpMode",
      "followUpSymptom",
      "followUpBuffer",
      "requiredFields",
      "followups",
      "primarySymptomAvailable",
      "psychologistMessages"
    ].forEach((key) => sessionStorage.removeItem(key));
  };


  useEffect(() => {
    return () => {
      if (socket) socket.close();
    };
  }, [socket]);

  useEffect(() => {
    if (psychologistFollowup) {
      document.querySelector('input[type="text"]')?.scrollIntoView({ behavior: "smooth" });
    }
  }, [psychologistFollowup]);

  useEffect(() => {
    const stored = sessionStorage.getItem("missingFields");
    if (stored) setMissingFields(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (missingFields.length > 0)
      sessionStorage.setItem("missingFields", JSON.stringify(missingFields));
    else
      sessionStorage.removeItem("missingFields");
  }, [missingFields]);

  useEffect(() => {
    const stored = sessionStorage.getItem("requiredFields");
    if (stored) setRequiredFields(JSON.parse(stored));
  }, []);

  // Restore parsedSymptom from session
  useEffect(() => {
    const stored = sessionStorage.getItem("followUpSymptom");
    if (stored) setParsedSymptom(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (parsedSymptom)
      sessionStorage.setItem("followUpSymptom", JSON.stringify(parsedSymptom));
    else
      sessionStorage.removeItem("followUpSymptom");
  }, [parsedSymptom]);

  useEffect(() => {
    if (requiredFields.length)
      sessionStorage.setItem("requiredFields", JSON.stringify(requiredFields));
    else
      sessionStorage.removeItem("requiredFields");
  }, [requiredFields]);

  useEffect(() => {
    const stored = sessionStorage.getItem("followups");
    if (stored) setFollowups(JSON.parse(stored));
  }, []);
  useEffect(() => {
    if (Object.keys(followups).length)
      sessionStorage.setItem("followups", JSON.stringify(followups));
    else
      sessionStorage.removeItem("followups");
  }, [followups]);

  // Restore followUpBuffer from session
  useEffect(() => {
    const storedBuffer = sessionStorage.getItem("followUpBuffer");
    if (storedBuffer) setFollowUpBuffer(JSON.parse(storedBuffer));
  }, []);

  useEffect(() => {
    if (followUpBuffer.length > 0)
      sessionStorage.setItem("followUpBuffer", JSON.stringify(followUpBuffer));
    else
      sessionStorage.removeItem("followUpBuffer");
  }, [followUpBuffer]);

  // Restore followUpMode
  useEffect(() => {
    const storedMode = sessionStorage.getItem("followUpMode");
    if (storedMode === "true") setFollowUpMode(true);
  }, []);

  useEffect(() => {
    if (followUpMode) {
      sessionStorage.setItem("followUpMode", "true");
    } else {
      sessionStorage.removeItem("followUpMode");
    }
  }, [followUpMode]);

  useEffect(() => {
    sessionStorage.setItem("primarySymptomAvailable", primarySymptomAvailable.toString());
  }, [primarySymptomAvailable]);


  useEffect(() => {
    setPsychologistFollowup(null);
    setFollowUpBuffer([]);
    setFollowUpMode(false);
    setMissingFields([]);
    setParsedSymptom(null);
  }, [activePersona]);


  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket) {
        socket.close();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [socket]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken(true);
        console.log("Token (on load):", token); // ✅ Debug token here REMOVE IN PRODUCTION
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




  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in");

    const idToken = await user.getIdToken();
    const rawInput = input.trim();
    if (!rawInput) return; // prevent sending empty message
    setInput("");
    setLoadingResponse(true);

    const question = rawInput; // store user question before clearing input
    const timestamp = new Date().toISOString();

    try {
      let responseText = "";

      // --------------------------
      // 🟢 Pediatrician (Follow-up or New Question)
      // --------------------------
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

        const res = await axios.post(url, payload, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const responseData = res.data;

        // Update local states
        setParsedSymptom(responseData.parsed_symptom || {});
        setFollowUpBuffer((prev) => (isFollowUp ? [...prev, question] : [question]));
        setPrimarySymptomAvailable(responseData.primary_symptom_available || false);

        if (responseData.status === "incomplete") {
          // Continue collecting required fields
          setFollowUpMode(true);
          setMissingFields(responseData.missing_fields || []);
          setRequiredFields(responseData.required_fields || []);
          setFollowups(responseData.followup_questions || {});
          responseText = Object.values(responseData.followup_questions || {}).join("\n");
        } else {
          // Pediatrician session complete
          setFollowUpMode(false);
          setMissingFields([]);
          setRequiredFields([]);
          setFollowups({});
          setPrimarySymptomAvailable(false);
          setFollowUpBuffer([]);
          setParsedSymptom(null);

          responseText = responseData.guidance;
          setShowSessionCompleteToast(true);
          setTimeout(() => setShowSessionCompleteToast(false), 3000);

          await axios.post(
            `${API_URL_SQL}/save-chat`,
            {
              question: fullQuestion,
              intent: "Pediatrician",
              parsed_symptom: responseData.parsed_symptom || {},
              response: responseText,
              timestamp,
            },
            { headers: { Authorization: `Bearer ${idToken}` } }
          );

          setHistory([{ question: fullQuestion, response: responseText, timestamp }, ...history]);
        }

        setLoadingResponse(false);
        return;
      }

      // --------------------------
      // 🧠 Child Psychologist (WebSocket)
      // --------------------------
      const intentRes = await axios.post(
        `${API_URL}/intent`,
        { message: question },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const intent = intentRes.data.response?.[0]?.label || "error_classification";
      const newPersona = INTENT_TO_PERSONA[intent] || "Persona Inactive";
      console.log("Extracted intent:", intent);

      // Reset leftover follow-ups if persona changes
      if (newPersona !== activePersona) {
        resetFollowUp();
        setPsychologistFollowup(null);
      }

      setActivePersona(newPersona);
      localStorage.setItem("activePersona", newPersona);

      if (intent === "Child Psychologist") {
        // ✅ Reuse existing WebSocket if open
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ message: question }));
          setLoadingResponse(false);
          return;
        }

        // Create and configure new WebSocket
        const wsUrl = `${API_URL_PSYCHOLOGIST.replace(
          "https",
          "wss"
        )}/ws/child-psychologist?token=${idToken}`;
        const newSocket = new WebSocket(wsUrl);
        console.log("🌐 Connecting to:", wsUrl);

        newSocket.onopen = () => {
          console.log("✅ WebSocket open, sending message:", question);
          newSocket.send(JSON.stringify({ message: question }));
        };

        newSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received message:", data);

        // Update live messages for Current Discussion
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
            .filter((msg) => msg.role === "user")
            .map((msg) => msg.content)
            .join("\n");

          await axios.post(
            `${API_URL_SQL}/save-chat`,
            {
              question: userQuestion,
              intent: "Child Psychologist",
              parsed_symptom: {},
              response: data.guidance,
              timestamp,
            },
            { headers: { Authorization: `Bearer ${idToken}` } }
          );

          setHistory([{ question: userQuestion, response: data.guidance, timestamp }, ...history]);

          newSocket.close();
          setSocket(null);
          // 🔹 Clear psychologist live messages and session data
          setPsychologistMessages([]);
          sessionStorage.removeItem("psychologistMessages");
        }
      };

      newSocket.onerror = (err) => {
        console.error("WebSocket error:", err);
        newSocket.close();
        setSocket(null);
      };

      newSocket.onclose = (event) => {
        console.log("🔌 WebSocket closed", event.code, event.reason);
      };

      setSocket(newSocket); // ✅ after assigning handlers
      setLoadingResponse(false);
      return;
      }

      // --------------------------
      // ❌ Out of Scope / Fallback
      // --------------------------
      resetFollowUp();

      if (intent === "out_of_scope") {
        responseText =
          "I'm not trained to handle this kind of question yet. Please ask something related to your child’s health, symptoms, or developmental concerns.";
      } else {
        responseText =
          "I'm currently only trained to handle pediatric health or child psychology queries. Stay tuned — soon I’ll support topics like nutrition, sleep coaching, and parenting guidance.";
      }

      await axios.post(
        `${API_URL_SQL}/save-chat`,
        {
          question,
          intent: intent || "Unknown",
          parsed_symptom: {},
          response: responseText,
          timestamp,
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      setHistory([{ question, response: responseText, timestamp }, ...history]);
    } catch (err) {
      console.error("Error in sendMessage:", err);
    } finally {
      setLoadingResponse(false);
    }
  };

  



  
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2FAFD' }}>

      {/* Banner Image */}
      <div className="w-full">
        <img
          src="/banner-illustration.png"
          alt="Family with AI icons"
          className="w-full object-contain"
          style={{ height: '30vh', maxHeight: '300px' }}
        />
      </div>

      {/* Platform Description */}
      <div className="bg-white w-full px-6 py-4 border-b border-gray-300">
        <p className="text-gray-700 max-w-screen-2xl mx-auto text-center">
          This platform puts the parent in control, respects real-world usage patterns, and builds a quietly intelligent memory of each child. It provides situationally aware support using cutting-edge technology and backed by medical-grade sources — designed not to nag or judge, but to assist, reassure, and empower.
        </p>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">Smart Parent Assistant</h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePersona}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center text-sm text-blue-600 mb-2 flex justify-center items-center gap-2"
            >
              {PERSONA_ICONS[activePersona] || <HelpCircle className="w-4 h-4 text-gray-400" />}
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

            {parsedSymptom && Object.keys(parsedSymptom).length > 0 ? (
              <div className="mt-4 p-4 border border-blue-200 rounded bg-blue-50 shadow-sm text-sm text-blue-800">
                <h4 className="font-semibold text-blue-700 mb-2">Symptom Summary So Far:</h4>
                <ul className="list-disc pl-4">
                  {Object.entries(parsedSymptom).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key.replaceAll("_", " ")}:</strong>{" "}
                      {Array.isArray(value) ? value.join(", ") : value || <span className="text-gray-400">N/A</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : followUpMode ? (
              <div className="mt-4 p-4 border border-yellow-200 rounded bg-yellow-50 shadow-sm text-sm text-yellow-800">
                <h4 className="font-semibold text-yellow-700 mb-1">Let's start with your main health concern.</h4>
                <p>Please tell me what primary symptom or issue your child is experiencing.</p>
              </div>
            ) : null}


            {followUpMode && missingFields.length > 0 && (
              <div className="mt-3">
                <div className="p-3 border border-yellow-300 rounded bg-yellow-50 text-yellow-800 text-sm">
                  <h4 className="font-semibold text-yellow-700 mb-2">Still need a few details:</h4>
                  <ul className="list-disc pl-4">
                    {missingFields.map((field) => (
                      <li key={field}>{followups[field] || field}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-blue-500 mt-1 ml-1">
                  Collected {requiredFields.length - missingFields.length}/{requiredFields.length} required fields
                </div>
              </div>
            )}
           
            {loadingResponse && (
              <div className="mt-4 p-4 bg-white rounded shadow text-center text-gray-600">
                <span className="animate-spin inline-block mr-2 border-2 border-blue-500 border-t-transparent rounded-full w-4 h-4"></span>
                Loading response...
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
            {socket && activePersona === "Child Psychologist" && psychologistMessages.length > 0 && (
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