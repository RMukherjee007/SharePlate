const { resolveCoordinates, haversineDistanceKm, estimateTravelMinutes } = require('./geoService');

const SERVICE_TIME_PER_STOP_MIN = 6; // minutes to load food at each stop

/**
 * Evaluates a candidate stop sequence for total distance and time-window feasibility.
 */
const evaluateSequence = (startCoords, sequence) => {
  let currLat = startCoords.latitude;
  let currLng = startCoords.longitude;
  let elapsedMinutes = 0;
  let totalDistanceKm = 0;
  const stopDetails = [];

  for (let i = 0; i < sequence.length; i++) {
    const stop = sequence[i];
    const legDist = haversineDistanceKm(currLat, currLng, stop.latitude, stop.longitude);
    const legTravelMin = estimateTravelMinutes(legDist);
    const arrivalMin = elapsedMinutes + legTravelMin;
    const deadlineMin = stop.remaining_hours * 60;
    const slackMin = Math.round(deadlineMin - arrivalMin);

    if (slackMin < 5) {
      return { feasible: false, totalDistanceKm: Infinity, stops: [] };
    }

    totalDistanceKm += legDist;
    elapsedMinutes = arrivalMin + SERVICE_TIME_PER_STOP_MIN;
    currLat = stop.latitude;
    currLng = stop.longitude;

    stopDetails.push({
      stop_number: i + 1,
      batch_id: stop.batch_id,
      description: stop.description,
      batch_type: stop.batch_type,
      donor_name: stop.donor_name,
      address: stop.address || stop.pickup_address,
      delivery_city: stop.delivery_city,
      weight_kg: Number(stop.weight_kg),
      latitude: stop.latitude,
      longitude: stop.longitude,
      leg_distance_km: Number(legDist.toFixed(2)),
      cumulative_distance_km: Number(totalDistanceKm.toFixed(2)),
      arrival_eta_minutes: arrivalMin,
      departure_eta_minutes: elapsedMinutes,
      remaining_slack_minutes: slackMin,
      expiry_timestamp: stop.expiry_timestamp
    });
  }

  return {
    feasible: true,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationMinutes: elapsedMinutes,
    stops: stopDetails
  };
};

/**
 * Solves the Capacitated Traveling Salesperson Problem with Time Windows (CTSP-TW)
 * using an Urgency-Weighted Nearest Neighbor constructive heuristic followed by
 * Time-Window-Constrained 2-Opt Local Search.
 */
