import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import words from "an-array-of-english-words";

const TILE_VALUES = {
  a: 1, b: 4, c: 4, d: 2, e: 1, f: 4, g: 3, h: 3, i: 1, j: 10,
  k: 5, l: 2, m: 4, n: 2, o: 1, p: 4, q: 10, r: 1, s: 1, t: 1,
  u: 2, v: 5, w: 4, x: 8, y: 3, z: 10,
};

/** CSS classes defined in index.css — driven by CSS variables, theme-aware */
const VARIANT_STYLES = {
  normal:   "tile-normal",
  wildcard: "tile-wildcard",
  anchored: "tile-anchored",
  crossing: "tile-crossing",
  board:    "tile-board",
};

const INPUT_PANELS = [
  { key: "letters",      title: "Letters",       variant: "normal",   description: "Enter your rack letters. Use * or ? as wildcards." },
  { key: "pattern",      title: "Pattern",        variant: "anchored", description: "Lock letters in position using _. Example: d_p means D, any letter, P." },
  { key: "boardWord",    title: "Board Word",     variant: "crossing", description: "Existing word on the board. One letter can be used as a crossing tile." },
  { key: "boardLetters", title: "Board Letters",  variant: "board",    description: "Loose letters already on the board. One can be used as a crossing tile." },
];

const DICTIONARY = (Array.isArray(words) ? words : [])
  .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")).toLowerCase())
  .filter((word) => word.length > 1 && /^[a-z]+$/.test(word));

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("wwfh-theme") || "light"; } catch { return "light"; }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("wwfh-theme", theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return { theme, toggleTheme };
}

function normalizeString(value) {
  return typeof value === "string" ? value : String(value ?? "");
}

function sanitize(value, regex) {
  return normalizeString(value).toLowerCase().replace(regex, "");
}

const sanitizeLetters      = (v) => sanitize(v, /[^a-z*?]/g);
const sanitizePattern      = (v) => sanitize(v, /[^a-z_]/g);
const sanitizeBoardLetters = (v) => sanitize(v, /[^a-z]/g);

function scoreWord(word) {
  return word.split("").reduce((sum, char) => sum + (TILE_VALUES[char] || 0), 0);
}

function getRackCounts(letters) {
  const counts = {};
  let wildcards = 0;

  for (const char of sanitizeLetters(letters)) {
    if (char === "*" || char === "?") wildcards += 1;
    else counts[char] = (counts[char] || 0) + 1;
  }

  return { counts, wildcards };
}

function getPatternMatchIndices(word, pattern) {
  const cleanWord = sanitizeBoardLetters(word);
  const cleanPattern = sanitizePattern(pattern);

  if (!cleanPattern) return null;

  for (let start = 0; start <= cleanWord.length - cleanPattern.length; start += 1) {
    let matched = true;
    const indices = [];

    for (let offset = 0; offset < cleanPattern.length; offset += 1) {
      const patternChar = cleanPattern[offset];
      const wordChar = cleanWord[start + offset];

      if (!wordChar) { matched = false; break; }
      if (patternChar === "_") continue;
      if (patternChar !== wordChar) { matched = false; break; }

      indices.push(start + offset);
    }

    if (matched) return new Set(indices);
  }

  return null;
}

function getFirstAnchorIndex(word, allowedLetters) {
  const cleanWord = sanitizeBoardLetters(word);
  const allowedSet = new Set(sanitizeBoardLetters(allowedLetters));

  if (allowedSet.size === 0) return null;

  for (let index = 0; index < cleanWord.length; index += 1) {
    if (allowedSet.has(cleanWord[index])) return index;
  }

  return null;
}

