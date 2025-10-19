import jsPDF from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import AppLayout from '../../components/AppLayout';
import { listBookings } from '../../services/bookingService';
import { getCompanyProfile } from '../../services/companyService';
import { getFare } from '../../services/fareService';

const defaultFilters = {
  driver: '',
  pickup: '',
  dropoff: '',
  from: '',
  to: '',
};

const ReceiptGenerator = () => {
  const [company, setCompany] = useState({
    name: 'TaxiOps Transportation LLC',
    address: '',
    phone: '',
    email: '',
  });
  const [trips, setTrips] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapModalCoords, setMapModalCoords] = useState({
    lat: null,
    lon: null,
    label: '',
    pickupLat: null,
    pickupLon: null,
    dropoffLat: null,
    dropoffLon: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    let ignore = false;

    const unwrap = (response, preferredKeys = []) => {
      const payload = response?.data ?? response ?? {};
      if (Array.isArray(payload)) return payload;
      for (const key of preferredKeys) {
        const value = payload?.[key];
        if (Array.isArray(value)) return value;
      }
      if (Array.isArray(payload?.data)) return payload.data;
      const firstArray = Object.values(payload).find((value) => Array.isArray(value));
      return Array.isArray(firstArray) ? firstArray : [];
    };

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [companyRes, bookingsRes, fareRes] = await Promise.all([
          getCompanyProfile(),
          listBookings({ status: 'Completed' }),
          getFare().catch(() => ({ data: null })),
        ]);

        if (!ignore) {
          const fetchedCompany = companyRes.data?.company;
          if (fetchedCompany) {
            setCompany({
              name: fetchedCompany.name || 'TaxiOps Transportation LLC',
              address: fetchedCompany.address || '',
              phone: fetchedCompany.phone || '',
              email: fetchedCompany.email || '',
            });
          }

          const fareConfig = fareRes?.data?.fare || fareRes?.data || fareRes || null;

          const fetchedTrips = unwrap(bookingsRes, ['bookings', 'results'])
            .filter((booking) => booking.status === 'Completed')
            .map((booking) => ({
              id: booking.bookingId || booking._id,
              customer: booking.customerName || '-',
              pickup: booking.pickupTime || null,
              dropoff: booking.droppedOffAt || booking.completedAt || null,
              origin: booking.pickupAddress || '-',
              destination: booking.dropoffAddress || '-',
              // keep coordinates so UI can show lat/lon when address is missing
              pickupLat: booking.pickupLat ?? booking.pickupLat ?? null,
              pickupLon: booking.pickupLon ?? booking.pickupLon ?? null,
              dropoffLat: booking.dropoffLat ?? booking.dropoffLat ?? null,
              dropoffLon: booking.dropoffLon ?? booking.dropoffLon ?? null,
              driver: booking.driverName || booking.driver?.name || booking.driverId || 'Unassigned',
              driverId: booking.driverId || booking.driver?._id || '',
              cabNumber: booking.cabNumber || booking.assignedCab || '',
              fare: Number(booking.finalFare ?? booking.estimatedFare ?? 0),
              // fields used to reconstruct the driver's fare breakdown
              meterMiles: Number(booking.meterMiles ?? booking.estimatedDistanceMiles ?? 0),
              waitMinutes: Number(booking.waitMinutes ?? 0),
              passengers: Number(booking.passengers ?? 1),
              appliedFees: Array.isArray(booking.appliedFees) ? booking.appliedFees : [],
              fareStrategy: booking.fareStrategy || 'meter',
              flatRateAmount: Number(booking.flatRateAmount ?? booking.flatRateAmount ?? 0),
              fareConfig,
            }))
            // sort by pickup time (newest first)
            .sort((a, b) => {
              const aMs = a.pickup ? Date.parse(a.pickup) : 0;
              const bMs = b.pickup ? Date.parse(b.pickup) : 0;
              return bMs - aMs;
            });

          setTrips(fetchedTrips);
        }
      } catch (err) {
        if (!ignore) {
          const message = err.response?.data?.message || 'Unable to load receipt data.';
          setError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredTrips = useMemo(() => {
    const driverQuery = filters.driver.trim().toLowerCase();
    const pickupQuery = filters.pickup.trim().toLowerCase();
    const dropoffQuery = filters.dropoff.trim().toLowerCase();
    const fromMs = filters.from ? Date.parse(filters.from) : null;
    const toMs = filters.to ? Date.parse(filters.to) : null;

    return trips.filter((trip) => {
      if (driverQuery) {
        const driverText = `${trip.driver || ''} ${trip.driverId || ''}`.toLowerCase();
        if (!driverText.includes(driverQuery)) return false;
      }

      if (pickupQuery) {
        const pickupText = String(trip.origin || '').toLowerCase();
        if (!pickupText.includes(pickupQuery)) return false;
      }

      if (dropoffQuery) {
        const dropoffText = String(trip.destination || '').toLowerCase();
        if (!dropoffText.includes(dropoffQuery)) return false;
      }

      const pickupMs = trip.pickup ? Date.parse(trip.pickup) : Number.NaN;
      if (fromMs && (Number.isNaN(pickupMs) || pickupMs < fromMs)) return false;
      if (toMs && (Number.isNaN(pickupMs) || pickupMs > toMs)) return false;

      return true;
    });
  }, [trips, filters]);

  // reset page to 1 whenever filters change
  useEffect(() => setPage(1), [filters]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTrips.length / (pageSize || 1)));
  }, [filteredTrips.length, pageSize]);

  // clamp page when filteredTrips or pageSize change
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedTrips = useMemo(() => {
    const size = Number(pageSize) || 20;
    const start = (Number(page) - 1) * size;
    return filteredTrips.slice(start, start + size);
  }, [filteredTrips, page, pageSize]);

  const filtersActive = useMemo(
    () => Object.values(filters).some((value) => value && value.length),
    [filters],
  );

  const totalFare = useMemo(
    () => filteredTrips.reduce((sum, trip) => sum + Number(trip.fare || 0), 0),
    [filteredTrips],
  );

  const companyDescriptor = useMemo(() => {
    const segments = [];
    if (company.name) segments.push(company.name);
    if (company.address) segments.push(company.address);
    const contactLine = [company.phone, company.email].filter(Boolean).join(' / ');
    if (contactLine) segments.push(contactLine);
    return segments.join(' | ');
  }, [company]);

  const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

  const formatAddressOrCoords = (address, lat, lon) => {
    const addr = typeof address === 'string' ? address.trim() : '';
    // If we have a sensible address, show it
    if (addr && addr.length > 3 && !addr.toLowerCase().includes('flagdown')) return addr;
    // Otherwise, if coordinates exist, show lat,lon with reasonable precision
    const la = typeof lat === 'number' ? lat : Number(lat);
    const lo = typeof lon === 'number' ? lon : Number(lon);
    if (Number.isFinite(la) && Number.isFinite(lo)) return `${la.toFixed(6)}, ${lo.toFixed(6)}`;
    // fallback to address or dash
    return addr || '-';
  };



  const openTripMapModal = (pickupLat, pickupLon, dropoffLat, dropoffLon, label) => {
    const pla = Number(pickupLat);
    const plo = Number(pickupLon);
    const dla = Number(dropoffLat);
    const dlo = Number(dropoffLon);

    const hasPickup = Number.isFinite(pla) && Number.isFinite(plo);
    const hasDropoff = Number.isFinite(dla) && Number.isFinite(dlo);

    const coords = {
      pickupLat: hasPickup ? pla : null,
      pickupLon: hasPickup ? plo : null,
      dropoffLat: hasDropoff ? dla : null,
      dropoffLon: hasDropoff ? dlo : null,
      lat: null,
      lon: null,
      label: label || '',
    };

    // If only one point exists, populate lat/lon for single-point preview
    if (hasPickup && !hasDropoff) {
      coords.lat = pla;
      coords.lon = plo;
      coords.label = coords.label || `Pickup: ${pla.toFixed(6)}, ${plo.toFixed(6)}`;
    } else if (!hasPickup && hasDropoff) {
      coords.lat = dla;
      coords.lon = dlo;
      coords.label = coords.label || `Dropoff: ${dla.toFixed(6)}, ${dlo.toFixed(6)}`;
    } else if (hasPickup && hasDropoff) {
      coords.label = coords.label || `Trip: ${label || ''}`;
    }

    // debug
    try {
      // eslint-disable-next-line no-console
      console.log('openTripMapModal', coords);
    } catch (e) {}

    setMapModalCoords(coords);
    setMapModalOpen(true);
  };

  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

  const buildMapboxStaticUrl = ({ pickupLat, pickupLon, dropoffLat, dropoffLon, width = 860, height = 420 }) => {
    const token = (MAPBOX_TOKEN || '').trim();
    if (!token) return '';

    // helper to format marker
    const mk = (id, lat, lon, color) => `pin-s-${id}+${color}(${lon},${lat})`;

    let overlay = '';
    if (pickupLat !== null && pickupLon !== null && dropoffLat !== null && dropoffLon !== null) {
      overlay = [mk('a', pickupLat, pickupLon, '285AEB'), mk('b', dropoffLat, dropoffLon, 'FF3B30')].join(',');
      // use auto to fit both markers
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${encodeURIComponent(overlay)}/auto/${width}x${height}@2x?access_token=${token}`;
    }

    const lat = pickupLat !== null && pickupLon !== null ? pickupLat : dropoffLat;
    const lon = pickupLat !== null && pickupLon !== null ? pickupLon : dropoffLon;
    if (lat === null || lon === null) return '';

    overlay = mk('pin', lat, lon, '285AEB');
    // center at point with a fixed zoom
    const zoom = 15;
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${encodeURIComponent(overlay)}/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${token}`;
  };

  // Free OpenStreetMap static map via staticmap.openstreetmap.de
  const buildOsmStaticUrl = ({ pickupLat, pickupLon, dropoffLat, dropoffLon, width = 860, height = 200, zoom = 14 }) => {
    // staticmap.openstreetmap.de API: https://staticmap.openstreetmap.de
    // markers format: lat,lon,markerColor
    const markers = [];
    if (pickupLat !== null && pickupLon !== null) markers.push(`${pickupLat},${pickupLon},red-pushpin`);
    if (dropoffLat !== null && dropoffLon !== null) markers.push(`${dropoffLat},${dropoffLon},blue-pushpin`);

    // center: midpoint if both exist, otherwise the existing point
    let centerLat = null;
    let centerLon = null;
    if (pickupLat !== null && pickupLon !== null && dropoffLat !== null && dropoffLon !== null) {
      centerLat = (Number(pickupLat) + Number(dropoffLat)) / 2;
      centerLon = (Number(pickupLon) + Number(dropoffLon)) / 2;
    } else if (pickupLat !== null && pickupLon !== null) {
      centerLat = pickupLat;
      centerLon = pickupLon;
    } else if (dropoffLat !== null && dropoffLon !== null) {
      centerLat = dropoffLat;
      centerLon = dropoffLon;
    }

    if (centerLat === null || centerLon === null) return '';

    const size = `${Math.min(1280, Math.max(300, Math.round(width)))}x${Math.min(1024, Math.max(120, Math.round(height)))}`;
    const markerParam = markers.join('|');
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(`${centerLat},${centerLon}`)}&zoom=${encodeURIComponent(String(zoom))}&size=${encodeURIComponent(size)}&markers=${encodeURIComponent(markerParam)}`;
  };

  const loadImageAsDataUrl = (url) =>
    new Promise((resolve) => {
      if (!url) return resolve(null);
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
        // If the image is cached and already complete
        if (img.complete && img.naturalWidth) {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        }
      } catch (e) {
        resolve(null);
      }
    });

  const closeMapModal = () => {
    setMapModalOpen(false);
    setMapModalCoords({ lat: null, lon: null, label: '' });
  };

  // Minimal local copy of meter logic to match driver app breakdown
  const safeAmount = (v, fallback = 0) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  };

  function applyMeterRounding(value, mode = 'none') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    switch (mode) {
      case 'nearest_0.1':
        return Math.round(amount * 10) / 10;
      case 'nearest_0.25':
        return Math.round(amount * 4) / 4;
      case 'nearest_0.5':
        return Math.round(amount * 2) / 2;
      case 'nearest_1':
        return Math.round(amount);
      case 'none':
      default:
        return Math.round(amount * 100) / 100;
    }
  }

  function computeFareBreakdownLocal({ fareConfig, fareStrategy, flatRateAmount, meterMiles, waitMinutes, passengers, appliedFees }) {
    const fees = Array.isArray(appliedFees) ? appliedFees : [];
    const otherFeesTotal = fees.reduce((s, f) => s + safeAmount(f?.amount), 0);
    const passengerCount = Number(passengers || 1);
    const extraPassengers = Math.max(Math.floor(passengerCount) - 1, 0);
    const extraPassengerFare = extraPassengers * safeAmount(fareConfig?.extraPass ?? 0);
    const roundingMode = fareConfig?.meterRoundingMode || 'none';
    const surgeMultiplier = fareConfig?.surgeEnabled && safeAmount(fareConfig?.surgeMultiplier, 0) > 0 ? Math.max(safeAmount(fareConfig.surgeMultiplier), 1) : 1;

    if (fareStrategy === 'flat' && Number.isFinite(flatRateAmount) && flatRateAmount > 0) {
      const baseFare = safeAmount(flatRateAmount, 0);
      const subtotalWithExtras = baseFare + extraPassengerFare + otherFeesTotal;
      const total = applyMeterRounding(subtotalWithExtras, roundingMode);
      return {
        baseFare,
        distanceFare: 0,
        waitFare: 0,
        extraPassengerFare,
        otherFeesTotal,
        otherFees: fees,
        roundingAdjustment: total - subtotalWithExtras,
        total,
      };
    }

    const baseFare = safeAmount(fareConfig?.baseFare ?? 0);
    const perMile = safeAmount(fareConfig?.farePerMile ?? 0);
    const waitRate = safeAmount(fareConfig?.waitTimePerMinute ?? 0);
    const minimumFare = safeAmount(fareConfig?.minimumFare ?? 0);

    const distanceFare = Math.max(Number(meterMiles || 0), 0) * perMile;
    const waitFare = Math.max(Number(waitMinutes || 0), 0) * waitRate;

    let subtotalBeforeExtras = baseFare + distanceFare + waitFare;
    let minimumApplied = false;
    if (minimumFare > 0 && subtotalBeforeExtras < minimumFare) {
      subtotalBeforeExtras = minimumFare;
      minimumApplied = true;
    }

    const surgedSubtotal = subtotalBeforeExtras * surgeMultiplier;
    const subtotalWithExtras = surgedSubtotal + extraPassengerFare + otherFeesTotal;
    const total = applyMeterRounding(subtotalWithExtras, roundingMode);

    return {
      baseFare,
      distanceFare,
      waitFare,
      extraPassengerFare,
      otherFeesTotal,
      otherFees: fees,
      minimumApplied,
      roundingAdjustment: total - subtotalWithExtras,
      total,
      subtotalWithExtras,
    };
  }

  const buildReceiptPdf = async (trip) => {
  const doc = new jsPDF({ unit: 'pt' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursor = margin;

    // drawBody renders the receipt body using current `cursor` and shared vars
    const drawBody = () => {
      // Receipt title and metadata
      doc.setFontSize(13);
      const centerX = pageWidth / 2;
      // Title centered
      doc.text(`Receipt — Trip ${trip.id}`, centerX, cursor, { align: 'center' });
      doc.setFontSize(9);
      // Trip date centered under header area
      doc.text(`Date: ${formatDateTime(trip.pickup)}`, centerX, cursor + 16, { align: 'center' });
      // advance cursor to leave space for centered title/date
      cursor += 34;
      cursor += 16;

      doc.setLineWidth(0.5);
      doc.line(margin, cursor, pageWidth - margin, cursor);
      cursor += 12;

      // Trip details
      doc.setFontSize(10);
      const leftCol = margin;
      const rightCol = pageWidth - margin;
      doc.text(`Customer: ${trip.customer}`, leftCol, cursor);
      doc.text(`Trip ID: ${trip.id}`, rightCol, cursor, { align: 'right' });
      cursor += 14;
      doc.text(`Driver: ${trip.driver}`, leftCol, cursor);
      doc.text(`Cab: ${trip.cabNumber || '—'}`, rightCol, cursor, { align: 'right' });
      cursor += 14;
  doc.text(`Origin: ${formatAddressOrCoords(trip.origin, trip.pickupLat, trip.pickupLon)}`, leftCol, cursor);
  cursor += 12;
  doc.text(`Destination: ${formatAddressOrCoords(trip.destination, trip.dropoffLat, trip.dropoffLon)}`, leftCol, cursor);
      cursor += 16;

  // Itemized fare area (always show breakdown fields even if zero)
  doc.setFontSize(11);
  cursor += 0;

      // Build a breakdown that matches driver-app logic
      const fareCfg = trip.fareConfig || null;
      // Debug: output trip and fare config so we can inspect missing/zero values in browser console
      try {
        // eslint-disable-next-line no-console
        console.log('Receipt debug - trip', { id: trip.id, meterMiles: trip.meterMiles, waitMinutes: trip.waitMinutes, appliedFees: trip.appliedFees, fareStrategy: trip.fareStrategy, flatRateAmount: trip.flatRateAmount, fareConfig: fareCfg });
      } catch (e) {
        // ignore
      }
      const computed = computeFareBreakdownLocal({
        fareConfig: fareCfg,
        fareStrategy: trip.fareStrategy,
        flatRateAmount: trip.flatRateAmount,
        meterMiles: trip.meterMiles,
        waitMinutes: trip.waitMinutes,
        passengers: trip.passengers,
        appliedFees: trip.appliedFees,
      });

      const labelX = leftCol;
      const amountX = rightCol;

  doc.text('Fare breakdown', leftCol, cursor);
      cursor += 12;

      // Render only charged (non-zero) fare lines
      const chargedLines = [];
      if (Number(computed.baseFare ?? 0) !== 0) chargedLines.push({ label: 'Base fare', amount: computed.baseFare });
      if (trip.fareStrategy !== 'flat' && Number(computed.distanceFare ?? 0) !== 0)
        chargedLines.push({ label: 'Distance fare', amount: computed.distanceFare });
      if (trip.fareStrategy !== 'flat' && Number(computed.waitFare ?? 0) !== 0)
        chargedLines.push({ label: 'Wait fare', amount: computed.waitFare });
      if (Number(computed.extraPassengerFare ?? 0) !== 0)
        chargedLines.push({ label: 'Extra passenger', amount: computed.extraPassengerFare });
      const otherFees = Array.isArray(computed.otherFees) ? computed.otherFees : [];
      for (const fee of otherFees) {
        if (Number(fee.amount ?? 0) !== 0) chargedLines.push({ label: fee.name, amount: fee.amount });
      }
      if (Number(computed.roundingAdjustment ?? 0) !== 0)
        chargedLines.push({ label: 'Rounding', amount: computed.roundingAdjustment });

      for (const line of chargedLines) {
        doc.text(line.label, labelX, cursor);
        const amt = Number(line.amount ?? 0);
        const display = amt < 0 ? `-$${Math.abs(amt).toFixed(2)}` : `$${amt.toFixed(2)}`;
        doc.text(display, amountX, cursor, { align: 'right' });
        cursor += 14;
      }

      // Rounding adjustment (if any)
      if (Number(computed.roundingAdjustment ?? 0) !== 0) {
        doc.text('Rounding', labelX, cursor);
        const ra = Number(computed.roundingAdjustment ?? 0);
        const display = ra < 0 ? `-$${Math.abs(ra).toFixed(2)}` : `$${ra.toFixed(2)}`;
        doc.text(display, amountX, cursor, { align: 'right' });
        cursor += 14;
      }

      doc.setLineWidth(0.5);
      doc.line(labelX, cursor, amountX, cursor);
      cursor += 8;
      doc.setFontSize(12);
      doc.text('Total', labelX, cursor);
      doc.text(`$${Number(computed.total ?? 0).toFixed(2)}`, amountX, cursor, { align: 'right' });
      cursor += 24;

      doc.setFontSize(10);
      // Center the thank-you message
      doc.text('Thank you for riding with us.', pageWidth / 2, cursor, { align: 'center' });
    };

    // Header: optional logo and company name
    if (company.logoUrl) {
      try {
        const logoData = await loadImageAsDataUrl(company.logoUrl);
        if (logoData) {
          const imgWidth = 80;
          // try to get aspect ratio from an Image
          const tmpImg = new Image();
          tmpImg.src = logoData;
          const imgHeight = tmpImg.height && tmpImg.width ? (tmpImg.height / tmpImg.width) * imgWidth : 28;
          doc.addImage(logoData, 'PNG', margin, cursor, imgWidth, imgHeight);
          doc.setFontSize(16);
          const centerX = pageWidth / 2;
          doc.text(company.name || 'TaxiOps Transportation LLC', centerX, cursor + imgHeight / 2 + 6, { align: 'center' });
          cursor += Math.max(imgHeight, 28) + 8;
        } else {
          doc.setFontSize(16);
          const centerX = pageWidth / 2;
          doc.text(company.name || 'TaxiOps Transportation LLC', centerX, cursor, { align: 'center' });
          cursor += 28;
        }
      } catch (e) {
        doc.setFontSize(16);
        const centerX = pageWidth / 2;
        doc.text(company.name || 'TaxiOps Transportation LLC', centerX, cursor, { align: 'center' });
        cursor += 28;
      }
    }

    doc.setFontSize(16);
    const centerX = pageWidth / 2;
    doc.text(company.name || 'TaxiOps Transportation LLC', centerX, cursor, { align: 'center' });
    cursor += 20;
    doc.setFontSize(10);
    if (company.address) {
      doc.text(company.address, centerX, cursor, { align: 'center' });
      cursor += 14;
    }
    const contactLine = [company.phone, company.email].filter(Boolean).join(' | ');
    if (contactLine) {
      doc.text(contactLine, centerX, cursor, { align: 'center' });
      cursor += 14;
    }

    cursor += 8;

    // render body
    drawBody();

    // Try to embed a small map centered at the bottom of the receipt
    try {
      const pLat = trip.pickupLat ?? null;
      const pLon = trip.pickupLon ?? null;
      const dLat = trip.dropoffLat ?? null;
      const dLon = trip.dropoffLon ?? null;
      if ((pLat !== null && pLon !== null) || (dLat !== null && dLon !== null)) {
        let mapData = null;
        try {
          const osmUrl = buildOsmStaticUrl({ pickupLat: pLat, pickupLon: pLon, dropoffLat: dLat, dropoffLon: dLon, width: 600, height: 120, zoom: 13 });
          mapData = await loadImageAsDataUrl(osmUrl);
        } catch (e) {
          mapData = null;
        }
        if (!mapData && (MAPBOX_TOKEN || '').trim()) {
          try {
            const mbUrl = buildMapboxStaticUrl({ pickupLat: pLat, pickupLon: pLon, dropoffLat: dLat, dropoffLon: dLon, width: 700, height: 140 });
            mapData = await loadImageAsDataUrl(mbUrl);
          } catch (e) {
            mapData = null;
          }
        }

        if (mapData) {
          try {
            const mapWidth = Math.min(pageWidth - margin * 2, 500);
            const mapHeight = 90;
            const x = (pageWidth - mapWidth) / 2;
            // place map near bottom of page with small margin
            const y = doc.internal.pageSize.getHeight() - margin - mapHeight;
            doc.addImage(mapData, 'PNG', x, y, mapWidth, mapHeight);
          } catch (e) {
            // ignore map embed
          }
        }
      }
    } catch (e) {
      // ignore
    }

    doc.save(`${trip.id || 'receipt'}.pdf`);
  };

  const downloadReceipts = async (targetTrips) => {
    if (!Array.isArray(targetTrips) || !targetTrips.length) return;
    for (const trip of targetTrips) {
      try {
        // sequentially await each PDF build/save so dialogs and image loads don't collide
        // eslint-disable-next-line no-await-in-loop
        await buildReceiptPdf(trip);
      } catch (e) {
        // ignore and continue to next
      }
    }
  };

  const exportFilteredToCsv = () => {
    if (!filteredTrips.length) return;
    const headers = [
      'Trip ID',
      'Driver',
      'Cab',
      'Customer',
      'Pickup',
      'Drop-off',
      'Origin',
      'Destination',
      'Fare',
    ];
    const rows = filteredTrips.map((trip) => [
      trip.id ?? '',
      trip.driver ?? '',
      trip.cabNumber ? `Cab ${trip.cabNumber}` : '',
      trip.customer ?? '',
      formatDateTime(trip.pickup),
      formatDateTime(trip.dropoff),
      formatAddressOrCoords(trip.origin, trip.pickupLat, trip.pickupLon),
      formatAddressOrCoords(trip.destination, trip.dropoffLat, trip.dropoffLon),
      Number(trip.fare || 0).toFixed(2),
    ]);
    const csvLines = [headers, ...rows].map((line) =>
      line
        .map((value) => {
          const safe = value === undefined || value === null ? '' : String(value);
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'receipts.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => setFilters({ ...defaultFilters });

  return (
    <AppLayout
      title="Generate receipt"
      subtitle="Review completed trips and export a printable receipt for riders or corporate accounts."
    >
      <div className="panel" style={{ maxWidth: '1040px', margin: '0 auto' }}>
        <div
          className="panel-header"
          style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}
        >
          <div>
            <h3>Receipt library</h3>
            <p className="panel-subtitle">
              {companyDescriptor || 'TaxiOps Transportation LLC'}
            </p>
          </div>
          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-subtle"
              onClick={exportFilteredToCsv}
              disabled={loading || !!error || filteredTrips.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => downloadReceipts(filteredTrips)}
              disabled={loading || !!error || filteredTrips.length === 0}
            >
              Download receipts (PDF)
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => downloadReceipts(paginatedTrips)}
              disabled={loading || !!error || paginatedTrips.length === 0}
            >
              Download page
            </button>
          </div>
        </div>

          <div className="panel-body" style={{ gap: '18px' }}>
          <div className="form-grid">
            <div>
              <label htmlFor="filterDriver">Driver</label>
              <input
                id="filterDriver"
                name="driver"
                type="text"
                value={filters.driver}
                onChange={handleFilterChange}
                placeholder="Name or ID"
              />
            </div>
            <div>
              <label htmlFor="filterPickup">Pickup address</label>
              <input
                id="filterPickup"
                name="pickup"
                type="text"
                value={filters.pickup}
                onChange={handleFilterChange}
                placeholder="Search pickup"
              />
            </div>
            <div>
              <label htmlFor="filterDropoff">Drop-off address</label>
              <input
                id="filterDropoff"
                name="dropoff"
                type="text"
                value={filters.dropoff}
                onChange={handleFilterChange}
                placeholder="Search drop-off"
              />
            </div>
            <div>
              <label htmlFor="filterFrom">From</label>
              <input
                id="filterFrom"
                name="from"
                type="datetime-local"
                value={filters.from}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <label htmlFor="filterTo">To</label>
              <input
                id="filterTo"
                name="to"
                type="datetime-local"
                value={filters.to}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <div
            className="pill-group"
            style={{ justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
          >
            <div>
              <span>
                Showing {filteredTrips.length} of {trips.length} trip
                {trips.length === 1 ? '' : 's'}.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: '#64748b' }}>Page size:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button type="button" className="btn btn-ghost" onClick={resetFilters} disabled={!filtersActive}>
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: '240px', borderRadius: '16px' }} />
        ) : error ? (
          <div className="feedback error">{error}</div>
        ) : filteredTrips.length === 0 ? (
          <div className="fleet-alert-empty">No trips match the current filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Driver</th>
                  <th>Customer</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th style={{ textAlign: 'right' }}>Fare ($)</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.id}</td>
                    <td>
                      <div className="table-stack">
                        <span className="primary">{trip.driver}</span>
                        <span className="secondary">
                          {[trip.driverId, trip.cabNumber && `Cab ${trip.cabNumber}`]
                            .filter(Boolean)
                            .join(' | ') || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td>{trip.customer}</td>
                    <td>{formatDateTime(trip.pickup)}</td>
                    <td>{formatDateTime(trip.dropoff)}</td>
                    <td>{formatAddressOrCoords(trip.origin, trip.pickupLat, trip.pickupLon)}</td>
                    <td>{formatAddressOrCoords(trip.destination, trip.dropoffLat, trip.dropoffLon)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {Number(trip.fare || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            try {
                              await buildReceiptPdf(trip);
                            } catch (e) {
                              // ignore
                            }
                          }}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="btn btn-subtle"
                          onClick={() => openTripMapModal(trip.pickupLat, trip.pickupLon, trip.dropoffLat, trip.dropoffLon, `${trip.id}`)}
                          disabled={!(Number.isFinite(Number(trip.pickupLat)) && Number.isFinite(Number(trip.pickupLon))) && !(Number.isFinite(Number(trip.dropoffLat)) && Number.isFinite(Number(trip.dropoffLon)))}
                        >
                          Map
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && !error && filteredTrips.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPage(1)} disabled={page <= 1}>
                ⏮ First
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ◀ Prev
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next ▶
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                Last ⏭
              </button>
            </div>

            <div style={{ color: '#64748b' }}>
              Page {page} of {totalPages} — {filteredTrips.length} result{filteredTrips.length === 1 ? '' : 's'}
            </div>
          </div>
        )}

        <div
          className="panel-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>Total collected:</strong> ${totalFare.toFixed(2)}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Prepared on {new Date().toLocaleString()}
          </div>
        </div>
      </div>
        {/* Map preview modal */}
        {mapModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={closeMapModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '860px',
                height: '70vh',
                background: '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #e6edf3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontWeight: 600 }}>{mapModalCoords.label}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {mapModalCoords.pickupLat !== null && mapModalCoords.pickupLon !== null && mapModalCoords.dropoffLat !== null && mapModalCoords.dropoffLon !== null ? (
                    <a
                      className="btn btn-ghost"
                      href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${mapModalCoords.pickupLat},${mapModalCoords.pickupLon}`)}&destination=${encodeURIComponent(`${mapModalCoords.dropoffLat},${mapModalCoords.dropoffLon}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  ) : mapModalCoords.lat !== null && mapModalCoords.lon !== null ? (
                    <a
                      className="btn btn-ghost"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapModalCoords.lat},${mapModalCoords.lon}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                  <button type="button" className="btn btn-ghost" onClick={closeMapModal}>
                    Close
                  </button>
                </div>
              </div>
              {
                // Prefer a free interactive OpenStreetMap (Leaflet) preview when coordinates exist.
                (Number.isFinite(Number(mapModalCoords.pickupLat)) || Number.isFinite(Number(mapModalCoords.dropoffLat))) ? (
                  (() => {
                    const pickupExists = Number.isFinite(Number(mapModalCoords.pickupLat)) && Number.isFinite(Number(mapModalCoords.pickupLon));
                    const dropoffExists = Number.isFinite(Number(mapModalCoords.dropoffLat)) && Number.isFinite(Number(mapModalCoords.dropoffLon));

                    // Fit bounds helper
                    function FitBounds({ points }) {
                      const map = useMap();
                      useEffect(() => {
                        if (!map || !points || !points.length) return;
                        try {
                          if (points.length === 1) {
                            map.setView(points[0], 15);
                          } else {
                            const latlngs = points.map((p) => [p.lat, p.lon]);
                            map.fitBounds(latlngs, { padding: [40, 40] });
                          }
                        } catch (e) {
                          // ignore
                        }
                      }, [map, points]);
                      return null;
                    }

                    const points = [];
                    if (pickupExists) points.push({ lat: Number(mapModalCoords.pickupLat), lon: Number(mapModalCoords.pickupLon), label: 'Pickup' });
                    if (dropoffExists) points.push({ lat: Number(mapModalCoords.dropoffLat), lon: Number(mapModalCoords.dropoffLon), label: 'Dropoff' });

                    const center = points.length ? { lat: points[0].lat, lon: points[0].lon } : { lat: 28.2919557, lon: -81.4075713 };

                    return (
                      <div style={{ width: '100%', height: '100%' }}>
                        <MapContainer center={[center.lat, center.lon]} zoom={13} style={{ width: '100%', height: '100%' }}>
                          <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                          />
                          <FitBounds points={points} />
                          {points.map((p, idx) => (
                            <Marker key={idx} position={[p.lat, p.lon]}>
                              <Popup>{p.label}</Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      </div>
                    );
                  })()
                ) : (
                  // If no coords, fall back to Mapbox static image when available, otherwise Google iframe
                  (MAPBOX_TOKEN || '').trim() ? (
                    (() => {
                      const src = buildMapboxStaticUrl({
                        pickupLat: mapModalCoords.pickupLat,
                        pickupLon: mapModalCoords.pickupLon,
                        dropoffLat: mapModalCoords.dropoffLat,
                        dropoffLon: mapModalCoords.dropoffLon,
                        width: 860,
                        height: 420,
                      });
                      return src ? (
                        <div style={{ width: '100%', height: '100%', background: '#f6fafc', display: 'flex', flexDirection: 'column' }}>
                          <img
                            alt={mapModalCoords.label || 'Map preview'}
                            src={src}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#e9f2fb' }}
                          />
                          <div style={{ padding: '6px 10px', borderTop: '1px solid #eef3f8', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <a className="btn btn-ghost" href={src} target="_blank" rel="noreferrer">Open in Mapbox</a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 24 }}>No map preview available for this trip.</div>
                      );
                    })()
                  ) : (
                    <iframe
                      title="map-preview"
                      src={
                        // prefer single point embed: pickup first, then dropoff
                        mapModalCoords.pickupLat !== null && mapModalCoords.pickupLon !== null
                          ? `https://www.google.com/maps?q=${encodeURIComponent(`${mapModalCoords.pickupLat},${mapModalCoords.pickupLon}`)}&z=16&output=embed`
                          : mapModalCoords.dropoffLat !== null && mapModalCoords.dropoffLon !== null
                          ? `https://www.google.com/maps?q=${encodeURIComponent(`${mapModalCoords.dropoffLat},${mapModalCoords.dropoffLon}`)}&z=16&output=embed`
                          : mapModalCoords.lat !== null && mapModalCoords.lon !== null
                          ? `https://www.google.com/maps?q=${encodeURIComponent(`${mapModalCoords.lat},${mapModalCoords.lon}`)}&z=16&output=embed`
                          : ''
                      }
                      style={{ border: 0, width: '100%', height: '100%' }}
                      loading="lazy"
                    />
                  )
                )
              }
            </div>
          </div>
        )}
    </AppLayout>
  );
};

export default ReceiptGenerator;