const optimizePickupRoute = (startCoords, rawBatches, maxCapacityKg = 150) => {
  const now = Date.now();
  const capacityLimit = Math.max(5, parseFloat(maxCapacityKg) || 150);

  // Normalize coordinates and remaining shelf-life for each candidate batch
  const candidates = rawBatches.map(b => {
    const coords = resolveCoordinates(
      b.latitude,
      b.longitude,
      b.delivery_city,
      `${b.batch_id}-${b.address || b.pickup_address || ''}`
    );
    const expiryTime = b.expiry_timestamp ? new Date(b.expiry_timestamp).getTime() : now + 24 * 3600 * 1000;
    const remainingHours = Math.max(0, (expiryTime - now) / (1000 * 3600));
    return {
      ...b,
      weight_kg: parseFloat(b.weight_kg) || 0,
      latitude: coords.latitude,
      longitude: coords.longitude,
      remaining_hours: remainingHours
    };
  }).filter(b => b.remaining_hours > 0.25 && b.weight_kg <= capacityLimit);

  if (candidates.length === 0) {
    return {
      stops: [],
      skipped_batches: rawBatches.length,
      metrics: {
        total_stops: 0,
        total_distance_km: 0,
        naive_distance_km: 0,
        distance_saved_km: 0,
        optimization_improvement_pct: 0,
        total_duration_minutes: 0,
        total_weight_kg: 0,
        capacity_utilization_pct: 0,
        equivalent_meals: 0,
        gross_co2_saved_kg: 0,
        transport_co2_emitted_kg: 0,
        net_co2_saved_kg: 0
      }
    };
  }

  // Phase 1: Urgency-Weighted Nearest Neighbor with Capacity & Time-Window Constraints
  const unvisited = [...candidates];
  const initialSequence = [];
  let currLat = startCoords.latitude;
  let currLng = startCoords.longitude;
  let elapsedMinutes = 0;
  let currentLoadKg = 0;

  while (unvisited.length > 0) {
    let bestIdx = -1;
    let bestCost = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const cand = unvisited[i];
      if (currentLoadKg + cand.weight_kg > capacityLimit) continue;

      const dist = haversineDistanceKm(currLat, currLng, cand.latitude, cand.longitude);
      const travelMin = estimateTravelMinutes(dist);
      const arrivalMin = elapsedMinutes + travelMin;
      const deadlineMin = cand.remaining_hours * 60;

      if (deadlineMin - arrivalMin < 5) continue; // Cannot make it before expiry window

      // Urgency-weighted distance cost: favors nearby stops and stops expiring sooner
      const urgencyFactor = 1 + Math.min(2, cand.remaining_hours / 12);
      const cost = (dist + 0.5) * urgencyFactor;
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const chosen = unvisited.splice(bestIdx, 1)[0];
    const legDist = haversineDistanceKm(currLat, currLng, chosen.latitude, chosen.longitude);
    elapsedMinutes += estimateTravelMinutes(legDist) + SERVICE_TIME_PER_STOP_MIN;
    currentLoadKg += chosen.weight_kg;
    currLat = chosen.latitude;
    currLng = chosen.longitude;
    initialSequence.push(chosen);
  }

  // Compute naive distance (in original input order for the same selected stops) for comparison
  let naiveDistanceKm = 0;
  if (initialSequence.length > 0) {
    const selectedIds = new Set(initialSequence.map(s => s.batch_id));
    const naiveOrder = candidates.filter(c => selectedIds.has(c.batch_id));
    let nLat = startCoords.latitude;
    let nLng = startCoords.longitude;
    for (const s of naiveOrder) {
      naiveDistanceKm += haversineDistanceKm(nLat, nLng, s.latitude, s.longitude);
      nLat = s.latitude;
      nLng = s.longitude;
    }
  }

  // Phase 2: Time-Window-Constrained 2-Opt Local Search
  let bestSequence = [...initialSequence];
  let bestEval = evaluateSequence(startCoords, bestSequence);

  if (bestSequence.length >= 3) {
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 50) {
      improved = false;
      iterations++;
      for (let i = 0; i < bestSequence.length - 1; i++) {
        for (let k = i + 1; k < bestSequence.length; k++) {
          const candidateSeq = [
            ...bestSequence.slice(0, i),
            ...bestSequence.slice(i, k + 1).reverse(),
            ...bestSequence.slice(k + 1)
          ];
          const candEval = evaluateSequence(startCoords, candidateSeq);
          if (candEval.feasible && candEval.totalDistanceKm + 0.01 < bestEval.totalDistanceKm) {
            bestSequence = candidateSeq;
            bestEval = candEval;
            improved = true;
          }
        }
      }
    }
  }

  const totalWeightKg = Number(bestSequence.reduce((acc, s) => acc + s.weight_kg, 0).toFixed(1));
  const finalDistKm = bestEval.totalDistanceKm || 0;
  const roundedNaiveKm = Number(Math.max(finalDistKm, naiveDistanceKm).toFixed(2));
  const distSavedKm = Number(Math.max(0, roundedNaiveKm - finalDistKm).toFixed(2));
  const improvementPct = roundedNaiveKm > 0 ? Number(((distSavedKm / roundedNaiveKm) * 100).toFixed(1)) : 0;

  const grossCo2SavedKg = Number((totalWeightKg * 2.5).toFixed(2));
  const transportCo2Kg = Number((finalDistKm * 0.19).toFixed(2));
  const netCo2SavedKg = Number(Math.max(0, grossCo2SavedKg - transportCo2Kg).toFixed(2));

  return {
    origin: startCoords,
    stops: bestEval.stops,
    skipped_batches: rawBatches.length - bestEval.stops.length,
    algorithm: 'Urgency-Weighted Nearest Neighbor + 2-Opt Local Search (CTSP-TW)',
    metrics: {
      total_stops: bestEval.stops.length,
      total_distance_km: finalDistKm,
      naive_distance_km: roundedNaiveKm,
      distance_saved_km: distSavedKm,
      optimization_improvement_pct: improvementPct,
      total_duration_minutes: bestEval.totalDurationMinutes || 0,
      total_weight_kg: totalWeightKg,
      capacity_limit_kg: capacityLimit,
      capacity_utilization_pct: Number(Math.min(100, (totalWeightKg / capacityLimit) * 100).toFixed(1)),
      equivalent_meals: Math.floor(totalWeightKg / 0.5),
      gross_co2_saved_kg: grossCo2SavedKg,
      transport_co2_emitted_kg: transportCo2Kg,
      net_co2_saved_kg: netCo2SavedKg
    }
  };
};

module.exports = { optimizePickupRoute };
