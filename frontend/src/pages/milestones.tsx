import React from "react";

const MilestoneInferenceEngine: React.FC = () => {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-blue-700">
        Milestone Inference Engine (MIE)
      </h2>

      <ul className="list-disc pl-6 space-y-4 text-gray-700 text-base leading-relaxed">
        <li>No checklists — milestones are inferred from your conversation</li>
        <li>Identifies growth areas for both parent and child using contextual cues</li>
        <li>Backed by sources such as AAP, CDC, WHO, MedlinePlus, and Pediatrics Journal</li>
        <li>Knowledge derived from professional literature and best practices</li>
      </ul>
    </div>
  );
};

export default MilestoneInferenceEngine;