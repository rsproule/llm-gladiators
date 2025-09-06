import { words } from "./words.json";

export const getTabooWord = () => {
  return words[Math.floor(Math.random() * words.length)];
};

export const getWinner = (
  full: string,
  targetWord: string,
  label: "offense" | "defense",
) => {
  const containsTargetWord = full
    .toLowerCase()
    .includes(targetWord.toLowerCase());

  if (!containsTargetWord) {
    return {
      winner: null,
      reason: "No one said the target word: " + targetWord,
    };
  }

  // Check if defense said the word with exact "Guess: " prefix and quotes
  const guessPattern = new RegExp(`guess:\\s*"${targetWord}"`, "i");
  const hasGuessPrefix = guessPattern.test(full);

  if (label === "defense") {
    if (hasGuessPrefix) {
      return {
        winner: "defense",
        reason: "Defense correctly guessed the target word: " + targetWord,
      };
    } else {
      return {
        winner: "offense",
        reason:
          "Defense said the target word outside of the guess: " + targetWord,
      };
    }
  }

  return {
    winner: null,
    reason: "Unexpected condition",
  };
};
