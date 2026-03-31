import { Template, TemplateChar } from './types';

// Templates define grid layouts
// N = number, O = operator, E = equals, . = wall
// Equations read left-to-right and top-to-bottom
// RULE: Every non-wall cell MUST belong to at least one 5-cell equation (N O N E N)

// 5x5: 1 horizontal + 1 vertical, sharing center operand
//   N O N E N
//   . . O . .
//   . . N . .
//   . . E . .
//   . . N . .
const SMALL_T: Template = [
  ['N','O','N','E','N'],
  ['.','.','O','.','.'],
  ['.','.','N','.','.'],
  ['.','.','E','.','.'],
  ['.','.','N','.','.'],
];

// 5x5: 2 horizontal + 2 vertical, full cross
//   N O N E N
//   O . . . .
//   N . . . .
//   E . . . .
//   N . . . .
const SMALL_CROSS: Template = [
  ['N','O','N','E','N'],
  ['O','.','.','.','.'],
  ['N','.','.','.','.'],
  ['E','.','.','.','.'],
  ['N','.','.','.','.'],
];

// Medium: 2 horizontal + 2 vertical, sharing corners
//   N O N E N
//   O . O . .
//   N . N . .
//   E . E . .
//   N O N E N
const MEDIUM_GRID: Template = [
  ['N','O','N','E','N'],
  ['O','.','O','.','.'],
  ['N','.','N','.','.'],
  ['E','.','E','.','.'],
  ['N','O','N','E','N'],
];

// Medium: 2 horizontal + 1 vertical, L-shape
//   N O N E N . .
//   . . O . . . .
//   . . N . . . .
//   . . E . . . .
//   . . N O N E N
const MEDIUM_L: Template = [
  ['N','O','N','E','N','.','.'],
  ['.','.','O','.','.','.','.'],
  ['.','.','N','.','.','.','.'],
  ['.','.','E','.','.','.','.'],
  ['.','.','N','O','N','E','N'],
];

// Large: 2 horizontal + 3 vertical
//   N O N E N . .
//   O . O . . . .
//   N . N O N E N
//   E . E . O . .
//   N . N . N . .
//   . . . . E . .
//   . . . . N . .
const LARGE_GRID: Template = [
  ['N','O','N','E','N','.','.'],
  ['O','.','O','.','.','.','.'],
  ['N','.','N','O','N','E','N'],
  ['E','.','E','.','O','.','.'],
  ['N','.','N','.','N','.','.'],
  ['.','.','.','.','E','.','.'],
  ['.','.','.','.','N','.','.'],
];

export function getTemplatesForConfig(grade: number, difficulty: string): Template[] {
  if (grade <= 2) {
    return [SMALL_CROSS, SMALL_T];
  }
  if (grade <= 3) {
    if (difficulty === 'easy') return [SMALL_CROSS, SMALL_T];
    return [MEDIUM_L, MEDIUM_GRID];
  }
  if (difficulty === 'easy') return [MEDIUM_L, MEDIUM_GRID];
  if (difficulty === 'medium') return [MEDIUM_GRID, LARGE_GRID];
  return [LARGE_GRID];
}

// Extract equations from a template
export function extractEquations(template: Template): [number, number][][] {
  const rows = template.length;
  const cols = template[0].length;
  const equations: [number, number][][] = [];

  // Horizontal equations
  for (let r = 0; r < rows; r++) {
    let eq: [number, number][] = [];
    for (let c = 0; c < cols; c++) {
      const cell = template[r][c];
      if (cell !== '.') {
        eq.push([r, c]);
      } else {
        if (eq.length >= 5) equations.push(eq);
        eq = [];
      }
    }
    if (eq.length >= 5) equations.push(eq);
  }

  // Vertical equations
  for (let c = 0; c < cols; c++) {
    let eq: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      const cell = template[r][c];
      if (cell !== '.') {
        eq.push([r, c]);
      } else {
        if (eq.length >= 5) equations.push(eq);
        eq = [];
      }
    }
    if (eq.length >= 5) equations.push(eq);
  }

  return equations;
}

// Get the set of all cells that belong to at least one equation
export function getEquationCells(template: Template): Set<string> {
  const equations = extractEquations(template);
  const cells = new Set<string>();
  for (const eq of equations) {
    for (const [r, c] of eq) {
      cells.add(`${r},${c}`);
    }
  }
  return cells;
}
