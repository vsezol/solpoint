"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

const PLANET_RADIUS = 1.4; // Visual radius of the particle planet.
const MOBILE_POINT_COUNT = 800; // Particle count for mobile screens.
const DESKTOP_POINT_COUNT = 2400; // Particle count for desktop screens.
const MOBILE_BREAKPOINT_PX = 768; // Width threshold used to switch particle count.
const BRANCH_FACTOR = 2; // Number of child branches spawned from each node.
const BRANCH_LEVELS = 4; // Maximum depth of the branching tree.
const MAX_EDGES = 40; // Hard cap for generated links in one burst.
const BURST_SAMPLE_POINTS = 26; // Tube geometry detail along each arc.
const ARC_RADIUS_DESKTOP = 0.012; // Arc thickness used on desktop.
const ARC_RADIUS_MOBILE = 0.017; // Arc thickness used on mobile.
const ANIMATION_REPEAT_INTERVAL_SECONDS = 0; // Time between repeated burst animations.
const PLANET_ROTATION_SPEED = 0.05; // Planet rotation speed around Y axis.
const EDGE_DRAW_SECONDS = 0.95; // Draw time for one level of edges.
const BURST_FADE_SECONDS = 0.85; // Fade-out time after drawing completes.
const ARC_BASE_HEIGHT = -0.1; // Base arc height above the planet surface.
const ARC_LENGTH_HEIGHT_MULTIPLIER = 0.95; // Extra height added for longer arcs.
const EDGE_MAX_ANGLE_DEG = 21; // Base maximum spherical angle between connected points.
const EDGE_MIN_ANGLE_DEG = 20; // Base minimum spherical angle between connected points.
const EDGE_LEVEL_ANGLE_MULTIPLIER = 2.5; // Growth factor for jump angle on deeper levels.
const MIN_FORWARD_LONGITUDE_STEP_DEG = 4; // Minimum forward longitude progress per jump.
const MIN_FORWARD_TANGENT_DOT = 0.05; // Forward-direction strictness against backward turns.
const ARC_INTERSECTION_EPSILON_DEG = 0.45; // Tolerance used in arc intersection checks.
const SIBLING_MIN_SEPARATION_DEG = 60; // Minimum angle between sibling branches.
const SIBLING_MAX_SEPARATION_DEG = 120; // Maximum angle between sibling branches.
const SIBLING_SEPARATION_PENALTY = 4.2; // Penalty strength when sibling branches are too close.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // Even-distribution constant for sphere sampling.

type BranchNode = {
  index: number;
  incoming: THREE.Vector3 | null;
};

type BranchEdge = {
  meshIndex: number;
  from: number;
  to: number;
  start: number;
  duration: number;
  arrival: number;
  geometry: THREE.TubeGeometry;
};

type BranchLink = {
  from: number;
  to: number;
  level: number;
};

type BurstState = {
  active: boolean;
  startedAt: number;
  drawEnd: number;
  fadeEnd: number;
  edges: BranchEdge[];
};

function seededRandom(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453123;
  return value - Math.floor(value);
}

function surfaceNoise(x: number, y: number, z: number) {
  const n1 = Math.sin(x * 6.3 + y * 4.1 - z * 5.4);
  const n2 = Math.cos(x * 11.7 - y * 9.1 + z * 8.3);
  const n3 = Math.sin((x + z) * 16.8 + y * 2.6);
  return n1 * 0.5 + n2 * 0.34 + n3 * 0.16 + y * 0.08;
}

function normalizeLongitude(value: number) {
  let longitude = value;
  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;
  return longitude;
}

