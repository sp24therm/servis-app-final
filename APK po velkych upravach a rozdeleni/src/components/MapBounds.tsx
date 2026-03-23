import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Boiler } from '../types';

interface MapBoundsProps {
  boilers: Boiler[];
}

export const MapBounds = ({ boilers }: MapBoundsProps) => {
  const map = useMap();
  
  useEffect(() => {
    const validBoilers = boilers.filter(b => b.lat && b.lng);
    if (validBoilers.length > 0) {
      const bounds = L.latLngBounds(validBoilers.map(b => [b.lat!, b.lng!]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [boilers, map]);

  return null;
};
