import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

  export default function Login() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);
      if (loggedIn) navigate("/chat");
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    try {
      if (isCreating) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl flex flex-col-reverse md:flex-row gap-10 md:gap-8 items-center md:items-center justify-between">
        
        {/* Info panel */}
        <div className="w-full md:w-1/2 text-center md:text-left">
          <h1 className="text-3xl font-bold text-blue-800 mb-6">
            Welcome to Nurture AI
          </h1>
          <ul className="space-y-4 text-gray-800 text-base px-2 md:px-0">
            <li>
              🤖 <strong>Expert-backed AI agents:</strong> Advice on parenting, pediatric, psychology & coaching.
            </li>
            <li>
              🧠 <strong>Milestone intelligence:</strong> Tracks progress and improvement areas for both child and parent — all inferred from your natural conversations.
            </li>
            <li>
              🔒 <strong>Privacy-first:</strong> We never request sensitive data — profiles are generated based on your interactions.
            </li>
            <li>
              📚 <strong>Knowledge from trusted sources:</strong> Including{" "}
              <a href="https://www.aap.org" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">AAP</a>,{" "}
              <a href="https://www.cdc.gov" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">CDC</a>,{" "}
              <a href="https://www.who.int" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">WHO</a>,{" "}
              <a href="https://medlineplus.gov" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">MedlinePlus</a>, and the{" "}
              <a href="https://www.jpeds.com/" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Journal of Pediatrics</a>.
            </li>
          </ul>
        </div>

        {/* Login panel */}
        <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-lg">
          <img
            src="/logo.png"
            alt="NurtureAI Logo"
            className="h-20 mx-auto mb-4"
          />

          <h2 className="text-xl font-semibold text-center text-blue-700 mb-6">
            {isCreating ? "Sign Up" : "Sign In"}
          </h2>

          <input
            type="email"
            placeholder="Email"
            className="w-full mb-3 px-4 py-2 border border-gray-300 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            {isCreating ? "Sign Up" : "Login"}
          </button>

          <div className="text-sm text-center mt-4">
            {isCreating ? "Already have an account?" : "New user?"}{" "}
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="text-blue-600 underline"
            >
              {isCreating ? "Login here" : "Sign up"}
            </button>
          </div>

          {error && (
            <p className="text-red-500 mt-3 text-sm text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
