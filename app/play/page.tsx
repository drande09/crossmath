'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { generatePuzzle } from '@/lib/puzzle-generator';
import { Puzzle, Cell, Difficulty } from '@/lib/types';

function Confetti() {
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[i % colors.length],
    delay: Math.random() * 1.5,
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const grade = parseInt(searchParams.get('grade') || '1');
  const difficulty = (searchParams.get('difficulty') || 'easy') as Difficulty;

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [placed, setPlaced] = useState<Map<string, number>>(new Map());
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<number | null>(null); // index into bankRemaining
  const [checkResults, setCheckResults] = useState<Map<string, boolean> | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintCell, setHintCell] = useState<string | null>(null);
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);

  const newPuzzle = useCallback(() => {
    const p = generatePuzzle(grade, difficulty);
    setPuzzle(p);
    setPlaced(new Map());
    setSelectedCell(null);
    setSelectedBank(null);
    setCheckResults(null);
    setIsComplete(false);
    setHintsUsed(0);
    setHintCell(null);
  }, [grade, difficulty]);

  useEffect(() => { newPuzzle(); }, [newPuzzle]);

  if (!puzzle) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const bankAvailable = [...puzzle.answerBank];
  // Remove placed values from bank
  const placedValues = Array.from(placed.values());
  const bankRemaining = [...bankAvailable];
  for (const v of placedValues) {
    const idx = bankRemaining.indexOf(v);
    if (idx !== -1) bankRemaining.splice(idx, 1);
  }

  const placeNumber = (cellKey: string, value: number) => {
    const newPlaced = new Map(placed);
    newPlaced.set(cellKey, value);
    setPlaced(newPlaced);
    setAnimatingCell(cellKey);
    setTimeout(() => setAnimatingCell(null), 300);
    setSelectedCell(null);
    setSelectedBank(null);
    setCheckResults(null);

    // Check if all blanks filled
    if (newPlaced.size === puzzle.solution.size) {
      let allCorrect = true;
      const results = new Map<string, boolean>();
      for (const [key, correctVal] of puzzle.solution) {
        const placedVal = newPlaced.get(key);
        const correct = placedVal === correctVal;
        results.set(key, correct);
        if (!correct) allCorrect = false;
      }
      setCheckResults(results);
      if (allCorrect) setIsComplete(true);
    }
  };

  const handleCellTap = (row: number, col: number) => {
    const cell = puzzle.grid[row][col];
    if (cell.type !== 'number' || cell.isGiven) return;

    const key = `${row},${col}`;

    // If cell has a placed number, remove it back to bank
    if (placed.has(key)) {
      const newPlaced = new Map(placed);
      newPlaced.delete(key);
      setPlaced(newPlaced);
      setCheckResults(null);
      setSelectedCell(null);
      setSelectedBank(null);
      return;
    }

    // If a bank number is already selected, place it here
    if (selectedBank !== null) {
      placeNumber(key, bankRemaining[selectedBank]);
      return;
    }

    // Otherwise, select this cell and wait for bank tap
    setSelectedCell(key);
    setSelectedBank(null);
    setCheckResults(null);
  };

  const handleBankTap = (value: number, bankIndex: number) => {
    // If a cell is already selected, place this number there
    if (selectedCell) {
      placeNumber(selectedCell, value);
      return;
    }

    // Otherwise, select this bank number and wait for cell tap
    if (selectedBank === bankIndex) {
      setSelectedBank(null); // deselect on re-tap
    } else {
      setSelectedBank(bankIndex);
    }
    setSelectedCell(null);
    setCheckResults(null);
  };

  const handleCheck = () => {
    const results = new Map<string, boolean>();
    for (const [key, correctVal] of puzzle.solution) {
      const placedVal = placed.get(key);
      if (placedVal !== undefined) {
        results.set(key, placedVal === correctVal);
      }
    }
    setCheckResults(results);

    // Check if all correct
    let allCorrect = true;
    for (const [key, correctVal] of puzzle.solution) {
      if (placed.get(key) !== correctVal) { allCorrect = false; break; }
    }
    if (allCorrect && placed.size === puzzle.solution.size) setIsComplete(true);
  };

  const handleHint = () => {
    // Find an unfilled or incorrectly filled blank
    for (const [key, correctVal] of puzzle.solution) {
      if (!placed.has(key) || placed.get(key) !== correctVal) {
        const newPlaced = new Map(placed);
        newPlaced.set(key, correctVal);
        setPlaced(newPlaced);
        setHintsUsed(h => h + 1);
        setHintCell(key);
        setAnimatingCell(key);
        setTimeout(() => { setAnimatingCell(null); setHintCell(null); }, 1000);
        setCheckResults(null);

        // Check completion
        if (newPlaced.size === puzzle.solution.size) {
          let allCorrect = true;
          for (const [k, v] of puzzle.solution) {
            if (newPlaced.get(k) !== v) { allCorrect = false; break; }
          }
          if (allCorrect) setIsComplete(true);
        }
        return;
      }
    }
  };

  const getCellStyle = (cell: Cell) => {
    const key = `${cell.row},${cell.col}`;
    let bg = 'bg-white';
    let border = 'border-gray-200';
    let textColor = 'text-gray-800';
    let extra = '';

    if (cell.type === 'wall') return 'bg-transparent border-transparent';
    if (cell.type === 'operator' || cell.type === 'equals') {
      return 'bg-amber-50 border-amber-200 text-amber-700 font-extrabold text-lg';
    }

    // Number cell
    if (cell.isGiven) {
      bg = 'bg-slate-100';
      textColor = 'text-slate-700 font-extrabold';
    } else if (placed.has(key)) {
      bg = 'bg-indigo-50';
      textColor = 'text-indigo-600 font-bold';

      if (checkResults?.has(key)) {
        if (checkResults.get(key)) {
          bg = 'bg-green-100';
          border = 'border-green-400';
          textColor = 'text-green-700 font-bold';
        } else {
          bg = 'bg-red-100';
          border = 'border-red-400';
          textColor = 'text-red-600 font-bold';
          extra = 'animate-shake';
        }
      }
    } else if (selectedCell === key) {
      bg = 'bg-indigo-100';
      border = 'border-indigo-500 border-3';
    } else if (selectedBank !== null) {
      // A bank tile is selected — highlight empty cells as drop targets
      bg = 'bg-indigo-50';
      border = 'border-dashed border-indigo-300';
    } else {
      bg = 'bg-yellow-50';
      border = 'border-dashed border-yellow-300';
    }

    if (hintCell === key) {
      bg = 'bg-green-200';
      border = 'border-green-500';
    }

    if (animatingCell === key) {
      extra += ' animate-bounce-in';
    }

    return `${bg} border-2 ${border} ${textColor} ${extra}`;
  };

  const gridRows = puzzle.grid.length;
  const gridCols = puzzle.grid[0].length;

  return (
    <main className="min-h-screen flex flex-col items-center px-3 py-4 max-w-lg mx-auto">
      {isComplete && <Confetti />}

      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/')}
          className="text-indigo-500 font-bold text-sm p-2 -ml-2"
        >
          ← Back
        </button>
        <div className="text-center">
          <div className="font-extrabold text-indigo-600 text-lg">CrossMath</div>
          <div className="text-[10px] text-gray-400">
            Grade {grade} · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </div>
        </div>
        <button
          onClick={newPuzzle}
          className="text-indigo-500 font-bold text-sm p-2 -mr-2"
        >
          New
        </button>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="w-full bg-green-100 border-2 border-green-400 rounded-2xl p-4 mb-4 text-center animate-bounce-in">
          <div className="text-2xl mb-1">🎉</div>
          <div className="font-extrabold text-green-700 text-lg">Great Job!</div>
          <div className="text-green-600 text-sm">
            {hintsUsed === 0 ? 'Perfect - no hints needed!' : `Solved with ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}`}
          </div>
          <button
            onClick={newPuzzle}
            className="mt-3 bg-green-500 text-white font-bold px-6 py-2 rounded-xl active:scale-95 transition-transform"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Puzzle Grid */}
      <div
        className="w-full mb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: '4px',
          maxWidth: `${gridCols * 60}px`,
          margin: '0 auto',
        }}
      >
        {puzzle.grid.flat().map((cell) => {
          const key = `${cell.row},${cell.col}`;

          if (cell.type === 'wall') {
            return <div key={key} className="aspect-square" />;
          }

          const displayValue = cell.isGiven
            ? cell.value
            : placed.has(key)
              ? placed.get(key)
              : cell.type === 'operator' || cell.type === 'equals'
                ? cell.value
                : '';

          return (
            <button
              key={key}
              onClick={() => handleCellTap(cell.row, cell.col)}
              disabled={cell.isGiven || isComplete}
              className={`
                aspect-square rounded-lg flex items-center justify-center
                text-base transition-all
                ${getCellStyle(cell)}
                ${cell.isGiven ? 'cursor-default' : 'cursor-pointer active:scale-95'}
              `}
              style={{ minHeight: '48px', minWidth: '48px' }}
            >
              {displayValue ?? ''}
            </button>
          );
        })}
      </div>

      {/* Answer Bank */}
      {!isComplete && (
        <div className="w-full mb-4">
          <div className="text-xs text-gray-400 mb-2 text-center font-bold">
            {selectedCell
              ? 'Now tap a number'
              : selectedBank !== null
                ? 'Now tap a cell'
                : 'Tap a number or an empty cell'}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {bankRemaining.map((num, idx) => (
              <button
                key={`bank-${idx}`}
                onClick={() => handleBankTap(num, idx)}
                className={`
                  w-12 h-12 rounded-xl font-bold text-lg transition-all active:scale-90
                  ${selectedBank === idx
                    ? 'bg-indigo-700 text-white shadow-lg ring-2 ring-indigo-300 scale-110'
                    : 'bg-indigo-500 text-white shadow-md hover:bg-indigo-600'}
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isComplete && (
        <div className="w-full flex gap-3">
          <button
            onClick={handleHint}
            className="flex-1 py-3 rounded-xl font-bold text-amber-700 bg-amber-100 border-2 border-amber-300 active:scale-95 transition-transform"
          >
            💡 Hint
          </button>
          <button
            onClick={handleCheck}
            disabled={placed.size === 0}
            className={`
              flex-1 py-3 rounded-xl font-bold transition-transform
              ${placed.size > 0
                ? 'text-indigo-700 bg-indigo-100 border-2 border-indigo-300 active:scale-95'
                : 'text-gray-400 bg-gray-100 border-2 border-gray-200 cursor-not-allowed'}
            `}
          >
            ✓ Check
          </button>
        </div>
      )}
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
