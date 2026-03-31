import { Cell, Difficulty, Operator, Puzzle, Template, TemplateChar } from './types';
import { extractEquations, getTemplatesForConfig } from './puzzle-templates';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOperator(operators: Operator[]): Operator {
  return operators[Math.floor(Math.random() * operators.length)];
}

function compute(a: number, op: Operator, b: number): number | null {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 && a % b === 0 ? a / b : null;
  }
}

interface GradeConfig {
  operators: Operator[];
  minNum: number;
  maxNum: number;
  maxResult: number;
}

function getGradeConfig(grade: number): GradeConfig {
  switch (grade) {
    case 1: return { operators: ['+', '-'], minNum: 1, maxNum: 10, maxResult: 20 };
    case 2: return { operators: ['+', '-'], minNum: 1, maxNum: 20, maxResult: 50 };
    case 3: return { operators: ['+', '-', '×'], minNum: 1, maxNum: 12, maxResult: 100 };
    case 4: return { operators: ['+', '-', '×', '÷'], minNum: 1, maxNum: 15, maxResult: 200 };
    case 5: return { operators: ['+', '-', '×', '÷'], minNum: 1, maxNum: 20, maxResult: 400 };
    default: return { operators: ['+', '-'], minNum: 1, maxNum: 10, maxResult: 20 };
  }
}

// Generate a valid equation: a op b = c
function generateEquation(
  config: GradeConfig,
  constraints: Map<number, number>, // position index -> forced value
): { values: number[]; operator: Operator } | null {
  // positions: 0=a, 1=op, 2=b, 3==, 4=c
  for (let attempt = 0; attempt < 100; attempt++) {
    const op = pickOperator(config.operators);
    let a: number, b: number, c: number | null;

    if (constraints.has(0) && constraints.has(2)) {
      a = constraints.get(0)!;
      b = constraints.get(2)!;
      c = compute(a, op, b);
      if (c === null || c < 0 || c > config.maxResult) continue;
      if (constraints.has(4) && constraints.get(4) !== c) continue;
    } else if (constraints.has(0)) {
      a = constraints.get(0)!;
      b = randInt(config.minNum, config.maxNum);
      c = compute(a, op, b);
      if (c === null || c < 0 || c > config.maxResult) continue;
      if (constraints.has(4) && constraints.get(4) !== c) continue;
    } else if (constraints.has(2)) {
      b = constraints.get(2)!;
      a = randInt(config.minNum, config.maxNum);
      c = compute(a, op, b);
      if (c === null || c < 0 || c > config.maxResult) continue;
      if (constraints.has(4) && constraints.get(4) !== c) continue;
    } else if (constraints.has(4)) {
      c = constraints.get(4)!;
      // Work backwards
      if (op === '+') {
        a = randInt(config.minNum, Math.min(c - 1, config.maxNum));
        b = c - a;
        if (b < config.minNum || b > config.maxNum) continue;
      } else if (op === '-') {
        b = randInt(config.minNum, config.maxNum);
        a = c + b;
        if (a < config.minNum || a > config.maxResult) continue;
      } else if (op === '×') {
        // Find factors of c
        const factors: number[] = [];
        for (let f = config.minNum; f <= Math.min(c, config.maxNum); f++) {
          if (c % f === 0 && c / f >= config.minNum && c / f <= config.maxNum) {
            factors.push(f);
          }
        }
        if (factors.length === 0) continue;
        a = factors[randInt(0, factors.length - 1)];
        b = c / a;
      } else {
        // ÷: a ÷ b = c => a = b * c
        b = randInt(config.minNum, config.maxNum);
        a = b * c;
        if (a > config.maxResult) continue;
      }
      if (a < 0 || b < 0) continue;
    } else {
      a = randInt(config.minNum, config.maxNum);
      b = randInt(config.minNum, config.maxNum);

      // For subtraction, ensure a >= b for non-negative results
      if (op === '-' && a < b) [a, b] = [b, a];
      // For division, ensure clean division
      if (op === '÷') {
        if (b === 0) continue;
        a = b * randInt(1, Math.floor(config.maxResult / b));
      }

      c = compute(a, op, b);
      if (c === null || c < 0 || c > config.maxResult) continue;
    }

    return { values: [a, 0, b, 0, c!], operator: op };
  }
  return null;
}

