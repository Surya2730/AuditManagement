import { useState, useEffect } from 'react';

const useLocalStorage = (key, initialValue) => {
  const [state, setState] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage key:', key, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error setting localStorage key:', key, error);
    }
  }, [key, state]);

  return [state, setState];
};

export default useLocalStorage;
