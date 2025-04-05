import React, { useState, useRef } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [recording, setRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // <-- Track errors
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setErrorMessage(null); // reset any previous errors
      // Request audio stream from the user's microphone.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.start();
      setRecording(true);

      // When audio data is available, store it.
      mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      // When recording stops, combine the chunks and return the Blob.
      mediaRecorder.addEventListener('stop', () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          onRecordingComplete(audioBlob);
        } catch (err) {
          console.error('Error creating audio blob:', err);
          setErrorMessage('Could not process the audio recording.');
        }
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setErrorMessage(
        'Could not access microphone. Please ensure permissions are granted and try again.'
      );
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
    } catch (err) {
      console.error('Error stopping the recorder:', err);
      setErrorMessage('Could not stop the recorder properly.');
    }
  };

  return (
    <div>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {/* Display any errors to the user */}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
    </div>
  );
};

export default AudioRecorder;