function wrappedLonDelta(from: number, to: number) {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function angleDegFromDot(dot: number) {
  return (Math.acos(THREE.MathUtils.clamp(dot, -1, 1)) * 180) / Math.PI;
}

function createRng(seed: number) {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function getPointCountByWidth(width: number) {
  return width < MOBILE_BREAKPOINT_PX ? MOBILE_POINT_COUNT : DESKTOP_POINT_COUNT;
}

function getLevelAngleRange(level: number) {
  const scale = 1 + level * (EDGE_LEVEL_ANGLE_MULTIPLIER - 1);
  const maxAngle = Math.min(EDGE_MAX_ANGLE_DEG * scale, 170);
  const minAngle = Math.min(EDGE_MIN_ANGLE_DEG * scale, maxAngle - 1);
  const preferredAngle = (minAngle + maxAngle) * 0.5;
  return { minAngle, maxAngle, preferredAngle };
}

function ParticlePlanet({ pointCount, arcRadius }: { pointCount: number; arcRadius: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const arcMeshesRef = useRef<(THREE.Mesh | null)[]>(Array.from({ length: MAX_EDGES }, () => null));
  const arcMaterialsRef = useRef<(THREE.ShaderMaterial | null)[]>(Array.from({ length: MAX_EDGES }, () => null));
  const burstRef = useRef<BurstState>({
    active: false,
    startedAt: 0,
    drawEnd: 0,
    fadeEnd: 0,
    edges: [],
  });
  const nextSpawnAtRef = useRef(0);
  const burstCounterRef = useRef(0);

  const data = useMemo(() => {
    const positions = new Float32Array(pointCount * 3);
    const baseColors = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    const baseDirections = new Float32Array(pointCount * 3);
    const latitudes = new Float32Array(pointCount);
    const longitudes = new Float32Array(pointCount);
    const burstValues = new Float32Array(pointCount);
    const endpointValues = new Float32Array(pointCount);
    const mixed = new THREE.Color();

    for (let i = 0; i < pointCount; i += 1) {
      const t = i / (pointCount - 1);
      const y = 1 - t * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = GOLDEN_ANGLE * i;
      const jitter = (seededRandom(i * 1.31 + 0.17) - 0.5) * 0.03;
      const x = Math.cos(theta) * radial;
      const z = Math.sin(theta) * radial;
      const direction = new THREE.Vector3(x + jitter, y + jitter * 0.45, z - jitter * 0.65).normalize();
      const noise = surfaceNoise(direction.x, direction.y, direction.z);
      const ridge = Math.sin(direction.x * 5.4 - direction.z * 4.1 + direction.y * 2.8) * 0.22;
      const landMask = noise * 0.74 + ridge + seededRandom(i * 2.77 + 0.9) * 0.14 - 0.09;
      const isLand = landMask > 0;
      const coastMask = THREE.MathUtils.clamp(1 - Math.abs(landMask) / 0.09, 0, 1);
      const polarMask = THREE.MathUtils.smoothstep(Math.abs(direction.y), 0.72, 0.95);
      const radius =
        PLANET_RADIUS +
        (isLand ? 0.016 : -0.005) +
        (seededRandom(i * 4.13 + 0.3) - 0.5) * 0.01;
      const index = i * 3;

      baseDirections[index] = direction.x;
      baseDirections[index + 1] = direction.y;
      baseDirections[index + 2] = direction.z;
      latitudes[i] = (Math.asin(direction.y) * 180) / Math.PI;
      longitudes[i] = normalizeLongitude((Math.atan2(direction.z, -direction.x) * 180) / Math.PI - 180);
      positions[index] = direction.x * radius;
      positions[index + 1] = direction.y * radius;
      positions[index + 2] = direction.z * radius;

      // Solana-colored planet: purple (#9945ff) for land, dark teal for ocean, green (#14f195) accents
      const solGreen = new THREE.Color(0.078, 0.945, 0.584);   // #14f195
      const solPurple = new THREE.Color(0.6, 0.271, 1.0);      // #9945ff
      const solCyan = new THREE.Color(0.0, 0.82, 1.0);         // #00d1ff
      const solDarkPurple = new THREE.Color(0.22, 0.08, 0.45); // deep purple for ocean
      const rnd = seededRandom(i * 5.2 + 0.3);
      if (isLand) {
        // Land: blend between purple and green based on noise
        const blend = THREE.MathUtils.clamp(noise * 0.5 + 0.5 + rnd * 0.2, 0, 1);
        mixed.copy(solPurple).lerp(solGreen, blend * 0.35);
        mixed.lerp(new THREE.Color(1, 1, 1), rnd * 0.06);
      } else {
        // Ocean: dark purple-teal
        mixed.copy(solDarkPurple).lerp(solCyan, rnd * 0.15 + 0.05);
      }
      if (coastMask > 0) {
        mixed.lerp(solGreen, coastMask * 0.3);
      }
      if (polarMask > 0) {
        mixed.lerp(solCyan, polarMask * 0.35);
      }

      baseColors[index] = mixed.r;
      baseColors[index + 1] = mixed.g;
      baseColors[index + 2] = mixed.b;
      colors[index] = mixed.r;
      colors[index + 1] = mixed.g;
      colors[index + 2] = mixed.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aBurst", new THREE.BufferAttribute(burstValues, 1));
    geometry.setAttribute("aEndpoint", new THREE.BufferAttribute(endpointValues, 1));
    geometry.computeBoundingSphere();

    const emptyCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0.001));
    const emptyGeometry = new THREE.TubeGeometry(emptyCurve, 2, arcRadius, 10, false);

    return {
      geometry,
      emptyGeometry,
      positions,
      baseDirections,
      latitudes,
      longitudes,
      baseColors,
      colors,
      burstValues,
      endpointValues,
      colorAttribute: geometry.getAttribute("color") as THREE.BufferAttribute,
      burstAttribute: geometry.getAttribute("aBurst") as THREE.BufferAttribute,
      endpointAttribute: geometry.getAttribute("aEndpoint") as THREE.BufferAttribute,
    };
  }, [arcRadius, pointCount]);

  const colorsRef = useRef(data.colors);
  const burstValuesRef = useRef(data.burstValues);
  const endpointValuesRef = useRef(data.endpointValues);
  const burstTargetsRef = useRef(new Float32Array(pointCount));
  const endpointTargetsRef = useRef(new Float32Array(pointCount));
  const colorAttributeRef = useRef(data.colorAttribute);
  const burstAttributeRef = useRef(data.burstAttribute);
  const endpointAttributeRef = useRef(data.endpointAttribute);
  const pointUniforms = useMemo(
    () => ({
      uPixelRatio: {
        value: typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 2),
      },
      uBaseSize: { value: 6.8 },
    }),
    []
  );

  const makeTangent = (fromIndex: number, toIndex: number) => {
    const fromOffset = fromIndex * 3;
    const toOffset = toIndex * 3;
    const fromX = data.baseDirections[fromOffset];
    const fromY = data.baseDirections[fromOffset + 1];
    const fromZ = data.baseDirections[fromOffset + 2];
    const toX = data.baseDirections[toOffset];
    const toY = data.baseDirections[toOffset + 1];
    const toZ = data.baseDirections[toOffset + 2];
    const dot = fromX * toX + fromY * toY + fromZ * toZ;
    const tx = toX - fromX * dot;
    const ty = toY - fromY * dot;
    const tz = toZ - fromZ * dot;
    const length = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (length < 1e-6) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(tx / length, ty / length, tz / length);
  };

  const getDirectionVector = (index: number) => {
    const offset = index * 3;
    return new THREE.Vector3(
      data.baseDirections[offset],
      data.baseDirections[offset + 1],
      data.baseDirections[offset + 2]
    );
  };

  const isPointOnMinorArc = (point: THREE.Vector3, arcStart: THREE.Vector3, arcEnd: THREE.Vector3) => {
    const arcAngle = angleDegFromDot(arcStart.dot(arcEnd));
    const startToPoint = angleDegFromDot(arcStart.dot(point));
    const pointToEnd = angleDegFromDot(point.dot(arcEnd));
    return Math.abs(startToPoint + pointToEnd - arcAngle) <= ARC_INTERSECTION_EPSILON_DEG;
  };

  const doSphericalSegmentsIntersect = (
    aStart: THREE.Vector3,
    aEnd: THREE.Vector3,
    bStart: THREE.Vector3,
    bEnd: THREE.Vector3
  ) => {
    const normalA = new THREE.Vector3().crossVectors(aStart, aEnd);
    const normalB = new THREE.Vector3().crossVectors(bStart, bEnd);
    if (normalA.lengthSq() < 1e-7 || normalB.lengthSq() < 1e-7) return false;
    normalA.normalize();
    normalB.normalize();

    const intersectionAxis = new THREE.Vector3().crossVectors(normalA, normalB);
    if (intersectionAxis.lengthSq() < 1e-9) return false;

    const intersectionA = intersectionAxis.normalize();
    const intersectionB = intersectionA.clone().multiplyScalar(-1);

    const crossesOnA =
      isPointOnMinorArc(intersectionA, aStart, aEnd) && isPointOnMinorArc(intersectionA, bStart, bEnd);
    if (crossesOnA) return true;

    return isPointOnMinorArc(intersectionB, aStart, aEnd) && isPointOnMinorArc(intersectionB, bStart, bEnd);
  };

  const doesCandidateEdgeIntersectExisting = (from: number, to: number, existingLinks: BranchLink[]) => {
    const candidateStart = getDirectionVector(from);
    const candidateEnd = getDirectionVector(to);

    for (let i = 0; i < existingLinks.length; i += 1) {
      const edge = existingLinks[i];
      if (edge.from === from || edge.to === from || edge.from === to || edge.to === to) continue;

      const edgeStart = getDirectionVector(edge.from);
      const edgeEnd = getDirectionVector(edge.to);
      if (doSphericalSegmentsIntersect(candidateStart, candidateEnd, edgeStart, edgeEnd)) {
        return true;
      }
    }

    return false;
  };

  const chooseNextPoint = (
    parentIndex: number,
    incoming: THREE.Vector3 | null,
    used: Set<number>,
    siblings: number[],
    rng: () => number,
    targetLatitude: number,
    targetLongitude: number,
    minAngleDeg: number,
    maxAngleDeg: number,
    preferredAngleDeg: number,
    directionSign: number,
    existingLinks: BranchLink[]
  ) => {
    let bestIndex = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    const parentOffset = parentIndex * 3;
    const parentX = data.baseDirections[parentOffset];
    const parentY = data.baseDirections[parentOffset + 1];
    const parentZ = data.baseDirections[parentOffset + 2];

    for (let attempt = 0; attempt < 820; attempt += 1) {
      const candidate = Math.floor(rng() * pointCount);
      if (used.has(candidate)) continue;

      const candidateOffset = candidate * 3;
      const candidateX = data.baseDirections[candidateOffset];
      const candidateY = data.baseDirections[candidateOffset + 1];
      const candidateZ = data.baseDirections[candidateOffset + 2];

      const dot = parentX * candidateX + parentY * candidateY + parentZ * candidateZ;
      const angleDeg = angleDegFromDot(dot);
      if (angleDeg < minAngleDeg || angleDeg > maxAngleDeg) continue;

      const deltaLongitude = wrappedLonDelta(data.longitudes[parentIndex], data.longitudes[candidate]);
      const forwardLongitude = deltaLongitude * directionSign;
      if (forwardLongitude < MIN_FORWARD_LONGITUDE_STEP_DEG) continue;

      const tangent = makeTangent(parentIndex, candidate);
      if (incoming && tangent.dot(incoming) < MIN_FORWARD_TANGENT_DOT) continue;
      if (doesCandidateEdgeIntersectExisting(parentIndex, candidate, existingLinks)) continue;

      let siblingPenalty = 0;
      for (let i = 0; i < siblings.length; i += 1) {
        const siblingOffset = siblings[i] * 3;
        const siblingDot =
          candidateX * data.baseDirections[siblingOffset] +
          candidateY * data.baseDirections[siblingOffset + 1] +
          candidateZ * data.baseDirections[siblingOffset + 2];
        const siblingAngle = angleDegFromDot(siblingDot);
        if (siblingAngle < SIBLING_MIN_SEPARATION_DEG) {
          siblingPenalty +=
            (SIBLING_MIN_SEPARATION_DEG - siblingAngle) * SIBLING_SEPARATION_PENALTY;
        }
        if (siblingAngle > SIBLING_MAX_SEPARATION_DEG) {
          siblingPenalty +=
            (siblingAngle - SIBLING_MAX_SEPARATION_DEG) * SIBLING_SEPARATION_PENALTY;
        }
      }

      const longitudeError = Math.abs(wrappedLonDelta(targetLongitude, data.longitudes[candidate]));
      const latitudeError = Math.abs(targetLatitude - data.latitudes[candidate]);
      const spreadBias = Math.abs(deltaLongitude) * 0.2;
      const forwardBias = forwardLongitude * 0.22;
      const score =
        Math.abs(angleDeg - preferredAngleDeg) * 0.8 +
        longitudeError * 0.7 +
        latitudeError * 0.9 +
        siblingPenalty -
        spreadBias -
        forwardBias;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = candidate;
      }
    }

    return bestIndex;
  };

  const pickAnyNearbyPoint = (
    parentIndex: number,
    used: Set<number>,
    rng: () => number,
    minAngleDeg: number,
    maxAngleDeg: number,
    directionSign: number,
    existingLinks: BranchLink[]
  ) => {
    const parentOffset = parentIndex * 3;
    const parentX = data.baseDirections[parentOffset];
    const parentY = data.baseDirections[parentOffset + 1];
    const parentZ = data.baseDirections[parentOffset + 2];

    for (let attempt = 0; attempt < 980; attempt += 1) {
      const candidate = Math.floor(rng() * pointCount);
      if (used.has(candidate)) continue;
      const candidateOffset = candidate * 3;
      const dot =
        parentX * data.baseDirections[candidateOffset] +
        parentY * data.baseDirections[candidateOffset + 1] +
        parentZ * data.baseDirections[candidateOffset + 2];
      const angleDeg = angleDegFromDot(dot);
      const deltaLongitude = wrappedLonDelta(data.longitudes[parentIndex], data.longitudes[candidate]);
      const forwardLongitude = deltaLongitude * directionSign;
      if (angleDeg >= minAngleDeg && angleDeg <= maxAngleDeg && forwardLongitude >= MIN_FORWARD_LONGITUDE_STEP_DEG) {
        if (doesCandidateEdgeIntersectExisting(parentIndex, candidate, existingLinks)) continue;
        return candidate;
      }
    }

    return -1;
  };

  const chooseBurstLinks = (burstIndex: number) => {
    const seedBase = (burstIndex + 1) * 2654435761;
    const rng = createRng(seedBase);
    const phase = (burstIndex * 0.61803398875) % 1;
    const rootIndex = Math.floor((phase < 0 ? phase + 1 : phase) * pointCount);
    const direction = burstIndex % 2 === 0 ? 1 : -1;
    const links: BranchLink[] = [];
    const used = new Set<number>([rootIndex]);

    const firstLongitude = normalizeLongitude(data.longitudes[rootIndex] + direction * (46 + rng() * 18));
    const firstLatitude = THREE.MathUtils.clamp(data.latitudes[rootIndex] + (rng() - 0.5) * 18, -70, 70);
    const firstRange = getLevelAngleRange(0);
    let first = chooseNextPoint(
      rootIndex,
      null,
      used,
      [],
      rng,
      firstLatitude,
      firstLongitude,
      firstRange.minAngle,
      firstRange.maxAngle,
      firstRange.preferredAngle,
      direction,
      links
    );
    if (first === -1) {
      first = pickAnyNearbyPoint(rootIndex, used, rng, firstRange.minAngle, firstRange.maxAngle, direction, links);
    }
    if (first === -1) return links;
    used.add(first);
    links.push({ from: rootIndex, to: first, level: 0 });

    let frontier: BranchNode[] = [{ index: first, incoming: makeTangent(rootIndex, first) }];

    for (let level = 1; level < BRANCH_LEVELS; level += 1) {
      if (frontier.length === 0 || links.length >= MAX_EDGES) break;
      const nextFrontier: BranchNode[] = [];

      for (let i = 0; i < frontier.length; i += 1) {
        if (links.length >= MAX_EDGES) break;
        const parent = frontier[i];
        const siblings: number[] = [];

        for (let branch = 0; branch < BRANCH_FACTOR; branch += 1) {
          if (links.length >= MAX_EDGES) break;
          const angleRange = getLevelAngleRange(level);
          const targetLongitude = normalizeLongitude(
            data.longitudes[parent.index] + direction * (28 + level * 8 + branch * 14 + rng() * 12)
          );
          const targetLatitude = THREE.MathUtils.clamp(
            data.latitudes[parent.index] + Math.sin(level * 1.07 + branch * 0.9 + burstIndex * 0.2) * 14,
            -72,
            72
          );

          let child = chooseNextPoint(
            parent.index,
            parent.incoming,
            used,
            siblings,
            rng,
            targetLatitude,
            targetLongitude,
            angleRange.minAngle,
            angleRange.maxAngle,
            angleRange.preferredAngle,
            direction,
            links
          );

          if (child === -1) {
            child = pickAnyNearbyPoint(
              parent.index,
              used,
              rng,
              angleRange.minAngle,
              angleRange.maxAngle,
              direction,
              links
            );
          }

          if (child === -1) continue;
          used.add(child);
          siblings.push(child);
          links.push({ from: parent.index, to: child, level });
          nextFrontier.push({
            index: child,
            incoming: makeTangent(parent.index, child),
          });
        }
      }

      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    return links;
  };

  const buildBurstEdges = (links: BranchLink[]) => {
    const edges: BranchEdge[] = [];

    for (let i = 0; i < links.length; i += 1) {
      const link = links[i];
      const from = link.from;
      const to = link.to;
      const fromOffset = from * 3;
      const toOffset = to * 3;
      const start = new THREE.Vector3(
        data.positions[fromOffset],
        data.positions[fromOffset + 1],
        data.positions[fromOffset + 2]
      );
      const end = new THREE.Vector3(
        data.positions[toOffset],
        data.positions[toOffset + 1],
        data.positions[toOffset + 2]
      );
      const chord = start.distanceTo(end);
      const normalizedChord = THREE.MathUtils.clamp(chord / (PLANET_RADIUS * 1.4), 0, 1);
      const lengthHeightBoost = normalizedChord * ARC_LENGTH_HEIGHT_MULTIPLIER;
      const controlHeight = PLANET_RADIUS + ARC_BASE_HEIGHT + (1 - normalizedChord) * 0.62 + lengthHeightBoost;
      const middleNormal = start.clone().add(end).multiplyScalar(0.5).normalize();
      const tangent = end.clone().sub(start).normalize();
      const side = new THREE.Vector3().crossVectors(middleNormal, tangent);
      if (side.lengthSq() < 1e-5) side.set(0, 1, 0);
      else side.normalize();
      const sideOffset = side.multiplyScalar(
        (0.08 + (1 - normalizedChord) * 0.1) * ((link.level + i) % 2 === 0 ? 1 : -1)
      );
      const control = middleNormal.multiplyScalar(controlHeight).add(sideOffset);
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      const geometry = new THREE.TubeGeometry(curve, BURST_SAMPLE_POINTS, arcRadius, 10, false);

      const edgeStart = link.level * EDGE_DRAW_SECONDS;
      edges.push({
        meshIndex: i,
        from,
        to,
        start: edgeStart,
        duration: EDGE_DRAW_SECONDS,
        arrival: edgeStart + EDGE_DRAW_SECONDS,
        geometry,
      });
    }

    return edges;
  };

  const startBurst = (now: number, burstIndex: number) => {
    const existing = burstRef.current;
    if (existing.active) {
      for (let i = 0; i < existing.edges.length; i += 1) {
        existing.edges[i].geometry.dispose();
      }
    }

    for (let i = 0; i < MAX_EDGES; i += 1) {
      const mesh = arcMeshesRef.current[i];
      if (mesh) mesh.visible = false;
      const material = arcMaterialsRef.current[i];
      if (material) {
        material.uniforms.uProgress.value = 0;
        material.uniforms.uOpacity.value = 0;
      }
    }

    const links = chooseBurstLinks(burstIndex);
    const edges = buildBurstEdges(links);

    for (let i = 0; i < edges.length; i += 1) {
      const edge = edges[i];
      const mesh = arcMeshesRef.current[edge.meshIndex];
      if (mesh) {
        mesh.geometry = edge.geometry;
        mesh.visible = false;
      }
    }

    const drawEnd =
      edges.length > 0
        ? edges.reduce((max, edge) => (edge.arrival > max ? edge.arrival : max), 0)
        : 0;
    burstRef.current = {
      active: true,
      startedAt: now,
      drawEnd,
      fadeEnd: drawEnd + BURST_FADE_SECONDS,
      edges,
    };
  };

  useEffect(() => {
    return () => {
      data.geometry.dispose();
      data.emptyGeometry.dispose();
      const burst = burstRef.current;
      for (let i = 0; i < burst.edges.length; i += 1) {
        burst.edges[i].geometry.dispose();
      }
    };
  }, [data.emptyGeometry, data.geometry]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    group.rotation.y += delta * PLANET_ROTATION_SPEED;
    if (pointMaterialRef.current) {
      pointMaterialRef.current.uniforms.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 2);
    }

    if (!burstRef.current.active && state.clock.elapsedTime >= nextSpawnAtRef.current) {
      startBurst(state.clock.elapsedTime, burstCounterRef.current);
      burstCounterRef.current += 1;
      nextSpawnAtRef.current = state.clock.elapsedTime + ANIMATION_REPEAT_INTERVAL_SECONDS;
    }

    const burstTargets = burstTargetsRef.current;
    const endpointTargets = endpointTargetsRef.current;
    burstTargets.fill(0);
    endpointTargets.fill(0);

    const burst = burstRef.current;
    if (burst.active) {
      const elapsed = state.clock.elapsedTime - burst.startedAt;
      if (elapsed >= burst.fadeEnd) {
        for (let i = 0; i < burst.edges.length; i += 1) {
          const edge = burst.edges[i];
          edge.geometry.dispose();
          const mesh = arcMeshesRef.current[edge.meshIndex];
          if (mesh) mesh.visible = false;
        }
        burst.active = false;
        burst.edges = [];
      } else {
        const globalOpacity =
          elapsed <= burst.drawEnd
            ? 1
            : THREE.MathUtils.clamp(1 - (elapsed - burst.drawEnd) / BURST_FADE_SECONDS, 0, 1);

        for (let i = 0; i < burst.edges.length; i += 1) {
          const edge = burst.edges[i];
          const localElapsed = elapsed - edge.start;
          const mesh = arcMeshesRef.current[edge.meshIndex];
          const material = arcMaterialsRef.current[edge.meshIndex];
          if (!mesh || !material) continue;

          if (localElapsed < 0) {
            mesh.visible = false;
            continue;
          }

          mesh.visible = true;
          const progress = THREE.MathUtils.clamp(localElapsed / edge.duration, 0, 1);
          material.uniforms.uProgress.value = progress;
          material.uniforms.uOpacity.value = globalOpacity;

          const passed = localElapsed - edge.duration;
          const toPulse = passed < 0 ? 0 : Math.max(0, 1 - passed / 0.55) * globalOpacity;
          const fromPulse = Math.max(0, 0.16 - Math.abs(localElapsed) * 0.5) * globalOpacity;
          burstTargets[edge.from] = Math.max(burstTargets[edge.from], fromPulse);
          burstTargets[edge.to] = Math.max(burstTargets[edge.to], toPulse * 0.78);
          endpointTargets[edge.to] = Math.max(endpointTargets[edge.to], toPulse);
        }
      }
    }

    const colors = colorsRef.current;
    const burstValues = burstValuesRef.current;
    const endpointValues = endpointValuesRef.current;

    for (let i = 0; i < pointCount; i += 1) {
      const i3 = i * 3;
      const burstCurrent = burstValues[i];
      const burstTarget = burstTargets[i];
      const burstNext =
        burstTarget > burstCurrent
          ? THREE.MathUtils.lerp(burstCurrent, burstTarget, 0.48)
          : THREE.MathUtils.lerp(burstCurrent, burstTarget, 0.16);
      burstValues[i] = burstNext;

      const endpointCurrent = endpointValues[i];
      const endpointTarget = endpointTargets[i];
      const endpointNext =
        endpointTarget > endpointCurrent
          ? THREE.MathUtils.lerp(endpointCurrent, endpointTarget, 0.52)
          : THREE.MathUtils.lerp(endpointCurrent, endpointTarget, 0.18);
      endpointValues[i] = endpointNext;

      const baseR = data.baseColors[i3];
      const baseG = data.baseColors[i3 + 1];
      const baseB = data.baseColors[i3 + 2];
      colors[i3] = Math.min(1, baseR + burstNext * 0.18 + endpointNext * 0.24);
      colors[i3 + 1] = Math.min(1, baseG + burstNext * 0.24 + endpointNext * 0.88);
      colors[i3 + 2] = Math.min(1, baseB + burstNext * 0.3 + endpointNext * 0.16);
    }

    colorAttributeRef.current.needsUpdate = true;
    burstAttributeRef.current.needsUpdate = true;
    endpointAttributeRef.current.needsUpdate = true;
  });

  return (
    <group ref={groupRef} rotation={[-0.08, 0, 0]}>
      <points geometry={data.geometry}>
        <shaderMaterial
          ref={pointMaterialRef}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            uniform float uPixelRatio;
            uniform float uBaseSize;
            attribute vec3 color;
            attribute float aBurst;
            attribute float aEndpoint;
            varying vec3 vColor;
            varying float vBurst;
            varying float vEndpoint;

            void main() {
              vColor = color;
              vBurst = aBurst;
              vEndpoint = aEndpoint;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              float pointSize = (uBaseSize + aBurst * 3.6 + aEndpoint * 20.0) * uPixelRatio * (4.0 / -mvPosition.z);
              gl_PointSize = clamp(pointSize, 2.0, 21.0);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            varying float vBurst;
            varying float vEndpoint;

            void main() {
              vec2 uv = gl_PointCoord * 2.0 - 1.0;
              float r2 = dot(uv, uv);
              if (r2 > 1.0) discard;

              float z = sqrt(1.0 - r2);
              vec3 normal = normalize(vec3(uv, z));
              vec3 lightDir = normalize(vec3(-0.35, 0.45, 1.0));
              float diffuse = 0.84 + max(dot(normal, lightDir), 0.0) * 0.28;
              float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 11.0);

              vec3 shaded = vColor * diffuse;
              shaded += vec3(0.92, 0.97, 1.0) * specular * 0.13;
              shaded += vec3(0.35, 0.86, 1.0) * vBurst * 0.26;
              shaded += vec3(0.2, 1.0, 0.46) * vEndpoint * 1.12;
              float alpha = smoothstep(1.0, 0.66, r2) * (0.88 + vBurst * 0.08 + vEndpoint * 0.24);
              gl_FragColor = vec4(shaded, alpha);
            }
          `}
        />
      </points>
      {Array.from({ length: MAX_EDGES }, (_, slot) => (
        <mesh
          key={slot}
          visible={false}
          geometry={data.emptyGeometry}
          ref={(instance) => {
            arcMeshesRef.current[slot] = instance;
          }}
        >
          <shaderMaterial
            ref={(instance) => {
              arcMaterialsRef.current[slot] = instance;
            }}
            uniforms={{ uProgress: { value: 0 }, uOpacity: { value: 0 } }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform float uProgress;
              uniform float uOpacity;
              varying vec2 vUv;

              void main() {
                if (vUv.x > uProgress) discard;
                vec3 color = mix(vec3(0.078, 0.945, 0.584), vec3(0.6, 0.271, 1.0), vUv.x);
                float alpha = 0.78 * uOpacity;
                gl_FragColor = vec4(color, alpha);
              }
            `}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ pointCount, arcRadius }: { pointCount: number; arcRadius: number }) {
  return (
    <>
      <ambientLight intensity={0.38} />
      <directionalLight position={[2.8, 2.4, 3.6]} intensity={0.95} color="#ffffff" />
      <pointLight position={[-2.8, -2.2, -3.2]} intensity={0.62} color="#66f2ff" />
      <pointLight position={[2.2, 2.4, 2.1]} intensity={0.58} color="#93a9ff" />
      <ParticlePlanet pointCount={pointCount} arcRadius={arcRadius} />
    </>
  );
}

interface RotatingPlanetCanvasProps {
  className?: string;
}

export function RotatingPlanetCanvas({ className }: RotatingPlanetCanvasProps) {
  const [pointCount, setPointCount] = useState(() => {
    if (typeof window === "undefined") return DESKTOP_POINT_COUNT;
    return getPointCountByWidth(window.innerWidth);
  });
  const arcRadius = pointCount === MOBILE_POINT_COUNT ? ARC_RADIUS_MOBILE : ARC_RADIUS_DESKTOP;

  useEffect(() => {
    const updatePointCount = () => {
      const nextCount = getPointCountByWidth(window.innerWidth);
      setPointCount((currentCount) => (currentCount === nextCount ? currentCount : nextCount));
    };

    updatePointCount();
    window.addEventListener("resize", updatePointCount);
    return () => window.removeEventListener("resize", updatePointCount);
  }, []);

  return (
    <div className={cn("h-full w-full", className)}>
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5.65], fov: 43 }}
        dpr={[1, 2]}
      >
        <Scene key={pointCount} pointCount={pointCount} arcRadius={arcRadius} />
      </Canvas>
    </div>
  );
}
