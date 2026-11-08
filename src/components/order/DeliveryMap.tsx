'use client';
import { useEffect, useRef } from 'react';
import type { DeliveryPoint } from '@/domain/delivery';
import 'leaflet/dist/leaflet.css';

export function DeliveryMap({
  point,
  onChange,
  onFailure,
}: {
  point: DeliveryPoint;
  onChange: (p: DeliveryPoint) => void;
  onFailure: () => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onChange, onFailure });
  useEffect(() => {
    callbacks.current = { onChange, onFailure };
  }, [onChange, onFailure]);
  const initial = useRef(point);
  const active = useRef<{
    map: import('leaflet').Map;
    marker: import('leaflet').Marker;
  } | null>(null);
  useEffect(() => {
    initial.current = point;
    if (active.current) {
      active.current.marker.setLatLng([point.lat, point.lng]);
      active.current.map.panTo([point.lat, point.lng], { animate: false });
    }
  }, [point]);
  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | undefined;
    let nextTileAt = Date.now() + 300;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    void import('leaflet')
      .then((L) => {
        if (disposed || !element.current) return;
        map = L.map(element.current).setView(
          [initial.current.lat, initial.current.lng],
          16,
        );
        class PacedTiles extends L.TileLayer {
          createTile(
            coords: import('leaflet').Coords,
            done: import('leaflet').DoneCallback,
          ) {
            const tile = document.createElement('img');
            tile.alt = '';
            tile.setAttribute('role', 'presentation');
            tile.onload = () => done(undefined, tile);
            tile.onerror = () =>
              done(new Error('Cartografía no disponible'), tile);
            // A viewport needs several tiles. Pace them instead of exhausting the
            // shared provider limit in its first frame. Cancel on unmount.
            const delay = Math.max(0, nextTileAt - Date.now());
            nextTileAt = Date.now() + delay + 300;
            const timer = setTimeout(() => {
              timers.delete(timer);
              if (!disposed) tile.src = this.getTileUrl(coords);
            }, delay);
            timers.add(timer);
            return tile;
          }
        }
        new PacedTiles('/api/delivery/tiles/{z}/{x}/{y}', {
          maxZoom: 19,
          keepBuffer: 0,
          updateWhenIdle: true,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Powered by <a href="https://www.geoapify.com/">Geoapify</a>',
        })
          .on('tileerror', () => callbacks.current.onFailure())
          .addTo(map);
        const marker = L.marker([initial.current.lat, initial.current.lng], {
          draggable: true,
          keyboard: true,
          title: 'Ubicación de entrega',
          icon: L.divIcon({
            className: 'delivery-map-marker',
            html: '●',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map);
        marker.getElement()?.setAttribute('aria-label', 'Ubicación de entrega');
        active.current = { map, marker };
        const update = (p: import('leaflet').LatLng) =>
          callbacks.current.onChange({ lat: p.lat, lng: p.lng });
        marker.on('dragend', () => update(marker.getLatLng()));
        map.on('click', (event: import('leaflet').LeafletMouseEvent) => {
          marker.setLatLng(event.latlng);
          update(event.latlng);
        });
      })
      .catch(() => callbacks.current.onFailure());
    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      active.current = null;
      map?.remove();
    };
  }, []);
  return (
    <div
      ref={element}
      className="delivery-map"
      role="region"
      aria-label="Mapa para confirmar ubicación de entrega"
    />
  );
}
