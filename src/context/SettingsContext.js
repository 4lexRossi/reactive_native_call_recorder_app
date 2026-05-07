import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext(null);

const DEFAULT = {
  highQuality: true,
  notifications: true,
  vibrate: true,
  autoBackup: false,
  autoDelete: false,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT);

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
