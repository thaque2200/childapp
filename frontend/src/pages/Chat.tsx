import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
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


const API_URL = import.meta.env.VITE_API_URL;
const API_URL_PEDITRICIAN = import.meta.env.VITE_API_URL_PEDITRICIAN;
const API_URL_SQL = import.meta.env.VITE_API_URL_SQL;


const TABS = [
  "Smart Parent Assistant",
  "Child Development Insights",
  "Parental Well-being & Coaching",
  "Milestone Inference Engine (MIE)"
];

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

export default function Chat({ onLogout }: { onLogout: () => void }) {
  const [input, setInput] = useState("");
  // const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("Smart Parent Assistant");

  const [loadingHistory, setLoadingHistory] = useState(true);

  const [loadingResponse, setLoadingResponse] = useState(false);

  const [activePersona, setActivePersona] = useState(() => {
    return localStorage.getItem("activePersona") || "Persona Inactive";
  });

  const [parsedSymptom, setParsedSymptom] = useState<Record<string, any> | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [followUpBuffer, setFollowUpBuffer] = useState<string[]>([]); // To collect all related messages
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [followups, setFollowups] = useState<Record<string, string>>({});
  const [primarySymptomAvailable, setPrimarySymptomAvailable] = useState(false);
  const [showSessionCompleteToast, setShowSessionCompleteToast] = useState(false);

  const resetFollowUp = () => {
    setParsedSymptom(null);
    setMissingFields([]);
    setFollowUpBuffer([]);
    setRequiredFields([]);
    setFollowups({});
    setFollowUpMode(false);
    setPrimarySymptomAvailable(false);
    
    sessionStorage.removeItem("followUpMode");
    sessionStorage.removeItem("followUpSymptom");
    sessionStorage.removeItem("followUpBuffer");
    sessionStorage.removeItem("requiredFields");
    sessionStorage.removeItem("followups");
    sessionStorage.removeItem("primarySymptomAvailable");

    // setActivePersona("Persona Inactive");
    // localStorage.removeItem("activePersona");
  };


  // Clean everything on hard refresh
  useEffect(() => {
    console.log("Page load → clearing session & persona");

    // Clear all session storage keys
    sessionStorage.removeItem("followUpMode");
    sessionStorage.removeItem("followUpSymptom");
    sessionStorage.removeItem("followUpBuffer");
    sessionStorage.removeItem("requiredFields");
    sessionStorage.removeItem("followups");
    sessionStorage.removeItem("primarySymptomAvailable");

    // Optionally also clear persona on full page reload
    localStorage.removeItem("activePersona");

    // Optional: reset any frontend state too
    setFollowUpMode(false);
    setParsedSymptom(null);
    setFollowUpBuffer([]);
    setRequiredFields([]);
    setFollowups({});
    setPrimarySymptomAvailable(false);
    setActivePersona("Persona Inactive");

  }, []);  // 👈 run only on first page load


  useEffect(() => {
    const stored = sessionStorage.getItem("requiredFields");
    if (stored) setRequiredFields(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (activeTab !== "Smart Parent Assistant" && !followUpMode) {
      resetFollowUp();  // ✅ Only reset if NOT in follow-up mode
    }
  }, [activeTab, followUpMode]);
  

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
    const question = input;
    setInput("");
    setLoadingResponse(true);

    try {
      let responseText = "";
      let timestamp = new Date().toISOString();

      // Step 1: Check if we are in follow-up mode
      if (followUpMode) {
        const res = await axios.post(
          `${API_URL_PEDITRICIAN}/pediatrician/update`,
          {
            primary_symptom_available: primarySymptomAvailable,
            new_message: question,
            existing_symptom: parsedSymptom,
            required_fields: requiredFields,
            followups: followups,
          },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );

        const responseData = res.data;
        setParsedSymptom(responseData.parsed_symptom || {});
        setFollowUpBuffer((prev) => [...prev, question]);

        // ✅ Always use backend value
        setPrimarySymptomAvailable(responseData.primary_symptom_available);

        if (responseData.status === "incomplete") {
          // Still missing info — ask next follow-up
          setMissingFields(responseData.missing_fields);
          setFollowUpMode(true);
          setRequiredFields(responseData.required_fields || []);
          setFollowups(responseData.followup_questions || {});
          responseText = Object.values(responseData.followup_questions || {}).join("\n");
        } else {
          // ✅ Final turn — reset everything
          setFollowUpMode(false);
          setMissingFields([]);
          setRequiredFields([]);
          setFollowups({});
          setPrimarySymptomAvailable(false); // ✅ Reset

          responseText = responseData.guidance;
          setShowSessionCompleteToast(true);
          setTimeout(() => setShowSessionCompleteToast(false), 3000);

          const fullQuestion = [...followUpBuffer, question].join("\n");

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

          setHistory([
            {
              question: fullQuestion,
              response: responseText,
              timestamp,
            },
            ...history,
          ]);

          setFollowUpBuffer([]);
          setParsedSymptom(null);
        }

        return; // Don't proceed further
      }


      // Step 2: Initial message → classify intent
      const intentRes = await axios.post(
        `${API_URL}/intent`,
        { message: question },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      const intent = intentRes.data.response?.[0]?.label || "error_classification";

      if (!followUpMode) {
        const newPersona = INTENT_TO_PERSONA[intent] || "Persona Inactive";
        setActivePersona(newPersona);
        localStorage.setItem("activePersona", newPersona);
      }

      if (intent === "Pediatrician") {
        // Step 3: Start pediatrician flow
        const res = await axios.post(
          `${API_URL_PEDITRICIAN}/pediatrician`,
          { message: question },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );

        const responseData = res.data;
        setParsedSymptom(responseData.parsed_symptom || {});
        setFollowUpBuffer([question]);

        if (responseData.status === "incomplete") {
            setFollowUpMode(true);
            setMissingFields(responseData.missing_fields);
            setRequiredFields(responseData.required_fields || []);
            setFollowups(responseData.followup_questions || {});

            // ❗️Use this backend value
            const primarySymptomAvailable = responseData.primary_symptom_available;

            // Store it in state for next call to /pediatrician/update
            setPrimarySymptomAvailable(primarySymptomAvailable);
            
            responseText = Object.values(responseData.followup_questions).join("\n");
          } else {
            // ✅ Final guidance on first turn — no follow-up needed
            responseText = responseData.guidance;

            // ✅ Reset all triage state
            setFollowUpMode(false);
            setMissingFields([]);
            setRequiredFields([]);
            setFollowups({});
            setPrimarySymptomAvailable(false);
            setFollowUpBuffer([]);
            setParsedSymptom(null);
            setShowSessionCompleteToast(true);
            setTimeout(() => setShowSessionCompleteToast(false), 3000);

            await axios.post(
              `${API_URL_SQL}/save-chat`,
              {
                question,
                intent: "Pediatrician",
                parsed_symptom: responseData.parsed_symptom || {},
                response: responseText,
                timestamp,
              },
              { headers: { Authorization: `Bearer ${idToken}` } }
            );

            setHistory([
              {
                question,
                response: responseText,
                timestamp,
              },
              ...history,
            ]);
          }
      } else if (intent === "out_of_scope") {
        resetFollowUp(); // ✅ Clear stale pediatric state
        responseText =
          "I'm not trained to handle this kind of question yet. Please ask something related to your child’s health, symptoms, or developmental concerns.";
        
        await axios.post(
          `${API_URL_SQL}/save-chat`,
          {
            question,
            intent: "out_of_scope",
            parsed_symptom: {},
            response: responseText,
            timestamp,
          },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );

        setHistory([
          {
            question,
            response: responseText,
            timestamp,
          },
          ...history,
        ]);
      } else {
        resetFollowUp(); // ✅ Same cleanup for other personas

        responseText =
          "I'm currently only trained to handle pediatric health concerns. Stay tuned — soon I’ll support topics like child psychology, nutrition, sleep coaching, and parenting guidance.";
        
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

        setHistory([
          {
            question,
            response: responseText,
            timestamp,
          },
          ...history,
        ]);
      }
    } catch (err) {
      console.error("Error in pediatrician flow:", err);
    } finally {
      setLoadingResponse(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem("activePersona");
    await signOut(auth);
    onLogout();
  };
  
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2FAFD' }}>
      {/* Tab Navigation */}
      <div className="bg-white px-6 shadow-sm border-b w-full">
        <div className="flex justify-between items-center max-w-screen-2xl mx-auto py-3">
          <div className="flex flex-wrap gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors duration-200 ease-in-out ${
                  activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-blue-500"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={logout}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

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
        {activeTab === "Smart Parent Assistant" && (
          <div>
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
                <span>Persona Activated: <strong>{activePersona}</strong></span>
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

            {parsedSymptom && (
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
              )}


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
                      <p className="text-sm text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )
            )}


            {showSessionCompleteToast && (
              <div className="mt-3 px-4 py-2 text-sm rounded bg-green-100 text-green-800 border border-green-300 shadow-sm text-center">
                Pediatrician session complete ✔️ You can ask a new question anytime.
              </div>
            )}



          </div>
        )}

        {activeTab === "Child Development Insights" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Child Development Insights</h2>
            <p className="text-gray-600 text-center">Coming soon: professional-grade insights tailored from child profiles, behavioral patterns, and milestones.</p>
          </div>
        )}

        {activeTab === "Parental Well-being & Coaching" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Parental Well-being & Coaching</h2>
            <p className="text-gray-600 text-center">Personalized guidance on emotional support, parental stress, and bonding — from trusted sources and AI personas.</p>
          </div>
        )}

        {activeTab === "Milestone Inference Engine (MIE)" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Milestone Inference Engine (MIE)</h2>
            <ul className="list-disc ml-5 text-gray-700">
              <li>No checklists — milestones inferred from your conversation</li>
              <li>Identifies growth areas for both parent and child using contextual cues</li>
              <li>Backed by sources such as AAP, CDC, WHO, MedlinePlus, and Pediatrics Journal</li>
              <li>Knowledge derived from professional literature and best practices</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );


}