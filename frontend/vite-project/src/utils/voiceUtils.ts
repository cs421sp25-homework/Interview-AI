// voiceUtils.ts
import API_BASE_URL from '../config/api';

/**
 * Convert text to speech by calling the /api/text2speech endpoint.
 * @param text The text to convert.
 * @param audioRefs An optional ref array to track active Audio objects.
 * @returns The audio duration (in seconds). 0 on error.
 */
export async function text2speech(
  text: string,
  audioRefs?: React.MutableRefObject<HTMLAudioElement[]>
): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/text2speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      console.error('TTS endpoint error:', response.status, response.statusText);
      return 0; // or throw new Error(...)
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // Track the audio element if provided
    if (audioRefs) {
      audioRefs.current.push(audio);
      audio.onended = () => {
        audioRefs.current = audioRefs.current.filter(a => a !== audio);
      };
    }

    return new Promise<number>((resolve) => {
      audio.onloadedmetadata = () => {
        const duration = audio.duration || 0;
        audio.play().catch((err) => {
          console.warn('Audio play was interrupted:', err);
        });
        resolve(duration);
      };
      // handle possible errors in loading or decoding the audio
      audio.onerror = (e) => {
        console.error('Audio onerror triggered:', e);
        resolve(0);
      };
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return 0;
  }
}

/**
 * Convert speech (audio Blob) to text by calling the /api/speech2text endpoint.
 * @param audioBlob The recorded audio as a Blob.
 * @returns A transcript string of recognized speech.
 */
export async function speech2text(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const response = await fetch(`${API_BASE_URL}/api/speech2text`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error('STT endpoint error:', response.status, response.statusText);
      throw new Error(`STT failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || typeof data.transcript !== 'string') {
      throw new Error('STT response was missing "transcript" field');
    }
    return data.transcript;
  } catch (error) {
    console.error('Speech-to-text error:', error);
    throw error; // Or return a fallback text, like "".
  }
}
