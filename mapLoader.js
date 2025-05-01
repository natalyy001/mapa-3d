// Función para cargar la capa GeoJSON en el mapa
function loadGeoJSONLayer(map, geojsonFile = 'map.geojson') {
    // Esperar a que el mapa termine de cargar
    map.on('load', () => {
        // Añadir una fuente de datos desde el archivo GeoJSON
        map.addSource('geojson-data', {
            type: 'geojson',
            data: geojsonFile,
            tolerance: 0 // Asegura máxima precisión en la proyección 3D
        });

        // Añadir capa de puntos adaptada para 3D
        map.addLayer({
            id: 'points-layer',
            type: 'circle',
            source: 'geojson-data',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 5,    // zoom 0, radio 5px
                    4, 8,    // zoom 4, radio 8px
                    8, 12    // zoom 8, radio 12px
                ],
                'circle-color': '#FF0000',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
                'circle-pitch-alignment': 'map',
                'circle-opacity': 0.9
            },
            filter: ['==', '$type', 'Point']
        });

        // Añadir capa para MultiPoint con ajustes 3D
        map.addLayer({
            id: 'multipoints-layer',
            type: 'circle',
            source: 'geojson-data',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 5,
                    4, 8,
                    8, 12
                ],
                'circle-color': '#FFA500',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
                'circle-pitch-alignment': 'map',
                'circle-opacity': 0.9
            },
            filter: ['==', '$type', 'MultiPoint']
        });

        // Añadir capa para LineString adaptada a 3D
        map.addLayer({
            id: 'linestring-layer',
            type: 'line',
            source: 'geojson-data',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#0000FF',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 2,
                    8, 4
                ],
                'line-opacity': 0.8
            },
            filter: ['==', '$type', 'LineString']
        });

        // Añadir capa para MultiLineString adaptada a 3D
        map.addLayer({
            id: 'multilinestring-layer',
            type: 'line',
            source: 'geojson-data',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#00FFFF',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 2,
                    8, 4
                ],
                'line-dasharray': [1, 1],
                'line-opacity': 0.8
            },
            filter: ['==', '$type', 'MultiLineString']
        });

        // Añadir capa para Polygon adaptada a 3D
        map.addLayer({
            id: 'polygon-layer',
            type: 'fill-extrusion', // Cambiado a fill-extrusion para mejor visualización 3D
            source: 'geojson-data',
            paint: {
                'fill-extrusion-color': '#00FF00',
                'fill-extrusion-opacity': 0.6,
                'fill-extrusion-height': 0,
                'fill-extrusion-base': 0
            },
            filter: ['==', '$type', 'Polygon']
        });

        // Añadir capa para MultiPolygon adaptada a 3D
        map.addLayer({
            id: 'multipolygon-layer',
            type: 'fill-extrusion',
            source: 'geojson-data',
            paint: {
                'fill-extrusion-color': '#FFFF00',
                'fill-extrusion-opacity': 0.6,
                'fill-extrusion-height': 0,
                'fill-extrusion-base': 0
            },
            filter: ['==', '$type', 'MultiPolygon']
        });

        // Para GeometryCollection procesamos cada geometría por separado
        processGeometryCollections(map, geojsonFile);

        // Configurar interactividad para cada tipo de geometría
        configureInteractivity(map);
        
        // Ajustar la vista inicial para ver mejor los datos
        fitMapToBounds(map, geojsonFile);
    });
}

