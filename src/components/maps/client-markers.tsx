"use client";
import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { createClient } from "@/lib/supabase/client";
import { useCurrentPark } from "@/hooks/use-current-park";

type ClientPoint = {
  id: string;
  name: string;
  city: string | null;
  lat: number;
  lng: number;
  pedidos_pendentes?: number;
};

export default function ClientMarkers() {
  const { currentParkId } = useCurrentPark();
  const [clients, setClients] = useState<ClientPoint[]>([]);

  useEffect(() => {
    if (!currentParkId) return;
    const supabase = createClient();
    supabase
      .from("clients")
      .select("id, name, city, lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .then(({ data }) => {
        if (data) setClients(data as ClientPoint[]);
      });
  }, [currentParkId]);

  return (
    <>
      {clients.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]}>
          <Popup>
            <strong>{c.name}</strong>
            {c.city && <><br />{c.city}</>}
          </Popup>
        </Marker>
      ))}
    </>
  );
}
