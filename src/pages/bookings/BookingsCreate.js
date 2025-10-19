import axios from 'axios';
import { divIcon } from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { listActives } from '../../services/activeService';
import { createBooking } from '../../services/bookingService';
import { getCompanyProfile } from '../../services/companyService';
import { getFare, listFlatRates } from '../../services/fareService';
import { getMapboxTileLayer } from '../../utils/mapbox';

/**
 * Form to create a new booking. Captures basic booking information
 * required by the backend. After successful creation it navigates back to
 * the bookings list.
 */
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';
const DEFAULT_NEARBY_RADIUS_MILES = 10;
// initial meters constant kept for backwards compatibility but component will compute runtime value
const DEFAULT_NEARBY_RADIUS_METERS = DEFAULT_NEARBY_RADIUS_MILES * 1609.34;
const EARTH_RADIUS_MILES = 3958.8;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceMilesBetween = (origin, target) => {
  if (!origin || !target) return null;
  const { lat: lat1, lng: lon1 } = origin;
  const { lat: lat2, lng: lon2 } = target;

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_MILES * c;

  return Number.isFinite(distance) ? distance : null;
};

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'just now';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const BookingsCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    phoneNumber: '',
    pickupAddress: '',
    pickupTime: '',
    dropoffAddress: '',
    passengers: 1,
    notes: '',
    dispatchMethod: 'auto',
    wheelchairNeeded: false,
    noShowFeeApplied: false,
    pickupLat: '',
    pickupLon: '',
    dropoffLat: '',
    dropoffLon: '',
    fareStrategy: 'meter',
    flatRateId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fareConfig, setFareConfig] = useState(null);
  const [fareLoadError, setFareLoadError] = useState('');
  const [flatRates, setFlatRates] = useState([]);
  const [loadingFlatRates, setLoadingFlatRates] = useState(false);
  const [flatRateLoadError, setFlatRateLoadError] = useState('');

  // Default map position (Kissimmee, FL)
  const defaultCenter = useMemo(() => ({ lat: 28.2919557, lng: -81.4075713 }), []);
  const [pickupPosition, setPickupPosition] = useState(null);
  const [dropoffPosition, setDropoffPosition] = useState(null);
  const [mapFocus, setMapFocus] = useState('pickup');
  const [distanceMiles, setDistanceMiles] = useState(null);
  const [distanceSource, setDistanceSource] = useState(null);
  const [distanceError, setDistanceError] = useState('');
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyRadiusMiles, setNearbyRadiusMiles] = useState(DEFAULT_NEARBY_RADIUS_MILES);
  const mapboxTiles = useMemo(() => getMapboxTileLayer(), []);
  const nearbyRadiusMeters = useMemo(() => Number(nearbyRadiusMiles) * 1609.34, [nearbyRadiusMiles]);
  const tileLayerUrl = mapboxTiles?.url || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileLayerAttribution =
    mapboxTiles?.attribution || '&copy; OpenStreetMap contributors';
  const ROAD_DISTANCE_BUFFER = 1.18; // heuristic uplift when falling back to straight-line distance
  const driverMarkerIcon = useMemo(
    () =>
      divIcon({
        className: 'booking-driver-marker',
        html: '<span class="booking-driver-marker__dot"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10],
      }),
    [],
  );

  const selectedFlatRate = useMemo(() => {
    if (!form.flatRateId) return null;
    return flatRates.find((rate) => rate._id === form.flatRateId) || null;
  }, [flatRates, form.flatRateId]);

  const hasFlatRates = flatRates.length > 0;

  useEffect(() => {
    let ignore = false;
    const fetchCompany = async () => {
      try {
        const res = await getCompanyProfile();
        const company = res?.data?.company || res?.data || null;
        const configured = company?.dispatchSettings?.maxDistanceMiles;
        if (!ignore && Number.isFinite(Number(configured)) && Number(configured) > 0) {
          setNearbyRadiusMiles(Number(configured));
        }
      } catch (err) {
        // ignore - keep defaults
      }
    };

    fetchCompany();

    if (form.fareStrategy === 'flat' && !loadingFlatRates && !hasFlatRates) {
      setForm((prev) => ({ ...prev, fareStrategy: 'meter', flatRateId: '' }));
    }
  }, [form.fareStrategy, hasFlatRates, loadingFlatRates]);

  useEffect(() => {
    if (form.fareStrategy === 'flat' && form.flatRateId && !selectedFlatRate) {
      setForm((prev) => ({ ...prev, flatRateId: '' }));
    }
  }, [form.fareStrategy, form.flatRateId, selectedFlatRate]);

  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [returnContext, setReturnContext] = useState(null);
  const nearbyRequestRef = useRef(0);

  const activeMarkerPosition =
    mapFocus === 'pickup'
      ? pickupPosition || dropoffPosition || defaultCenter
      : dropoffPosition || pickupPosition || defaultCenter;

  const resolvedCenter = useMemo(() => {
    if (pickupPosition) return pickupPosition;
    if (dropoffPosition) return dropoffPosition;
    return defaultCenter;
  }, [defaultCenter, dropoffPosition, pickupPosition]);

  const formatLatLng = useCallback(
    (value) => (Number.isFinite(value) ? Number(value).toFixed(6) : ''),
    [],
  );

  const normalizePair = useCallback((lat, lng) => {
    const toNumber = (input) => {
      if (input === null || input === undefined) return Number.NaN;
      if (typeof input === 'number') return input;
      const trimmed = String(input).trim();
      if (trimmed === '') return Number.NaN;
      return Number(trimmed);
    };

    const latNum = toNumber(lat);
    const lngNum = toNumber(lng);

    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      return { lat: latNum, lng: lngNum };
    }

    return { lat: undefined, lng: undefined };
  }, []);

  const assignCoordinates = useCallback(
    (kind, latLng) => {
      if (kind === 'pickup') {
        setPickupPosition(latLng);
        setForm((prev) => ({
          ...prev,
          pickupLat: formatLatLng(latLng.lat),
          pickupLon: formatLatLng(latLng.lng),
        }));
      } else {
        setDropoffPosition(latLng);
        setForm((prev) => ({
          ...prev,
          dropoffLat: formatLatLng(latLng.lat),
          dropoffLon: formatLatLng(latLng.lng),
        }));
      }
    },
    [formatLatLng],
  );

  // Marker component to set pickup location on map click
  function LocationMarker() {
    useMapEvents({
      click(e) {
        assignCoordinates(mapFocus, e.latlng);
      },
    });
    return (
      <>
        {pickupPosition && (
          <Marker position={[pickupPosition.lat, pickupPosition.lng]}>
            <Popup>Pickup here</Popup>
          </Marker>
        )}
        {dropoffPosition && (
          <Marker position={[dropoffPosition.lat, dropoffPosition.lng]}>
            <Popup>Drop-off here</Popup>
          </Marker>
        )}
      </>
    );
  }

  function MapAutoCenter() {
    const map = useMap();
    useEffect(() => {
      const active =
        mapFocus === 'pickup'
          ? pickupPosition || dropoffPosition || defaultCenter
          : dropoffPosition || pickupPosition || defaultCenter;
      if (!active) return;
      map.setView(active, map.getZoom());
    }, [pickupPosition, dropoffPosition, mapFocus, defaultCenter, map]);
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fareStrategy') {
      setForm((prev) => ({
        ...prev,
        fareStrategy: value,
        flatRateId: value === 'flat' ? prev.flatRateId : '',
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoordinateChange = (kind, axis, value) => {
    const key = `${kind}${axis === 'lat' ? 'Lat' : 'Lon'}`;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFlatRateChange = (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, flatRateId: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const resolveCoordinates = useCallback(
    async (label, lat, lng, address) => {
      const manual = normalizePair(lat, lng);
      if (Number.isFinite(manual.lat) && Number.isFinite(manual.lng)) {
        return manual;
      }

      if (!address) {
        return { lat: undefined, lng: undefined };
      }

      if (!MAPBOX_TOKEN) {
        console.warn('Mapbox token missing; falling back to raw address without geocoding.');
        return { lat: undefined, lng: undefined };
      }

      const biasPoint =
        label === 'pickup'
          ? dropoffPosition || pickupPosition || defaultCenter
          : pickupPosition || dropoffPosition || defaultCenter;

      const params = {
        access_token: MAPBOX_TOKEN,
        limit: 1,
        autocomplete: false,
        country: 'US',
      };

      if (biasPoint) {
        params.proximity = `${biasPoint.lng},${biasPoint.lat}`;
      }

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
        const geoRes = await axios.get(url, { params });
        const feature = geoRes.data?.features?.[0];
        if (feature && Array.isArray(feature.center) && feature.center.length >= 2) {
          const parsed = normalizePair(parseFloat(feature.center[1]), parseFloat(feature.center[0]));
          if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
            if (label === 'pickup') {
              setPickupPosition(parsed);
              setForm((prev) => ({
                ...prev,
                pickupLat: formatLatLng(parsed.lat),
                pickupLon: formatLatLng(parsed.lng),
              }));
            } else {
              setDropoffPosition(parsed);
              setForm((prev) => ({
                ...prev,
                dropoffLat: formatLatLng(parsed.lat),
                dropoffLon: formatLatLng(parsed.lng),
              }));
            }
            return parsed;
          }
        }
      } catch (geoErr) {
        console.warn(`Geocoding ${label} failed:`, geoErr.message);
      }

      return { lat: undefined, lng: undefined };
    },
    [
      defaultCenter,
      dropoffPosition,
      formatLatLng,
      normalizePair,
      pickupPosition,
    ],
  );

  const handleLocate = useCallback(
    async (kind) => {
      const latKey = kind === 'pickup' ? 'pickupLat' : 'dropoffLat';
      const lngKey = kind === 'pickup' ? 'pickupLon' : 'dropoffLon';
      const addressKey = kind === 'pickup' ? 'pickupAddress' : 'dropoffAddress';

      await resolveCoordinates(kind, form[latKey], form[lngKey], form[addressKey]);
    },
    [form, resolveCoordinates],
  );

  useEffect(() => {
    let ignore = false;

    const fetchFare = async () => {
      try {
        const res = await getFare();
        const payload =
          res?.data?.fare || res?.data?.currentFare || res?.data?.data || res?.data || null;
        if (!ignore) {
          setFareConfig(payload && !Array.isArray(payload) ? payload : null);
          setFareLoadError('');
        }
      } catch (fareErr) {
        if (!ignore) {
          setFareConfig(null);
          setFareLoadError(
            fareErr?.response?.data?.message || 'Unable to load current fare settings.',
          );
        }
      }
    };

    fetchFare();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchFlatRates = async () => {
      setLoadingFlatRates(true);
      try {
        const res = await listFlatRates();
        const payload = res?.data?.flatRates ?? res?.data?.data ?? res?.data ?? [];
        if (!ignore) {
          const normalized = Array.isArray(payload)
            ? payload
                .filter((rate) => rate && rate.active !== false)
                .map((rate) => ({
                  _id: rate._id,
                  name: rate.name,
                  amount: Number(rate.amount),
                  distanceLabel: rate.distanceLabel,
                }))
                .filter((rate) => rate._id && rate.name && Number.isFinite(rate.amount))
            : [];
          setFlatRates(normalized);
          setFlatRateLoadError('');
        }
      } catch (err) {
        if (!ignore) {
          setFlatRates([]);
          setFlatRateLoadError(err?.response?.data?.message || 'Unable to load flat rates.');
        }
      } finally {
        if (!ignore) {
          setLoadingFlatRates(false);
        }
      }
    };

    fetchFlatRates();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const { lat, lng } = normalizePair(form.pickupLat, form.pickupLon);
    setPickupPosition((prev) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (prev && prev.lat === lat && prev.lng === lng) {
          return prev;
        }
        return { lat, lng };
      }
      return null;
    });
  }, [form.pickupLat, form.pickupLon, normalizePair]);

  useEffect(() => {
    const { lat, lng } = normalizePair(form.dropoffLat, form.dropoffLon);
    setDropoffPosition((prev) => {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (prev && prev.lat === lat && prev.lng === lng) {
          return prev;
        }
        return { lat, lng };
      }
      return null;
    });
  }, [form.dropoffLat, form.dropoffLon, normalizePair]);

  const normalizeCoordinate = useCallback((value) => {
    if (!Number.isFinite(value)) return undefined;
    return Math.round(value * 1e6) / 1e6;
  }, []);

  const buildGeoPoint = useCallback(
    (lat, lng) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const normalizedLat = normalizeCoordinate(lat);
      const normalizedLng = normalizeCoordinate(lng);

      if (normalizedLat === undefined || normalizedLng === undefined) {
        return null;
      }

      return {
        type: 'Point',
        coordinates: [normalizedLng, normalizedLat],
      };
    },
    [normalizeCoordinate],
  );

  const normalizeActiveRecord = useCallback((record) => {
    if (!record || typeof record !== 'object') return null;
    const driver = record.driver || record.driverInfo || {};
    const vehicle = record.vehicle || record.vehicleInfo || {};
    const location = record.currentLocation || driver.currentLocation || vehicle.currentLocation;

    if (
      !location ||
      location.type !== 'Point' ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return null;
    }

    const [lngRaw, latRaw] = location.coordinates;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;

    const driverName =
      [record.firstName || driver.firstName, record.lastName || driver.lastName]
        .filter(Boolean)
        .join(' ') ||
      driver.fullName ||
      driver.name ||
      record.driverId ||
      driver.driverId ||
      'Driver';

    return {
      id: record._id || `${record.driverId || driver.driverId || 'driver'}-${record.cabNumber || vehicle.cabNumber || 'cab'}`,
      driverName,
      driverId: record.driverId || driver.driverId || driver._id || '',
      cabNumber: record.cabNumber || vehicle.cabNumber || vehicle._id || '',
      status: record.status || record.currentStatus || 'Active',
      availability: record.availability || record.currentAvailability || 'Online',
      updatedAt:
        location.updatedAt ||
        record.updatedAt ||
        record.createdAt ||
        driver.updatedAt ||
        vehicle.updatedAt ||
        null,
      coordinates: { lat, lng },
    };
  }, []);

  useEffect(() => {
    if (
      !pickupPosition ||
      !Number.isFinite(pickupPosition.lat) ||
      !Number.isFinite(pickupPosition.lng)
    ) {
      nearbyRequestRef.current += 1;
      setNearbyDrivers([]);
      setNearbyError('');
      setNearbyLoading(false);
      return;
    }

    let ignore = false;
    const requestId = nearbyRequestRef.current + 1;
    nearbyRequestRef.current = requestId;

    const loadNearbyDrivers = async () => {
      setNearbyLoading(true);
      setNearbyError('');

      try {
        const response = await listActives({
          status: 'Active',
          availability: 'Online',
          lat: pickupPosition.lat,
          lng: pickupPosition.lng,
          radius: nearbyRadiusMeters,
        });

        const payload =
          response.data?.data ||
          response.data?.actives ||
          response.data?.results ||
          response.data ||
          [];

        const roster = (Array.isArray(payload) ? payload : [])
          .map((item) => normalizeActiveRecord(item))
          .filter(Boolean)
          .map((driver) => ({
            ...driver,
            distanceMiles: distanceMilesBetween(pickupPosition, driver.coordinates),
          }))
          .sort((a, b) => {
            const aDistance = Number.isFinite(a.distanceMiles)
              ? a.distanceMiles
              : Number.POSITIVE_INFINITY;
            const bDistance = Number.isFinite(b.distanceMiles)
              ? b.distanceMiles
              : Number.POSITIVE_INFINITY;
            return aDistance - bDistance;
          })
          .slice(0, 12);

        if (!ignore && nearbyRequestRef.current === requestId) {
          setNearbyDrivers(roster);
        }
      } catch (nearbyErr) {
        if (!ignore && nearbyRequestRef.current === requestId) {
          setNearbyDrivers([]);
          setNearbyError(
            nearbyErr?.response?.data?.message ||
              'Unable to load nearby drivers right now.',
          );
        }
      } finally {
        if (!ignore && nearbyRequestRef.current === requestId) {
          setNearbyLoading(false);
        }
      }
    };

    loadNearbyDrivers();

    return () => {
      ignore = true;
    };
  }, [pickupPosition, normalizeActiveRecord]);

  const passengerCount = useMemo(() => {
    const parsed = Number(form.passengers);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }
    return parsed;
  }, [form.passengers]);

  const straightLineDistance = useMemo(() => {
    if (!pickupPosition || !dropoffPosition) return null;
    return distanceMilesBetween(pickupPosition, dropoffPosition);
  }, [dropoffPosition, pickupPosition]);

  const roundedDistance = useMemo(() => {
    if (!Number.isFinite(distanceMiles)) return null;
    return Math.round(distanceMiles * 100) / 100;
  }, [distanceMiles]);

  const estimatedFare = useMemo(() => {
    if (form.fareStrategy === 'flat') {
      return selectedFlatRate ? Number(selectedFlatRate.amount) : null;
    }

    if (!fareConfig || !Number.isFinite(distanceMiles)) {
      return null;
    }

    const perMileRate = Number(fareConfig.farePerMile);
    const extraPassengerRate = Number(fareConfig.extraPass);

    if (!Number.isFinite(perMileRate)) {
      return null;
    }

    const baseFare = perMileRate * distanceMiles;
    const extraPassengers = Math.max(Math.floor(passengerCount) - 1, 0);
    const extraFare = Number.isFinite(extraPassengerRate)
      ? extraPassengerRate * extraPassengers
      : 0;

    const total = baseFare + extraFare;

    return Number.isFinite(total) ? total : null;
  }, [distanceMiles, fareConfig, form.fareStrategy, passengerCount, selectedFlatRate]);

  const roundedFare = useMemo(() => {
    if (!Number.isFinite(estimatedFare)) return null;
    return Math.round(estimatedFare * 100) / 100;
  }, [estimatedFare]);

  const distanceSourceLabel = useMemo(() => {
    if (form.fareStrategy === 'flat') {
      return '';
    }
    if (!Number.isFinite(distanceMiles)) return '';
    if (distanceSource === 'mapbox-driving' || distanceSource === 'driving') {
      return 'Driving distance (Mapbox)';
    }
    if (distanceSource === 'straight-line') {
      return 'Straight-line distance (adjusted)';
    }
    return '';
  }, [distanceMiles, distanceSource, form.fareStrategy]);

