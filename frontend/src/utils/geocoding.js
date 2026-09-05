export async function geocodeSearch(query) {
    if (!query || query.length < 3) return [];
    
    // Using Nominatim OSM free geocoding API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
    try {
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
        }));
    } catch (err) {
        console.error("Geocode error", err);
        return [];
    }
}
