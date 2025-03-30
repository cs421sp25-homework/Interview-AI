import API_BASE_URL from '../config/api';

export async function text2speech(text: string): Promise<number> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/text2speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error(`TTS failed: ${response.status}`);
        }

        const duration = parseFloat(response.headers.get('X-Audio-Duration') || '0');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return new Promise<number>((resolve) => {
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve(duration);
            };
            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                resolve(duration);
            };
            audio.play();
        });
    } catch (error) {
        console.error('Text-to-speech error:', error);
        throw error;
    }
}

export async function speech2text(audioBlob: Blob): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        const response = await fetch(`${API_BASE_URL}/api/speech2text`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`STT failed: ${response.status}`);
        }

        const data = await response.json();
        return data.transcript;
    } catch (error) {
        console.error('Speech-to-text error:', error);
        throw error;
    }
}