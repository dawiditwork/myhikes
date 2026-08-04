import React, { useRef, useEffect } from 'react';
import './Map.css';

const Map = props => {
  const mapRef = useRef();
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const { center, zoom } = props;

  useEffect(() => {
    if (!window.google || mapInstance.current) {
      return;
    }

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom
    });

    markerRef.current = new window.google.maps.Marker({
      position: center,
      map: mapInstance.current
    });
  }, [center, zoom]);

  return (
    <div
      ref={mapRef}
      className={`map ${props.className}`}
      style={props.style}
    />
  );
};

export default Map;