const fareEstimateNote = useMemo(() => {
  if (form.fareStrategy === 'flat') {
    if (loadingFlatRates) {
      return 'Loading flat rates...';
    }
    if (flatRateLoadError) {
      return flatRateLoadError;
    }
    if (!hasFlatRates) {
      return 'Add a flat rate in Fares to enable this option.';
    }
    if (!selectedFlatRate) {
      return 'Choose a flat rate to dispatch with this booking.';
    }
    const amount = Number(selectedFlatRate.amount).toFixed(2);
    return `Flat rate "${selectedFlatRate.name}" will be dispatched at $${amount}.`;
  }

  if (!fareConfig) {
    return fareLoadError || 'Set your fare structure to enable automatic pricing.';
  }

    const perMileRate = Number(fareConfig.farePerMile);
    const perMileText = Number.isFinite(perMileRate)
      ? perMileRate.toFixed(2)
      : Number(fareConfig.farePerMile || 0).toFixed(2);

    const extraPassengerRate = Number(fareConfig.extraPass);
    const extraText = Number.isFinite(extraPassengerRate)
      ? ` + $${extraPassengerRate.toFixed(2)} each extra passenger`
      : '';

    return `Using $${perMileText} per mile${extraText}.`;
  }, [
    fareConfig,
    fareLoadError,
    flatRateLoadError,
    form.fareStrategy,
    hasFlatRates,
    loadingFlatRates,
    selectedFlatRate,
  ]);

  useEffect(() => {
    if (!pickupPosition || !dropoffPosition) {
      setDistanceMiles(null);
      setDistanceSource(null);
      setDistanceError('');
      return;
    }

    const fallbackDistance = Number.isFinite(straightLineDistance)
      ? straightLineDistance * ROAD_DISTANCE_BUFFER
      : null;

    if (Number.isFinite(fallbackDistance)) {
      setDistanceMiles(fallbackDistance);
      setDistanceSource('straight-line');
    } else {
      setDistanceMiles(null);
      setDistanceSource(null);
    }

    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token missing; skipping driving distance lookup.');
      return;
    }

    const controller = new AbortController();

    const fetchDrivingDistance = async () => {
      const pickup = `${pickupPosition.lng},${pickupPosition.lat}`;
      const dropoff = `${dropoffPosition.lng},${dropoffPosition.lat}`;

      try {
        const url = new URL(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup};${dropoff}`,
        );
        url.searchParams.set('overview', 'false');
        url.searchParams.set('access_token', MAPBOX_TOKEN);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Mapbox directions responded with ${response.status}`);
        }

        const data = await response.json();
        const meters = data?.routes?.[0]?.distance;
        const miles = Number(meters) / 1609.344;

        if (!Number.isFinite(miles) || miles <= 0) {
          throw new Error('Routing distance missing');
        }

        setDistanceMiles(miles);
        setDistanceSource('mapbox-driving');
        setDistanceError('');
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        console.warn('Driving distance lookup failed:', err.message);
        if (Number.isFinite(fallbackDistance)) {
          setDistanceMiles(fallbackDistance);
          setDistanceSource('straight-line');
        } else {
          setDistanceMiles(null);
          setDistanceSource(null);
        }
        setDistanceError('Using adjusted straight-line distance while routing is unavailable.');
      }
    };

    fetchDrivingDistance();

    return () => {
      controller.abort();
    };
  }, [dropoffPosition, pickupPosition, straightLineDistance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const [{ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng }] = await Promise.all([
        resolveCoordinates('pickup', form.pickupLat, form.pickupLon, form.pickupAddress),
        resolveCoordinates('dropoff', form.dropoffLat, form.dropoffLon, form.dropoffAddress),
      ]);

      const pickupPoint = buildGeoPoint(pLat, pLng);
      if (!pickupPoint) {
        setError('Pickup coordinates are required. Click the map or refine the pickup address.');
        setLoading(false);
        return;
      }

      const dropoffPoint = buildGeoPoint(dLat, dLng);
      if (!dropoffPoint) {
        setError('Drop-off coordinates are required. Click the map or refine the drop-off address.');
        setLoading(false);
        return;
      }

      const pickupLat = normalizeCoordinate(pLat);
      const pickupLon = normalizeCoordinate(pLng);
      const dropoffLat = normalizeCoordinate(dLat);
      const dropoffLon = normalizeCoordinate(dLng);

      const payload = {
        customerName: form.customerName,
        phoneNumber: form.phoneNumber,
        pickupAddress: form.pickupAddress,
        pickupTime: form.pickupTime ? new Date(form.pickupTime).toISOString() : undefined,
        dropoffAddress: form.dropoffAddress,
        passengers: Number(form.passengers) || 1,
        notes: form.notes,
        dispatchMethod: form.dispatchMethod,
        wheelchairNeeded: Boolean(form.wheelchairNeeded),
        noShowFeeApplied: Boolean(form.noShowFeeApplied),
      };
      payload.pickupPoint = pickupPoint;
      payload.dropoffPoint = dropoffPoint;
      if (pickupLat !== undefined && pickupLon !== undefined) {
        payload.pickupLat = pickupLat;
        payload.pickupLon = pickupLon;
      }
      if (dropoffLat !== undefined && dropoffLon !== undefined) {
        payload.dropoffLat = dropoffLat;
        payload.dropoffLon = dropoffLon;
      }

      if (roundedDistance !== null && form.fareStrategy !== 'flat') {
        payload.estimatedDistanceMiles = roundedDistance;
        if (distanceSource) {
          payload.estimatedDistanceSource = distanceSource;
        }
      }

      if (form.fareStrategy === 'flat') {
        if (!selectedFlatRate) {
          setError('Select a flat rate before creating this booking.');
          setLoading(false);
          return;
        }
        payload.fareStrategy = 'flat';
        payload.flatRateRef = selectedFlatRate._id;
        payload.flatRateName = selectedFlatRate.name;
        payload.flatRateAmount = Number(selectedFlatRate.amount);
        payload.estimatedFare = Number(selectedFlatRate.amount);
      } else {
        payload.fareStrategy = 'meter';
        if (roundedFare !== null) {
          payload.estimatedFare = roundedFare;
        }
      }

      await createBooking(payload);

      const canOfferReturn = Boolean((form.dropoffAddress || '').trim());
      if (canOfferReturn) {
        setReturnContext({
          formSnapshot: { ...form },
          pickupPositionSnapshot: pickupPosition ? { ...pickupPosition } : null,
          dropoffPositionSnapshot: dropoffPosition ? { ...dropoffPosition } : null,
        });
        setShowReturnPrompt(true);
        return;
      }

      navigate('/bookings');
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to create booking';
    setError(msg);
  } finally {
    setLoading(false);
  }
};

  const closeReturnPrompt = () => {
    setShowReturnPrompt(false);
    setReturnContext(null);
    navigate('/bookings');
  };

  const scheduleReturnTrip = () => {
    if (!returnContext) {
      closeReturnPrompt();
      return;
    }

    const { formSnapshot, pickupPositionSnapshot, dropoffPositionSnapshot } = returnContext;

    const swappedForm = {
      ...formSnapshot,
      pickupAddress: formSnapshot.dropoffAddress || '',
      dropoffAddress: formSnapshot.pickupAddress || '',
      pickupLat: formSnapshot.dropoffLat || '',
      pickupLon: formSnapshot.dropoffLon || '',
      dropoffLat: formSnapshot.pickupLat || '',
      dropoffLon: formSnapshot.pickupLon || '',
      pickupTime: '',
      notes: '',
      fareStrategy: 'meter',
      flatRateId: '',
    };

    const { lat: swappedPickupLat, lng: swappedPickupLng } = normalizePair(
      formSnapshot.dropoffLat,
      formSnapshot.dropoffLon,
    );
    const { lat: swappedDropLat, lng: swappedDropLng } = normalizePair(
      formSnapshot.pickupLat,
      formSnapshot.pickupLon,
    );

    const nextPickupPosition =
      Number.isFinite(swappedPickupLat) && Number.isFinite(swappedPickupLng)
        ? { lat: swappedPickupLat, lng: swappedPickupLng }
        : dropoffPositionSnapshot
        ? { ...dropoffPositionSnapshot }
        : null;

    const nextDropoffPosition =
      Number.isFinite(swappedDropLat) && Number.isFinite(swappedDropLng)
        ? { lat: swappedDropLat, lng: swappedDropLng }
        : pickupPositionSnapshot
        ? { ...pickupPositionSnapshot }
        : null;

    setForm(swappedForm);
    setPickupPosition(nextPickupPosition);
    setDropoffPosition(nextDropoffPosition);
    setMapFocus('pickup');
    setDistanceMiles(null);
    setDistanceSource(null);
    setDistanceError('');
    setShowReturnPrompt(false);
    setReturnContext(null);
  };

  const actions = (
    <Link to="/bookings" className="btn btn-ghost">
      Back to bookings
    </Link>
  );

  return (
    <>
      <AppLayout
      title="Create booking"
      subtitle="Capture trip details, assign a driver and get the ride scheduled in seconds."
      actions={actions}
    >
      <div className="grid-two">
        <div className="panel">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div>
                <h3>Rider details</h3>
                <p>Let us know who is travelling and how to reach them.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="customerName">Customer name</label>
                  <input
                    id="customerName"
                    type="text"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phoneNumber">Phone number</label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="passengers">Passengers</label>
                  <input
                    id="passengers"
                    type="number"
                    min="1"
                    name="passengers"
                    value={form.passengers}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div>
                <h3>Trip plan</h3>
                <p>Set the pickup, drop-off and scheduling info.</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="pickupAddress">Pickup address</label>
                  <input
                    id="pickupAddress"
                    type="text"
                    name="pickupAddress"
                    value={form.pickupAddress}
                    onChange={handleChange}
                    onBlur={() => handleLocate('pickup')}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    onClick={() => handleLocate('pickup')}
                  >
                    Locate pickup on map
                  </button>
                  <div className="form-grid mini">
                    <div>
                      <label htmlFor="pickupLat">Pickup latitude</label>
                      <input
                        id="pickupLat"
                        type="number"
                        name="pickupLat"
                        step="0.00001"
                        value={form.pickupLat}
                        onChange={(event) => handleCoordinateChange('pickup', 'lat', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                    <div>
                      <label htmlFor="pickupLon">Pickup longitude</label>
                      <input
                        id="pickupLon"
                        type="number"
                        name="pickupLon"
                        step="0.00001"
                        value={form.pickupLon}
                        onChange={(event) => handleCoordinateChange('pickup', 'lon', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="pickupTime">Pickup time</label>
                  <input
                    id="pickupTime"
                    type="datetime-local"
                    name="pickupTime"
                    value={form.pickupTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dropoffAddress">Drop-off address</label>
                  <input
                    id="dropoffAddress"
                    type="text"
                    name="dropoffAddress"
                    value={form.dropoffAddress}
                    onChange={handleChange}
                    onBlur={() => handleLocate('dropoff')}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    onClick={() => handleLocate('dropoff')}
                  >
                    Locate drop-off on map
                  </button>
                  <div className="form-grid mini">
                    <div>
                      <label htmlFor="dropoffLat">Drop-off latitude</label>
                      <input
                        id="dropoffLat"
                        type="number"
                        name="dropoffLat"
                        step="0.00001"
                        value={form.dropoffLat}
                        onChange={(event) => handleCoordinateChange('dropoff', 'lat', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                    <div>
                      <label htmlFor="dropoffLon">Drop-off longitude</label>
                      <input
                        id="dropoffLon"
                        type="number"
                        name="dropoffLon"
                        step="0.00001"
                        value={form.dropoffLon}
                        onChange={(event) => handleCoordinateChange('dropoff', 'lon', event.target.value)}
                        placeholder="Click map or enter"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="dispatchMethod">Dispatch method</label>
                  <select
                    id="dispatchMethod"
                    name="dispatchMethod"
                    value={form.dispatchMethod}
                    onChange={handleChange}
                  >
                    <option value="auto">Auto assign</option>
                    <option value="manual">Manual</option>
                  </select>
                  <small className="field-help">
                    Auto matches available drivers automatically. Switch to manual if you need to force a specific cab.
                  </small>
                </div>
                <div>
                  <label htmlFor="fareStrategy">Fare type</label>
                  <select
                    id="fareStrategy"
                    name="fareStrategy"
                    value={form.fareStrategy}
                    onChange={handleChange}
                  >
                    <option value="meter">Meter fare (default)</option>
                    <option value="flat" disabled={!hasFlatRates}>
                      Flat rate
                    </option>
                  </select>
                  <small className="field-help">
                    {loadingFlatRates
                      ? 'Loading flat rates...'
                      : flatRateLoadError
                      ? flatRateLoadError
                      : hasFlatRates
                      ? 'Flat rates override the meter so drivers collect the exact price you choose.'
                      : 'Add flat rates under Fares to enable this option.'}
                  </small>
                </div>
                {form.fareStrategy === 'flat' && (
                  <div>
                    <label htmlFor="flatRateId">Flat rate to dispatch</label>
                    <select
                      id="flatRateId"
                      name="flatRateId"
                      value={form.flatRateId}
                      onChange={handleFlatRateChange}
                      disabled={!hasFlatRates}
                    >
                      <option value="">Select a flat rate</option>
                      {flatRates.map((rate) => (
                        <option key={rate._id} value={rate._id}>
                          {rate.name} — ${Number(rate.amount).toFixed(2)}
                          {rate.distanceLabel ? ` (${rate.distanceLabel})` : ''}
                        </option>
                      ))}
                    </select>
                    <small className="field-help">
                      {loadingFlatRates
                        ? 'Loading flat rates...'
                        : flatRateLoadError
                        ? flatRateLoadError
                        : hasFlatRates
                        ? selectedFlatRate
                          ? `This trip will be dispatched at $${Number(selectedFlatRate.amount).toFixed(2)}.`
                          : 'Pick a flat rate to finalize the fare.'
                        : 'Add flat rates under Fares → Flat Rates before using this option.'}
                    </small>
                  </div>
                )}
                <div className="form-estimate">
                  <div className="estimate-row">
                    <span>Estimated distance</span>
                    <span className="estimate-value">
                      {roundedDistance !== null ? `${roundedDistance.toFixed(2)} mi` : 'Add pickup & drop-off'}
                    </span>
                  </div>
                  {distanceSourceLabel && (
                    <p className="estimate-note subtle">{distanceSourceLabel}</p>
                  )}
                  {form.fareStrategy !== 'flat' && distanceError && (
                    <p className="estimate-note warning">{distanceError}</p>
                  )}
                  <div className="estimate-row">
                    <span>Estimated fare</span>
                    <span className="estimate-value">
                      {roundedFare !== null
                        ? `$${roundedFare.toFixed(2)}`
                        : form.fareStrategy === 'flat'
                        ? loadingFlatRates
                          ? 'Loading flat rates...'
                          : flatRateLoadError
                          ? 'Flat rates unavailable'
                          : hasFlatRates
                          ? 'Select flat rate'
                          : 'Add flat rates'
                        : fareConfig
                        ? 'Awaiting coordinates'
                        : fareLoadError
                        ? 'Unavailable'
                        : 'Configure fares'}
                    </span>
                  </div>
                  <p className="estimate-note">{fareEstimateNote}</p>
                </div>
                <div className="checkbox-field">
                  <label htmlFor="wheelchairNeeded">
                    <input
                      id="wheelchairNeeded"
                      type="checkbox"
                      name="wheelchairNeeded"
                      checked={form.wheelchairNeeded}
                      onChange={handleCheckboxChange}
                    />
                    Wheelchair accessible vehicle required
                  </label>
                </div>
                <div className="checkbox-field">
                  <label htmlFor="noShowFeeApplied">
                    <input
                      id="noShowFeeApplied"
                      type="checkbox"
                      name="noShowFeeApplied"
                      checked={form.noShowFeeApplied}
                      onChange={handleCheckboxChange}
                    />
                    Apply no-show fee if rider cancels late
                  </label>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="notes">Internal notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Door codes, special requests, flight numbers..."
                  />
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div>{error && <div className="feedback error">{error}</div>}</div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving booking…' : 'Save booking'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="form-section" style={{ marginBottom: 0 }}>
            <div>
              <h3>Pickup & drop-off map</h3>
              <p>
                Click the map to place {mapFocus === 'pickup' ? 'pickup' : 'drop-off'} coordinates. Use the toggle below to
                switch which marker is active.
              </p>
            </div>
            <div className="map-wrapper">
              <MapContainer
                center={[resolvedCenter.lat, resolvedCenter.lng]}
                zoom={12}
                style={{ height: '320px', width: '100%' }}
              >
                <TileLayer attribution={tileLayerAttribution} url={tileLayerUrl} maxZoom={20} />
                <MapAutoCenter />
                {nearbyDrivers.map((driver) => (
                  <Marker
                    key={`nearby-driver-${driver.id}`}
                    position={[driver.coordinates.lat, driver.coordinates.lng]}
                    icon={driverMarkerIcon}
                  >
                    <Popup>
                      <strong>{driver.driverName}</strong>
                      <br />
                      {driver.cabNumber ? `Cab ${driver.cabNumber}` : 'Cab pending'}
                      <br />
                      {Number.isFinite(driver.distanceMiles)
                        ? `${driver.distanceMiles.toFixed(2)} mi from pickup`
                        : 'Distance unavailable'}
                      <br />
                      {formatRelativeTime(driver.updatedAt)
                        ? `Ping ${formatRelativeTime(driver.updatedAt)}`
                        : 'Ping time unavailable'}
                    </Popup>
                  </Marker>
                ))}
                <LocationMarker />
              </MapContainer>
              <div className="map-toggle">
                <button
                  type="button"
                  className={`btn btn-ghost ${mapFocus === 'pickup' ? 'active' : ''}`}
                  onClick={() => setMapFocus('pickup')}
                >
                  Set pickup marker
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost ${mapFocus === 'dropoff' ? 'active' : ''}`}
                  onClick={() => setMapFocus('dropoff')}
                >
                  Set drop-off marker
                </button>
              </div>
              <div className="map-coordinates">
                <div>
                  <strong>Pickup:</strong>{' '}
                  {form.pickupLat && form.pickupLon
                    ? `${Number(form.pickupLat).toFixed(5)}, ${Number(form.pickupLon).toFixed(5)}`
                    : 'Not set'}
                </div>
                <div>
                  <strong>Drop-off:</strong>{' '}
                  {form.dropoffLat && form.dropoffLon
                    ? `${Number(form.dropoffLat).toFixed(5)}, ${Number(form.dropoffLon).toFixed(5)}`
                    : 'Not set'}
                </div>
              </div>
              <div className="nearby-drivers">
                <div className="nearby-drivers-header">
                  <h4>Online drivers nearby</h4>
                  {pickupPosition && !nearbyLoading && (
                    <span className="nearby-drivers-count">
                      {nearbyDrivers.length > 0
                        ? `${nearbyDrivers.length} within ${nearbyRadiusMiles} mi`
                        : `No drivers within ${nearbyRadiusMiles} mi`}
                    </span>
                  )}
                </div>
                {!pickupPosition ? (
                  <p className="nearby-drivers-empty">
                    Set a pickup marker to see who is online around this trip.
                  </p>
                ) : nearbyLoading ? (
                  <p className="nearby-drivers-loading">Checking availability...</p>
                ) : nearbyError ? (
                  <p className="nearby-drivers-error">{nearbyError}</p>
                ) : nearbyDrivers.length === 0 ? (
                  <p className="nearby-drivers-empty">
                    No online drivers reported within {nearbyRadiusMiles} miles.
                  </p>
                ) : (
                  <ul className="nearby-drivers-list">
                    {nearbyDrivers.map((driver) => {
                      const lastPing = formatRelativeTime(driver.updatedAt);
                      return (
                        <li key={driver.id} className="nearby-driver-row">
                          <div className="nearby-driver-main">
                            <span className="nearby-driver-name">{driver.driverName}</span>
                            {driver.cabNumber && (
                              <span className="nearby-driver-cab">Cab {driver.cabNumber}</span>
                            )}
                          </div>
                          <div className="nearby-driver-meta">
                            {Number.isFinite(driver.distanceMiles) && (
                              <span>{driver.distanceMiles.toFixed(1)} mi away</span>
                            )}
                            {lastPing && <span>Ping {lastPing}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <small>
                Addresses will auto-geocode if coordinates are missing, but confirming both markers prevents dispatch
                issues.
              </small>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
      {showReturnPrompt && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="modal-card"
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.28)',
            }}
          >
            <h3 style={{ margin: '0 0 12px' }}>Schedule return trip?</h3>
            <p style={{ margin: '0 0 18px', color: '#4b5563', lineHeight: 1.5 }}>
              The outbound booking has been saved successfully. Would you like to create a return trip
              with the pickup and drop-off reversed? If no return is required, choose{' '}
              <strong>Keep single trip</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeReturnPrompt}
                style={{ padding: '10px 16px' }}
              >
                Keep single trip
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={scheduleReturnTrip}
                style={{ padding: '10px 18px' }}
              >
                Prepare return trip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingsCreate;