// Función para procesar GeometryCollection
function processGeometryCollections(map, geojsonFile) {
    fetch(geojsonFile)
        .then(response => response.json())
        .then(data => {
            if (!data.features) return;
            
            // Encontrar features que son GeometryCollection
            const geometryCollections = data.features.filter(
                feature => feature.geometry && feature.geometry.type === 'GeometryCollection'
            );
            
            if (geometryCollections.length === 0) return;
            
            // Crear un nuevo GeoJSON para cada tipo de geometría en las colecciones
            const extractedFeatures = [];
            
            geometryCollections.forEach(collection => {
                if (!collection.geometry.geometries) return;
                
                collection.geometry.geometries.forEach((geom, index) => {
                    // Crear una nueva feature para cada geometría en la colección
                    extractedFeatures.push({
                        type: 'Feature',
                        properties: {
                            ...collection.properties,
                            // Añadir información que esta geometría es parte de una colección
                            collectionId: collection.id || `collection-${index}`,
                            geometryIndex: index,
                            description: collection.properties.description || 
                                        `Parte ${index + 1} de la colección de geometrías`
                        },
                        geometry: geom,
                        id: `${collection.id || 'geom'}-${index}`
                    });
                });
            });
            
            if (extractedFeatures.length === 0) return;
            
            // Añadir estas geometrías extraídas como una nueva fuente de datos
            map.addSource('geometry-collection-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: extractedFeatures
                }
            });
            
            // Añadir capas para cada tipo de geometría extraída
            // Puntos
            map.addLayer({
                id: 'gc-points-layer',
                type: 'circle',
                source: 'geometry-collection-source',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#8B008B', // Color distintivo (morado)
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#FFFFFF'
                },
                filter: ['==', '$type', 'Point']
            });
            
            // Líneas
            map.addLayer({
                id: 'gc-lines-layer',
                type: 'line',
                source: 'geometry-collection-source',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#8B008B', // Color distintivo (morado)
                    'line-width': 4
                },
                filter: ['==', '$type', 'LineString']
            });
            
            // Polígonos
            map.addLayer({
                id: 'gc-polygons-layer',
                type: 'fill',
                source: 'geometry-collection-source',
                paint: {
                    'fill-color': '#8B008B', // Color distintivo (morado)
                    'fill-opacity': 0.5,
                    'fill-outline-color': '#4B0082'
                },
                filter: ['==', '$type', 'Polygon']
            });
            
            // Añadir estas nuevas capas a la configuración de interactividad
            // Esto se hace en configureInteractivity ampliado
        })
        .catch(error => console.error('Error al procesar GeometryCollection:', error));
}

// Función para configurar la interactividad de todas las capas
function configureInteractivity(map) {
    // Lista de todas las capas - ahora incluye las capas de GeometryCollection
    const layers = [
        'points-layer', 
        'multipoints-layer', 
        'linestring-layer', 
        'multilinestring-layer',
        'polygon-layer', 
        'multipolygon-layer',
        'gc-points-layer',
        'gc-lines-layer',
        'gc-polygons-layer'
    ];

    // Configurar popup para cada capa
    layers.forEach(layer => {
        if (map.getLayer(layer)) {
            // Añadir interactividad al hacer clic
            map.on('click', layer, (e) => {
                if (!e.features || e.features.length === 0) return;
                
                const feature = e.features[0];
                const description = feature.properties.description || 'Sin descripción';
                
                // Determinar dónde posicionar el popup según el tipo de geometría
                let coordinates;
                
                switch (feature.geometry.type) {
                    case 'Point':
                        coordinates = feature.geometry.coordinates.slice();
                        break;
                    case 'MultiPoint':
                        // Usar el primer punto para el popup
                        coordinates = feature.geometry.coordinates[0].slice();
                        break;
                    case 'LineString':
                        // Usar el punto medio de la línea aproximadamente
                        const midIndex = Math.floor(feature.geometry.coordinates.length / 2);
                        coordinates = feature.geometry.coordinates[midIndex].slice();
                        break;
                    case 'MultiLineString':
                        // Usar el primer punto de la primera línea
                        coordinates = feature.geometry.coordinates[0][0].slice();
                        break;
                    case 'Polygon':
                        // Calcular el centroide aproximado para polígonos simples
                        const bounds = getBoundingBoxCenter(feature.geometry.coordinates[0]);
                        coordinates = bounds;
                        break;
                    case 'MultiPolygon':
                        // Usar el centroide del primer polígono
                        const firstPolyBounds = getBoundingBoxCenter(feature.geometry.coordinates[0][0]);
                        coordinates = firstPolyBounds;
                        break;
                    default:
                        // Fallback para otros tipos
                        coordinates = map.getCenter().toArray();
                }
                
                // Contenido adicional para geometrías que vienen de GeometryCollection
                let popupContent = `<h3>Geometría: ${feature.geometry.type}</h3><p>${description}</p>`;
                
                // Si la característica es parte de una GeometryCollection, añadir esta información
                if (feature.properties.collectionId) {
                    popupContent += `<p><em>Parte de la colección: ${feature.properties.collectionId}, 
                                    índice: ${feature.properties.geometryIndex}</em></p>`;
                }
                
                // Crear y mostrar el popup
                new maptilersdk.Popup()
                    .setLngLat(coordinates)
                    .setHTML(popupContent)
                    .addTo(map);
            });

            // Cambiar el cursor al pasar sobre una geometría
            map.on('mouseenter', layer, () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            
            // Restaurar el cursor al salir de una geometría
            map.on('mouseleave', layer, () => {
                map.getCanvas().style.cursor = '';
            });
        }
    });
}

// Función para calcular el centro aproximado de un polígono usando su bounding box
function getBoundingBoxCenter(coordinates) {
    if (!coordinates || coordinates.length === 0) return [0, 0];
    
    // Inicializar con los primeros valores
    let minX = coordinates[0][0];
    let minY = coordinates[0][1];
    let maxX = coordinates[0][0];
    let maxY = coordinates[0][1];
    
    // Encontrar los límites
    coordinates.forEach(coord => {
        minX = Math.min(minX, coord[0]);
        minY = Math.min(minY, coord[1]);
        maxX = Math.max(maxX, coord[0]);
        maxY = Math.max(maxY, coord[1]);
    });
    
    // Retornar el centro
    return [(minX + maxX) / 2, (minY + maxY) / 2];
}

// Función para ajustar el mapa a los límites de los datos
function fitMapToBounds(map, geojsonFile) {
    // Cargar los datos GeoJSON
    fetch(geojsonFile)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                // Si solo hay un punto, establecer un nivel de zoom apropiado
                if (data.features.length === 1 && data.features[0].geometry.type === 'Point') {
                    const coords = data.features[0].geometry.coordinates;
                    map.flyTo({
                        center: coords,
                        zoom: 4,
                        pitch: 45, // Añadir inclinación para mejor vista 3D
                        bearing: 0
                    });
                } else {
                    // Calcular bounds para todas las geometrías
                    let bounds = calculateBounds(data.features);
                    
                    if (bounds) {
                        map.fitBounds(bounds, {
                            padding: 100,
                            maxZoom: 10,
                            pitch: 45, // Añadir inclinación para mejor vista 3D
                            bearing: 0
                        });
                    }
                }
            }
        })
        .catch(error => console.error('Error al cargar el GeoJSON:', error));
}

