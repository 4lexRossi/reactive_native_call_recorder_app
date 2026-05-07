import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system';

const METADATA_FILE = FileSystem.documentDirectory + 'recordings.json';
const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';

const RecordingsContext = createContext(null);

export function RecordingsProvider({ children }) {
  const [recordings, setRecordings] = useState([]);
  const isInitialMount = useRef(true);

  // Ensure recordings directory exists
  useEffect(() => {
    async function init() {
      const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
      }

      // Load metadata
      const fileInfo = await FileSystem.getInfoAsync(METADATA_FILE);
      if (fileInfo.exists) {
        try {
          const content = await FileSystem.readAsStringAsync(METADATA_FILE);
          setRecordings(JSON.parse(content));
        } catch (e) {
          console.error('Failed to parse recordings metadata', e);
        }
      }
      isInitialMount.current = false;
    }
    init();
  }, []);

  // Persist metadata when recordings change
  useEffect(() => {
    if (!isInitialMount.current) {
      FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(recordings))
        .catch(e => console.error('Failed to save recordings metadata', e));
    }
  }, [recordings]);

  async function addRecording(rec) {
    try {
      // Move file to permanent location
      const filename = `recording_${rec.id}.m4a`;
      const permanentUri = RECORDINGS_DIR + filename;
      
      await FileSystem.moveAsync({
        from: rec.uri,
        to: permanentUri
      });

      const finalRec = { ...rec, uri: permanentUri };
      setRecordings(prev => [finalRec, ...prev]);
      return finalRec;
    } catch (e) {
      console.error('Failed to save recording file', e);
      // Fallback: add anyway or throw error?
      setRecordings(prev => [rec, ...prev]);
    }
  }

  async function deleteRecording(id) {
    const recToDelete = recordings.find(r => r.id === id);
    if (recToDelete && recToDelete.uri) {
      try {
        const info = await FileSystem.getInfoAsync(recToDelete.uri);
        if (info.exists) {
          await FileSystem.deleteAsync(recToDelete.uri);
        }
      } catch (e) {
        console.error('Failed to delete recording file', e);
      }
    }
    setRecordings(prev => prev.filter(r => r.id !== id));
  }

  return (
    <RecordingsContext.Provider value={{ recordings, addRecording, deleteRecording }}>
      {children}
    </RecordingsContext.Provider>
  );
}

export function useRecordings() {
  return useContext(RecordingsContext);
}