function solveWords({ letters = "", pattern = "", boardWord = "", boardLetters = "", limit = 100 }) {
  const cleanedLetters = sanitizeLetters(letters);
  const cleanedPattern = sanitizePattern(pattern);
  const cleanedBoardWord = sanitizeBoardLetters(boardWord);
  const cleanedBoardLetters = sanitizeBoardLetters(boardLetters);

  const hasLetters = cleanedLetters.length > 0;
  const hasPattern = cleanedPattern.length > 0;
  const hasBoardWord = cleanedBoardWord.length > 0;
  const hasBoardLetters = cleanedBoardLetters.length > 0;

  if (!hasLetters && !hasPattern && !hasBoardWord && !hasBoardLetters) return [];

  const { counts, wildcards } = getRackCounts(cleanedLetters);

  return DICTIONARY
    .map((word) => {
      const patternIndices = hasPattern ? getPatternMatchIndices(word, cleanedPattern) : new Set();
      if (hasPattern && patternIndices === null) return null;

      const crossingIndex = hasBoardWord ? getFirstAnchorIndex(word, cleanedBoardWord) : null;
      if (hasBoardWord && crossingIndex === null) return null;

      const boardLetterIndex = hasBoardLetters ? getFirstAnchorIndex(word, cleanedBoardLetters) : null;
      if (hasBoardLetters && boardLetterIndex === null) return null;

      const protectedIndices = new Set([
        ...patternIndices,
        ...(crossingIndex !== null ? [crossingIndex] : []),
        ...(boardLetterIndex !== null ? [boardLetterIndex] : []),
      ]);

      const tempCounts = { ...counts };
      let remainingWildcards = wildcards;
      const wildcardIndices = new Set();

      if (hasLetters) {
        for (let index = 0; index < word.length; index += 1) {
          if (protectedIndices.has(index)) continue;

          const char = word[index];
          if (tempCounts[char]) {
            tempCounts[char] -= 1;
          } else if (remainingWildcards > 0) {
            remainingWildcards -= 1;
            wildcardIndices.add(index);
          } else {
            return null;
          }
        }
      }

      return { word, score: scoreWord(word), patternIndices, crossingIndex, boardLetterIndex, wildcardIndices };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    .slice(0, limit);
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function LetterTile({ letter, value, small = false, variant = "normal" }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border shadow-sm ring-1 ring-black/5",
        VARIANT_STYLES[variant],
        small ? "h-10 w-10" : "h-12 w-12",
      )}
    >
      <span
        className={cn(
          "absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 font-bold uppercase",
          small ? "text-base" : "text-lg",
        )}
        style={{ color: "var(--tile-text)" }}
      >
        {letter}
      </span>
      <span
        className="absolute bottom-1 right-1 text-xs font-semibold"
        style={{ color: "var(--tile-score)" }}
      >
        {value}
      </span>
    </div>
  );
}

function PanelTitle({ title, variant }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <CardTitle>{title}</CardTitle>
      <LetterTile letter="A" value={1} small variant={variant} />
    </div>
  );
}

function InputPanel({ title, variant, description, value, onChange }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader>
        <PanelTitle title={title} variant={variant} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Input className="mt-auto" value={value} onChange={onChange} />
      </CardContent>
    </Card>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [fields, setFields] = useState({ letters: "", pattern: "", boardWord: "", boardLetters: "" });

  const debouncedLetters      = useDebounce(fields.letters, 200);
  const debouncedPattern      = useDebounce(fields.pattern, 200);
  const debouncedBoardWord    = useDebounce(fields.boardWord, 200);
  const debouncedBoardLetters = useDebounce(fields.boardLetters, 200);

  const results = useMemo(
    () => solveWords({ letters: debouncedLetters, pattern: debouncedPattern, boardWord: debouncedBoardWord, boardLetters: debouncedBoardLetters }),
    [debouncedLetters, debouncedPattern, debouncedBoardWord, debouncedBoardLetters],
  );

  function handleChange(key) {
    return (e) => setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Words With Friends Helper</h1>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground card-shadow hover:text-foreground"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>

      <div className="grid items-stretch gap-6 md:grid-cols-4">
        {INPUT_PANELS.map(({ key, title, variant, description }) => (
          <InputPanel
            key={key}
            title={title}
            variant={variant}
            description={description}
            value={fields[key]}
            onChange={handleChange(key)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matching words</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enter rack letters, a pattern, board word, or board letters to see matches.
              </p>
            ) : (
              results.map((result) => (
                <div
                  key={result.word}
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                >
                  <div className="flex flex-wrap gap-1">
                    {result.word.split("").map((char, index) => {
                      let variant = "normal";
                      if (result.patternIndices.has(index)) variant = "anchored";
                      else if (result.crossingIndex === index) variant = "crossing";
                      else if (result.boardLetterIndex === index) variant = "board";
                      else if (result.wildcardIndices.has(index)) variant = "wildcard";

                      return (
                        <LetterTile
                          key={`${result.word}-${index}`}
                          letter={char}
                          value={TILE_VALUES[char] || 0}
                          small
                          variant={variant}
                        />
                      );
                    })}
                  </div>
                  <span className="ml-4 shrink-0 font-semibold text-muted-foreground">{result.score}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tile values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-9 justify-items-center gap-1">
            {Object.keys(TILE_VALUES).map((letter) => (
              <LetterTile key={letter} letter={letter} value={TILE_VALUES[letter]} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
