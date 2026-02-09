'use client';

interface Concept {
  id: string;
  title: string;
  description: string | null;
}

interface ContentPanelProps {
  concept: Concept | null;
}

export function ContentPanel({ concept }: ContentPanelProps) {
  if (!concept) {
    return (
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No concept selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
      <div className="mb-4">
        <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
          Current Concept
        </span>
      </div>
      
      <h2 className="text-xl font-bold text-white mb-3">
        {concept.title}
      </h2>
      
      {concept.description && (
        <div className="text-gray-300 text-sm leading-relaxed">
          {concept.description}
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Learning Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Read the tutor&apos;s explanation carefully</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Try to explain it in your own words</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Ask questions if anything is unclear</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Take notes to reinforce learning</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
