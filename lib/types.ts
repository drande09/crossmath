export type Operator = '+' | '-' | '×' | '÷';
export type CellType = 'number' | 'operator' | 'equals' | 'wall';

export interface Cell {
  type: CellType;
  value: number | Operator | '=' | null;
  isBlank: boolean;    // true = player must fill this in
  isGiven: boolean;    // true = pre-filled, can't change
  row: number;
  col: number;
}

export interface Equation {
  cells: [number, number][]; // [row, col] coords of each cell in order
  // Pattern: number operator number = number
}

export interface Puzzle {
  grid: Cell[][];
  equations: Equation[];
  solution: Map<string, number>; // "row,col" -> correct value
  answerBank: number[];          // shuffled list of numbers to place
  grade: number;
  difficulty: Difficulty;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  puzzle: Puzzle;
  placed: Map<string, number>;    // "row,col" -> placed value
  selectedCell: string | null;     // "row,col" of selected blank
  checkResults: Map<string, boolean> | null; // "row,col" -> correct?
  hintsUsed: number;
  isComplete: boolean;
}

// Template: defines the shape of a puzzle grid
// 'N' = number cell, 'O' = operator cell, 'E' = equals cell, '.' = wall
export type TemplateChar = 'N' | 'O' | 'E' | '.';
export type Template = TemplateChar[][];

export interface PuzzleConfig {
  grade: number;
  difficulty: Difficulty;
  operators: Operator[];
  numberRange: [number, number];
  template: Template;
  blanksToRemove: number;
}
