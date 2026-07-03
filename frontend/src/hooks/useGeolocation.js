import { useState, useEffect } from 'react';

// Distance calculation in meters using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const useGeolocation = (targetCoords = null, allowedRadius = 50) => {
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null, accuracy: null });
  const [error, setError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isInside, setIsInside] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const success = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const acc = position.coords.accuracy;

      setCoordinates({ latitude: lat, longitude: lng, accuracy: acc });
      setError(null);

      // Compute geofence checks if target exists
      if (targetCoords && targetCoords.latitude && targetCoords.longitude) {
        const computedDist = calculateDistance(lat, lng, targetCoords.latitude, targetCoords.longitude);
        setDistance(computedDist);
        setIsInside(computedDist <= allowedRadius);
      }
    };

    const handleError = (err) => {
      let errorMsg = 'Error retrieving GPS coordinates';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMsg = 'GPS Geolocation permission denied. Please allow location permissions to start audit.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMsg = 'GPS location info is unavailable.';
          break;
        case err.TIMEOUT:
          errorMsg = 'GPS location retrieval request timed out.';
          break;
        default:
          break;
      }
      setError(errorMsg);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    // Single fetch or watch position? Watch position gives live updates.
    const watchId = navigator.geolocation.watchPosition(success, handleError, options);

    return () => navigator.geolocation.clearWatch(watchId);
  }, [targetCoords, allowedRadius]);

  return { coordinates, error, distance, isInside };
};

export default useGeolocation;
