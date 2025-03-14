// project/frontend/vite-project/src/utils/voiceUtils.ts

import API_BASE_URL from '../config/api';

export function text2speech(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    // Optional: set utterance.lang or choose a voice
    // utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }  

/**
 * Calls the speech2text API to convert recorded audio into text.
 * This function sends the audio blob as form data.
 *
 * @param audioBlob - The audio Blob recorded from the user.
 * @returns A Promise that resolves with the transcribed text.
 */
export async function speech2text(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  
  const res = await fetch(`${API_BASE_URL}/api/speech2text`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error("Speech-to-Text conversion failed");
  }
  const data = await res.json();
  return data.transcript;
}
