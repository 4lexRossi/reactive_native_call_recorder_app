import React, { createContext, useContext, useState } from 'react';

const RecordingsContext = createContext(null);

export function RecordingsProvider({ children }) {
  const [recordings, setRecordings] = useState([]);

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
