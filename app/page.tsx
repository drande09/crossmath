'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const grades = [
  { num: 1, label: '1st Grade', desc: 'Addition & Subtraction (1-20)', color: 'bg-green-400' },
  { num: 2, label: '2nd Grade', desc: 'Addition & Subtraction (1-50)', color: 'bg-blue-400' },
  { num: 3, label: '3rd Grade', desc: '+ − × (1-100)', color: 'bg-purple-400' },
  { num: 4, label: '4th Grade', desc: '+ − × ÷ (1-200)', color: 'bg-orange-400' },
  { num: 5, label: '5th Grade', desc: '+ − × ÷ (bigger numbers)', color: 'bg-red-400' },
];

const difficulties = [
  { id: 'easy', label: 'Easy', desc: 'One missing number per equation', emoji: '🌟' },
  { id: 'medium', label: 'Medium', desc: 'Multiple missing numbers', emoji: '⭐' },
  { id: 'hard', label: 'Hard', desc: 'Logic & elimination needed', emoji: '🔥' },
];

export default function Home() {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const handlePlay = () => {
    if (selectedGrade && selectedDifficulty) {
      router.push(`/play?grade=${selectedGrade}&difficulty=${selectedDifficulty}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-4xl font-extrabold text-indigo-600 mb-1 tracking-tight">
        CrossMath
      </h1>
      <p className="text-gray-500 mb-6 text-sm">Crossword Math Puzzles</p>

      {/* Grade Selection */}
      <section className="w-full mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-2">Pick Your Grade</h2>
        <div className="flex flex-col gap-2">
          {grades.map(g => (
            <button
              key={g.num}
              onClick={() => setSelectedGrade(g.num)}
              className={`
                w-full text-left p-3 rounded-xl border-2 transition-all
                ${selectedGrade === g.num
                  ? 'border-indigo-500 bg-indigo-50 shadow-md scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`${g.color} text-white font-bold rounded-lg w-10 h-10 flex items-center justify-center text-lg`}>
                  {g.num}
                </span>
                <div>
                  <div className="font-bold text-gray-800">{g.label}</div>
                  <div className="text-xs text-gray-500">{g.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Difficulty Selection */}
      <section className="w-full mb-8">
        <h2 className="text-lg font-bold text-gray-700 mb-2">Pick Difficulty</h2>
        <div className="flex gap-2">
          {difficulties.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDifficulty(d.id)}
              className={`
                flex-1 p-3 rounded-xl border-2 text-center transition-all
                ${selectedDifficulty === d.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300'}
              `}
            >
              <div className="text-2xl mb-1">{d.emoji}</div>
              <div className="font-bold text-gray-800 text-sm">{d.label}</div>
              <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Play Button */}
      <button
        onClick={handlePlay}
        disabled={!selectedGrade || !selectedDifficulty}
        className={`
          w-full py-4 rounded-2xl text-xl font-extrabold text-white transition-all
          ${selectedGrade && selectedDifficulty
            ? 'bg-indigo-500 hover:bg-indigo-600 active:scale-95 shadow-lg'
            : 'bg-gray-300 cursor-not-allowed'}
        `}
      >
        Play!
      </button>
    </main>
  );
}