function fillGrid(
  template: Template,
  equations: [number, number][][],
  config: GradeConfig,
): Map<string, number | Operator | '='> | null {
  const grid = new Map<string, number | Operator | '='>();

  // Process equations in order, respecting constraints from shared cells
  for (const eq of equations) {
    const constraints = new Map<number, number>();

    // Check if any number positions already have values
    const numPositions = [0, 2, 4]; // indices in the 5-cell equation
    for (const pos of numPositions) {
      const [r, c] = eq[pos];
      const key = `${r},${c}`;
      const existing = grid.get(key);
      if (existing !== undefined && typeof existing === 'number') {
        constraints.set(pos, existing);
      }
    }

    const result = generateEquation(config, constraints);
    if (!result) return null;

    // Fill in the grid
    const { values, operator } = result;
    grid.set(`${eq[0][0]},${eq[0][1]}`, values[0]);   // a
    grid.set(`${eq[1][0]},${eq[1][1]}`, operator);      // op
    grid.set(`${eq[2][0]},${eq[2][1]}`, values[2]);     // b
    grid.set(`${eq[3][0]},${eq[3][1]}`, '=');            // =
    grid.set(`${eq[4][0]},${eq[4][1]}`, values[4]);     // c
  }

  return grid;
}

function removeAmbiguousBlanks(
  blanks: Set<string>,
  equations: [number, number][][],
  grid: Map<string, number | Operator | '='>,
) {
  for (const eq of equations) {
    const blankPositions: { key: string; posIdx: number; value: number }[] = [];
    for (const posIdx of [0, 2, 4]) {
      const [r, c] = eq[posIdx];
      const key = `${r},${c}`;
      if (blanks.has(key)) {
        blankPositions.push({ key, posIdx, value: grid.get(key) as number });
      }
    }
    if (blankPositions.length < 2) continue;

    // Check for swappable pairs
    const opKey = `${eq[1][0]},${eq[1][1]}`;
    const op = grid.get(opKey) as string;
    const isCommutative = op === '+' || op === '×';

    for (let i = 0; i < blankPositions.length; i++) {
      for (let j = i + 1; j < blankPositions.length; j++) {
        const a = blankPositions[i];
        const b = blankPositions[j];
        // Same value = always ambiguous
        if (a.value === b.value) {
          blanks.delete(b.key);
          continue;
        }
        // Both operands (positions 0,2) + commutative op = ambiguous
        if (a.posIdx !== 4 && b.posIdx !== 4 && isCommutative) {
          blanks.delete(b.key);
        }
      }
    }
  }
}

