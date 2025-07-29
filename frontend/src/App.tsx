import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import ChildDevelopmentInsights from "./pages/ChildInsights";
import MilestoneInferenceEngine from "./pages/milestones";
import ParentsWellBeing from "./pages/parents";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Layout from "./components/layout";

const timeoutDuration = Number(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS) || 300000;
const warningLeadTime = 10000;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = async (reason: "manual" | "inactivity") => {
    await signOut(auth);
    setIsLoggedIn(false);
    if (reason === "inactivity") {
      const minutes = Math.floor(timeoutDuration / 60000);
      const seconds = Math.floor((timeoutDuration % 60000) / 1000);
      const minPart = minutes > 0 ? `${minutes} minute${minutes !== 1 ? "s" : ""}` : "";
      const secPart = seconds > 0 ? `${seconds} second${seconds !== 1 ? "s" : ""}` : "";
      const and = minutes && seconds ? " and " : "";
      alert(`You were logged out due to ${minPart}${and}${secPart} of inactivity.`);
    }
  };

  const resetTimers = () => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(
      () => alert("You will be logged out in 10 seconds due to inactivity."),
      timeoutDuration - warningLeadTime
    );
    logoutTimerRef.current = setTimeout(() => logout("inactivity"), timeoutDuration);
  };

  useEffect(() => {
    if (isLoggedIn) {
      const events = ["mousemove", "keydown", "click", "scroll"];
      events.forEach((e) => window.addEventListener(e, resetTimers));
      resetTimers();
      return () => {
        events.forEach((e) => window.removeEventListener(e, resetTimers));
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      };
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsub();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/chat" /> : <Login />} />

        {/* Protected Routes */}
        <Route path="/smart-parent-chat" element={
          isLoggedIn ? <Layout onLogout={() => logout("manual")}><Chat /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/child-insights" element={
          isLoggedIn ? <Layout onLogout={() => logout("manual")}><ChildDevelopmentInsights /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/milestone-inference" element={
          isLoggedIn ? <Layout onLogout={() => logout("manual")}><MilestoneInferenceEngine /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/parents-insights" element={
          isLoggedIn ? <Layout onLogout={() => logout("manual")}><ParentsWellBeing /></Layout> : <Navigate to="/login" />
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/chat" : "/login"} />} />
      </Routes>
    </Router>
  );
}