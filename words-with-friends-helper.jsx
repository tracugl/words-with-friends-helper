import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import words from "an-array-of-english-words";

const TILE_VALUES = {
  a: 1,
  b: 4,
  c: 4,
  d: 2,
  e: 1,
  f: 4,
  g: 3,
  h: 3,
  i: 1,
  j: 10,
  k: 5,
  l: 2,
  m: 4,
  n: 2,
  o: 1,
  p: 4,
  q: 10,
  r: 1,
  s: 1,
  t: 1,
  u: 2,
  v: 5,
  w: 4,
  x: 8,
  y: 3,
  z: 10,
};

const TILE_ORDER = "abcdefghijklmnopqrstuvwxyz".split("");

const RAW_WORDS = Array.isArray(words) ? words : [];
const DICTIONARY = RAW_WORDS
  .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
  .map((word) => word.toLowerCase())
  .filter((word) => word.length > 1 && /^[a-z]+$/.test(word));

function normalizeString(value) {
  return typeof value === "string" ? value : String(value ?? "");
}

function scoreWord(word) {
  return normalizeString(word)
    .split("")
    .reduce((sum, char) => sum + (TILE_VALUES[char] || 0), 0);
}

function sanitizeLetters(value) {
  return normalizeString(value).toLowerCase().replace(/[^a-z*?]/g, "");
}

function sanitizePattern(value) {
  return normalizeString(value).toLowerCase().replace(/[^a-z_]/g, "");
}

function sanitizeBoardLetters(value) {
  return normalizeString(value).toLowerCase().replace(/[^a-z]/g, "");
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

  if (!cleanPattern) return [];

  for (let start = 0; start <= cleanWord.length - cleanPattern.length; start += 1) {
    let matched = true;
    const indices = [];

    for (let offset = 0; offset < cleanPattern.length; offset += 1) {
      const patternChar = cleanPattern[offset];
      const wordChar = cleanWord[start + offset];

      if (!wordChar) {
        matched = false;
        break;
      }

      if (patternChar === "_") continue;
      if (patternChar !== wordChar) {
        matched = false;
        break;
      }

      indices.push(start + offset);
    }

    if (matched) return indices;
  }

  return null;
}

function getFirstAnchorIndex(word, allowedLetters) {
  const cleanWord = sanitizeBoardLetters(word);
  const cleanAllowedLetters = sanitizeBoardLetters(allowedLetters);

  if (!cleanAllowedLetters) return null;

  for (let index = 0; index < cleanWord.length; index += 1) {
    if (cleanAllowedLetters.includes(cleanWord[index])) return index;
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
      const patternIndices = hasPattern ? getPatternMatchIndices(word, cleanedPattern) : [];
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

      return {
        word,
        score: scoreWord(word),
        patternIndices: new Set(patternIndices),
        crossingIndex,
        boardLetterIndex,
        wildcardIndices,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    .slice(0, limit);
}

function LetterTile({ letter, value, small = false, variant = "normal" }) {
  const variantStyles = {
    normal: "from-amber-100 to-amber-200 border-amber-300",
    wildcard: "from-purple-100 to-purple-200 border-purple-300",
    anchored: "from-rose-100 to-rose-200 border-rose-300",
    crossing: "from-blue-100 to-blue-200 border-blue-300",
    board: "from-teal-100 to-teal-200 border-teal-300",
  };

  return (
    <div
      className={[
        "relative rounded-2xl border bg-gradient-to-br shadow-sm ring-1 ring-black/5",
        variantStyles[variant],
        small ? "h-10 w-10" : "h-12 w-12",
      ].join(" ")}
    >
      <span
        className={[
          "absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 font-bold uppercase text-stone-800",
          small ? "text-base" : "text-lg",
        ].join(" ")}
      >
        {letter}
      </span>
      <span className="absolute bottom-1 right-1 text-xs font-semibold text-stone-700">{value}</span>
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

export default function App() {
  const [letters, setLetters] = useState("");
  const [pattern, setPattern] = useState("");
  const [boardWord, setBoardWord] = useState("");
  const [boardLetters, setBoardLetters] = useState("");

  const results = useMemo(
    () => solveWords({ letters, pattern, boardWord, boardLetters }),
    [letters, pattern, boardWord, boardLetters],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Words With Friends Helper</h1>

      <div className="grid items-stretch gap-6 md:grid-cols-4">
        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader>
            <PanelTitle title="Letters" variant="normal" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Enter your rack letters. Use * or ? as wildcards.
            </p>
            <div className="mt-auto">
              <Input value={letters} onChange={(event) => setLetters(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader>
            <PanelTitle title="Pattern" variant="anchored" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Lock letters in position using _. Example: d_p means D, any letter, P.
            </p>
            <div className="mt-auto">
              <Input value={pattern} onChange={(event) => setPattern(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader>
            <PanelTitle title="Board Word" variant="crossing" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Existing word on the board. One letter can be used as a crossing tile.
            </p>
            <div className="mt-auto">
              <Input value={boardWord} onChange={(event) => setBoardWord(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col overflow-hidden">
          <CardHeader>
            <PanelTitle title="Board Letters" variant="board" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 px-6 pb-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Loose letters already on the board. One can be used as a crossing tile.
            </p>
            <div className="mt-auto">
              <Input value={boardLetters} onChange={(event) => setBoardLetters(event.target.value)} />
            </div>
          </CardContent>
        </Card>
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
                  <span className="ml-4 shrink-0 font-semibold text-stone-700">{result.score}</span>
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
            {TILE_ORDER.map((letter) => (
              <LetterTile key={letter} letter={letter} value={TILE_VALUES[letter]} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