function chooseBlanks(
  equations: [number, number][][],
  difficulty: Difficulty,
  template: Template,
  grid: Map<string, number | Operator | '='>,
): Set<string> {
  // Collect all number cells
  const numberCells: string[] = [];
  const rows = template.length;
  const cols = template[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (template[r][c] === 'N') {
        numberCells.push(`${r},${c}`);
      }
    }
  }

  // Build map: cell -> which equations it belongs to
  const cellEquations = new Map<string, number[]>();
  for (let eqIdx = 0; eqIdx < equations.length; eqIdx++) {
    for (const pos of [0, 2, 4]) {
      const [r, c] = equations[eqIdx][pos];
      const key = `${r},${c}`;
      if (!cellEquations.has(key)) cellEquations.set(key, []);
      cellEquations.get(key)!.push(eqIdx);
    }
  }

  const blanks = new Set<string>();

  if (difficulty === 'easy') {
    // One blank per equation — prefer operands (pos 0 or 2), never just the result
    for (let eqIdx = 0; eqIdx < equations.length; eqIdx++) {
      const operandKeys = [0, 2].map(p => {
        const [r, c] = equations[eqIdx][p];
        return `${r},${c}`;
      });
      const resultKey = (() => {
        const [r, c] = equations[eqIdx][4];
        return `${r},${c}`;
      })();
      // Prefer operands that aren't already blank elsewhere
      const operandCandidates = operandKeys.filter(p => !blanks.has(p));
      if (operandCandidates.length > 0) {
        blanks.add(operandCandidates[randInt(0, operandCandidates.length - 1)]);
      } else if (!blanks.has(resultKey)) {
        blanks.add(resultKey);
      }
    }
  } else if (difficulty === 'medium') {
    // 1-2 blanks per equation, but avoid ambiguous swaps
    for (let eqIdx = 0; eqIdx < equations.length; eqIdx++) {
      // Prefer starting with an operand blank, not the result
      const operandKeys = shuffle([0, 2].map(p => {
        const [r, c] = equations[eqIdx][p];
        return { key: `${r},${c}`, posIdx: p };
      }));
      const resultEntry = (() => {
        const [r, c] = equations[eqIdx][4];
        return { key: `${r},${c}`, posIdx: 4 };
      })();
      const positions = [...operandKeys, resultEntry]; // operands first
      const shuffled = positions.map(p => p.key);
      blanks.add(shuffled[0]);
      // Only add a second blank if it won't create an ambiguous swap
      if (shuffled.length > 1) {
        const blankVals = [shuffled[0], shuffled[1]].map(k => grid.get(k) as number);
        // If the two blank values are different AND the operator is not
        // commutative (or the blanks are operand+result not both operands),
        // it's safe to have two blanks
        const posIndices = [0, 2, 4];
        const blankPosIndices = [shuffled[0], shuffled[1]].map(k => {
          for (const p of posIndices) {
            const [r, c] = equations[eqIdx][p];
            if (`${r},${c}` === k) return p;
          }
          return -1;
        });
        const bothOperands = blankPosIndices.includes(0) && blankPosIndices.includes(2);
        const opKey = `${equations[eqIdx][1][0]},${equations[eqIdx][1][1]}`;
        const op = grid.get(opKey) as string;
        const isCommutative = op === '+' || op === '×';
        // Ambiguous if: both are operands, op is commutative, and values differ
        // OR: any two blanks with same value (swapping identical = same result)
        const sameValues = blankVals[0] === blankVals[1];
        const ambiguous = sameValues || (bothOperands && isCommutative);
        if (!ambiguous) {
          blanks.add(shuffled[1]);
        }
      }
    }
  } else {
    // Hard: most numbers are blank, but verify uniqueness
    const shuffled = shuffle(numberCells);
    // Leave only ~30% as given
    const givenCount = Math.max(2, Math.ceil(numberCells.length * 0.3));
    for (let i = givenCount; i < shuffled.length; i++) {
      blanks.add(shuffled[i]);
    }
    // Remove blanks that create ambiguous equations
    removeAmbiguousBlanks(blanks, equations, grid);
  }

  return blanks;
}

export function generatePuzzle(grade: number, difficulty: Difficulty): Puzzle {
  const gradeConfig = getGradeConfig(grade);
  const templates = getTemplatesForConfig(grade, difficulty);
  const template = templates[randInt(0, templates.length - 1)];
  const equations = extractEquations(template);

  // Try to fill the grid (may need multiple attempts)
  let filledGrid: Map<string, number | Operator | '='> | null = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    filledGrid = fillGrid(template, equations, gradeConfig);
    if (filledGrid) break;
  }

  if (!filledGrid) {
    // Fallback: try another template
    const otherTemplate = templates.find(t => t !== template) || template;
    const otherEqs = extractEquations(otherTemplate);
    for (let attempt = 0; attempt < 50; attempt++) {
      filledGrid = fillGrid(otherTemplate, otherEqs, gradeConfig);
      if (filledGrid) {
        return buildPuzzle(otherTemplate, otherEqs, filledGrid, grade, difficulty);
      }
    }
    // Last resort: generate a minimal puzzle
    return generateMinimalPuzzle(grade, difficulty);
  }

  return buildPuzzle(template, equations, filledGrid, grade, difficulty);
}