// Función para calcular los límites de todas las geometrías
function calculateBounds(features) {
    if (!features || features.length === 0) return null;
    
    // Inicializar con valores extremos
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    features.forEach(feature => {
        if (!feature.geometry) return;
        
        if (feature.geometry.type === 'GeometryCollection') {
            // Para GeometryCollection, procesar cada geometría individualmente
            if (feature.geometry.geometries) {
                feature.geometry.geometries.forEach(geom => {
                    updateBounds(geom, {minX, minY, maxX, maxY});
                });
            }
        } else {
            // Para tipos normales
            updateBounds(feature.geometry, {minX, minY, maxX, maxY});
        }
    });
    
    // Verificar que se encontraron límites válidos
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
        return null;
    }
    
    // Retornar los límites en formato [[minX, minY], [maxX, maxY]]
    return [[minX, minY], [maxX, maxY]];
}

// Función auxiliar para actualizar los límites según el tipo de geometría
function updateBounds(geometry, bounds) {
    if (!geometry || !geometry.coordinates) return bounds;
    
    const coords = geometry.coordinates;
    
    switch (geometry.type) {
        case 'Point':
            bounds.minX = Math.min(bounds.minX, coords[0]);
            bounds.minY = Math.min(bounds.minY, coords[1]);
            bounds.maxX = Math.max(bounds.maxX, coords[0]);
            bounds.maxY = Math.max(bounds.maxY, coords[1]);
            break;
            
        case 'MultiPoint':
        case 'LineString':
            coords.forEach(coord => {
                bounds.minX = Math.min(bounds.minX, coord[0]);
                bounds.minY = Math.min(bounds.minY, coord[1]);
                bounds.maxX = Math.max(bounds.maxX, coord[0]);
                bounds.maxY = Math.max(bounds.maxY, coord[1]);
            });
            break;
            
        case 'MultiLineString':
        case 'Polygon':
            coords.forEach(line => {
                line.forEach(coord => {
                    bounds.minX = Math.min(bounds.minX, coord[0]);
                    bounds.minY = Math.min(bounds.minY, coord[1]);
                    bounds.maxX = Math.max(bounds.maxX, coord[0]);
                    bounds.maxY = Math.max(bounds.maxY, coord[1]);
                });
            });
            break;
            
        case 'MultiPolygon':
            coords.forEach(polygon => {
                polygon.forEach(ring => {
                    ring.forEach(coord => {
                        bounds.minX = Math.min(bounds.minX, coord[0]);
                        bounds.minY = Math.min(bounds.minY, coord[1]);
                        bounds.maxX = Math.max(bounds.maxX, coord[0]);
                        bounds.maxY = Math.max(bounds.maxY, coord[1]);
                    });
                });
            });
            break;
    }
    
    return bounds;
}