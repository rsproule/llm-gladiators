import { words } from "./words.json";

export const getTabooWord = () => {
  return words[Math.floor(Math.random() * words.length)];
};

export const getWinner = (full: string, targetWord: string, label: string) => {
  const containsTargetWord = full
    .toLowerCase()
    .includes(targetWord.toLowerCase());

  if (!containsTargetWord) {
    return {
      winner: null,
      reason: "No one said the target word: " + targetWord,
    };
  }

  // Check if agent2 said the word with "Guess: " prefix
  const guessPattern = new RegExp(`guess:\\s*${targetWord}`, "i");
  const hasGuessPrefix = guessPattern.test(full);

  if (label === "agent2") {
    if (hasGuessPrefix) {
      return {
        winner: "agent2",
        reason: "Agent2 correctly guessed the target word: " + targetWord,
      };
    } else {
      return {
        winner: "agent1",
        reason:
          "Agent2 said the target word without 'Guess:' prefix: " + targetWord,
      };
    }
  }

  return {
    winner: null,
    reason: "Unexpected condition",
  };
};
