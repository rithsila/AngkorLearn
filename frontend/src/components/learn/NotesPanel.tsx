'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, FileText } from 'lucide-react';
import api from '@/lib/api';

interface NotesPanelProps {
  sessionId: string;
}

interface Note {
  id: string;
  noteText: string;
  sessionId: string;
  updatedAt: string;
}

interface NotesResponse {
  notes: Note[];
}

export function NotesPanel({ sessionId }: NotesPanelProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await api.get<NotesResponse>(`/notes/session/${sessionId}`);
        const data = response.data.data as NotesResponse;
        if (data.notes && data.notes.length > 0) {
          setNotes(data.notes[0].noteText);
          setLastSaved(new Date(data.notes[0].updatedAt));
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    };

    loadNotes();
  }, [sessionId]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (notes.trim()) {
      saveTimeoutRef.current = setTimeout(() => {
        saveNotes();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes]);

  const saveNotes = async () => {
    if (!notes.trim()) return;

    setIsSaving(true);
    try {
      await api.post('/notes', {
        sessionId,
        noteText: notes,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-white">Notes</span>
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="text-xs text-gray-500">Saving...</span>
          ) : lastSaved ? (
            <span className="text-xs text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          ) : null}
          <button
            onClick={saveNotes}
            disabled={isSaving || !notes.trim()}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
            title="Save notes"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes textarea */}
      <div className="flex-1 p-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Take notes here...

• Write key points
• Add your own examples
• Note questions to ask
• Summarize in your words"
          className="w-full h-full bg-gray-700/50 text-gray-100 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500 text-sm"
        />
      </div>

      {/* Tips */}
      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          💡 Notes auto-save after 2 seconds of inactivity
        </p>
      </div>
    </div>
  );
}
