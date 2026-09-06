import stopsData from '../../../data/stops.json';

export async function geocodeSearch(query) {
    if (!query || query.length < 3) return [];
    
    // Using Nominatim OSM free geocoding API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
    try {
        const res = await fetch(url, { 
            headers: { 
                'Accept-Language': 'en',
                'User-Agent': 'BusMitra/1.0 (HackathonDemo)'
            } 
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            source: 'nominatim'
        }));
    } catch (err) {
        console.error("Geocode error", err);
        return [];
    }
}

export function localStopSearch(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    
    // Filter stops that match the query
    const matched = stopsData.filter(stop => 
        stop.name.toLowerCase().includes(q) || 
        (stop.name_hi && stop.name_hi.includes(q))
    );
    
    // Deduplicate by name and return top 5
    const unique = [];
    const seen = new Set();
    for (const stop of matched) {
        if (!seen.has(stop.name)) {
            seen.add(stop.name);
            unique.push({
                name: stop.name + ' (Bus Stop)',
                lat: stop.lat,
                lng: stop.lng,
                source: 'local'
            });
            if (unique.length >= 5) break;
        }
    }
    
    return unique;
}