function buildPuzzle(
  template: Template,
  equations: [number, number][][],
  filledGrid: Map<string, number | Operator | '='>,
  grade: number,
  difficulty: Difficulty,
): Puzzle {
  const blanks = chooseBlanks(equations, difficulty, template, filledGrid);
  const solution = new Map<string, number>();
  const answerBank: number[] = [];

  const rows = template.length;
  const cols = template[0].length;
  const grid: Cell[][] = [];

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const tpl = template[r][c];
      const key = `${r},${c}`;
      const value = filledGrid.get(key) ?? null;

      if (tpl === '.') {
        grid[r][c] = { type: 'wall', value: null, isBlank: false, isGiven: false, row: r, col: c };
      } else if (tpl === 'O') {
        grid[r][c] = { type: 'operator', value: value as Operator, isBlank: false, isGiven: true, row: r, col: c };
      } else if (tpl === 'E') {
        grid[r][c] = { type: 'equals', value: '=', isBlank: false, isGiven: true, row: r, col: c };
      } else {
        const isBlank = blanks.has(key);
        if (isBlank) {
          solution.set(key, value as number);
          answerBank.push(value as number);
        }
        grid[r][c] = {
          type: 'number',
          value: isBlank ? null : value,
          isBlank,
          isGiven: !isBlank,
          row: r,
          col: c,
        };
      }
    }
  }

  return {
    grid,
    equations: equations.map(eq => ({ cells: eq })),
    solution,
    answerBank: shuffle(answerBank),
    grade,
    difficulty,
  };
}

// Minimal fallback: single equation puzzle
function generateMinimalPuzzle(grade: number, difficulty: Difficulty): Puzzle {
  const config = getGradeConfig(grade);
  const op = pickOperator(config.operators);
  let a = randInt(config.minNum, config.maxNum);
  let b = randInt(config.minNum, config.maxNum);
  if (op === '-' && a < b) [a, b] = [b, a];
  if (op === '÷') {
    b = randInt(1, config.maxNum);
    a = b * randInt(1, Math.min(10, Math.floor(config.maxResult / b)));
  }
  const c = compute(a, op, b)!;

  const template: Template = [['N','O','N','E','N']];
  const blankIdx = difficulty === 'hard' ? [0, 2] : [randInt(0, 1) === 0 ? 0 : 2];
  const solution = new Map<string, number>();
  const answerBank: number[] = [];

  const grid: Cell[][] = [[
    {
      type: 'number',
      value: blankIdx.includes(0) ? null : a,
      isBlank: blankIdx.includes(0),
      isGiven: !blankIdx.includes(0),
      row: 0, col: 0,
    },
    { type: 'operator', value: op, isBlank: false, isGiven: true, row: 0, col: 1 },
    {
      type: 'number',
      value: blankIdx.includes(1) ? null : b,
      isBlank: blankIdx.includes(1),
      isGiven: !blankIdx.includes(1),
      row: 0, col: 2,
    },
    { type: 'equals', value: '=', isBlank: false, isGiven: true, row: 0, col: 3 },
    {
      type: 'number',
      value: c,
      isBlank: false,
      isGiven: true,
      row: 0, col: 4,
    },
  ]];

  if (blankIdx.includes(0)) { solution.set('0,0', a); answerBank.push(a); }
  if (blankIdx.includes(1)) { solution.set('0,2', b); answerBank.push(b); }

  return {
    grid,
    equations: [{ cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] }],
    solution,
    answerBank: shuffle(answerBank),
    grade,
    difficulty,
  };
}
