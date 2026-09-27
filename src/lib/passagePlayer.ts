import type { VoiceGender } from "@/lib/speech";

/**
 * The page's whole-lesson player as data (계획 A10 · D01 — 2026-09-27): the same props page.tsx renders the top AudioPlayer
 * with, handed to a course view that plays the lesson in its own place (VOCA: the head of the Step 1 word list; LISTENING ·
 * READING: their own steps). The view marks itself data-owns-passage-player and globals.css hides the top one — nothing
 * spoken changes, it is the same src, sentences, voice and label.
 */
export interface PassagePlayerData {
  id: string;
  src?: string;
  fallbackSentences: string[];
  lang: string;
  gender: VoiceGender;
  label?: string;
}
