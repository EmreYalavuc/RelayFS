import { useState } from "react";

interface Props {
  onOpen: (path: string) => void;
}

export function SetupView({ onOpen }: Props) {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = path.trim();
    if (!trimmed) {
      setError("Enter a project path.");
      return;
    }
    setError("");
    onOpen(trimmed);
  };

  return (
    <div className="w-[360px] bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div>
        <h1 className="text-white font-mono font-bold text-lg tracking-wider">
          RELAY<span className="text-blue-400">FS</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">
          CRDT-based offline-first file sync
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-[10px] text-gray-500 uppercase tracking-widest">
          Project Folder
        </label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="C:\Projects\MyApp"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          spellCheck={false}
        />
        {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-sm tracking-widest rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          OPEN PROJECT
        </button>
      </form>
    </div>
  );
}
