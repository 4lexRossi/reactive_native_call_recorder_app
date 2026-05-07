import React, { createContext, useContext, useState } from 'react';

const RecordingsContext = createContext(null);

// Demo / seeddata so the app looks populated on first launch
const SEED = [
  {
    id: '1',
    type: 'phone',
    caller: 'John Smith',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 183,
    uri: null,
    size: 2.4 * 1024 * 1024,
  },
  {
    id: '2',
    type: 'whatsapp',
    caller: 'Maria Garcia',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    duration: 421,
    uri: null,
    size: 5.1 * 1024 * 1024,
  },
  {
    id: '3',
    type: 'phone',
    caller: 'Office — HR',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 62,
    uri: null,
    size: 0.8 * 1024 * 1024,
  },
  {
    id: '4',
    type: 'whatsapp',
    caller: 'David Lee',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 905,
    uri: null,
    size: 11.2 * 1024 * 1024,
  },
];

export function RecordingsProvider({ children }) {
  const [recordings, setRecordings] = useState(SEED);

  function addRecording(rec) {
    setRecordings(prev => [rec, ...prev]);
  }

  function deleteRecording(id) {
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
