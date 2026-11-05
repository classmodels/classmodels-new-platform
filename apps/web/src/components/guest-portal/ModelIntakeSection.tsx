'use client';

import { useEffect, useRef, useState } from 'react';
import type { MeasureRow, ModelReport } from '@/lib/model-analyse';
import { NieuwAlertDialog } from '@/components/nieuw/NieuwAlertDialog';
import { useAuth } from '@/context/auth-context';

type Kind = 'full' | 'face' | 'side';

type Shot = {
  url: string;
  width: number;
  height: number;
  ok: boolean;
  fit: number;
  message: string;
  points: Array<{ x: number; y: number; visibility?: number }> | null;
  eyeLine: Array<{ x: number; y: number }> | null;
  lines: string[];
};

const EMPTY: Record<Kind, Shot | null> = { full: null, face: null, side: null };

const COPY: Record<Kind, { title: string; hint: string; guide: string }> = {
  full: {
    title: 'Ten voeten uit',
    hint: 'Recht van voren, armen licht los. Kruin en beide voeten volledig in beeld.',
    guide: '/nieuw/meting-lichaam.svg',
  },
  face: {
    title: 'Gezicht',
    hint: 'Recht van voren, blik horizontaal. Voorhoofd, oren en kin vrij, zonder filter.',
    guide: '/nieuw/meting-gezicht.svg',
  },
  side: {
    title: 'Zijaanzicht',
    hint: 'Hoofd recht, haren naar achteren. Voorhoofd, neus, lippen en kin vrij.',
    guide: '/nieuw/meting-zij.svg',
  },
};

let faceModel: Promise<unknown> | null = null;
let poseModel: Promise<unknown> | null = null;

async function vision() {
  const url = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm';
  return import(/* webpackIgnore: true */ url) as Promise<{
    FaceLandmarker: { createFromOptions: (files: unknown, options: unknown) => Promise<unknown> };
    PoseLandmarker: { createFromOptions: (files: unknown, options: unknown) => Promise<unknown> };
    FilesetResolver: { forVisionTasks: (url: string) => Promise<unknown> };
  }>;
}

async function detector(kind: 'face' | 'pose') {
  if (kind === 'face' && faceModel) return faceModel;
  if (kind === 'pose' && poseModel) return poseModel;
  const pending = (async () => {
    const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await vision();
    const files = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
    );
    if (kind === 'face') {
      return FaceLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    }
    return PoseLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      numPoses: 1,
    });
  })();
  if (kind === 'face') faceModel = pending;
  else poseModel = pending;
  return pending;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('foto'));
    img.src = URL.createObjectURL(file);
  });
}

function seen(p?: { x: number; y: number; visibility?: number }, edge = 0.02) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  if ((p.visibility ?? 1) < 0.5) return false;
  return p.x > edge && p.x < 1 - edge && p.y > edge && p.y < 1 - edge;
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
  w: number,
  h: number,
) {
  return Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
}

function assessFull(points: NonNullable<Shot['points']>, heightCm: number, w: number, h: number) {
  const head = seen(points[0], 0.01);
  const leftFoot = [27, 29, 31].some((i) => seen(points[i], 0.01));
  const rightFoot = [28, 30, 32].some((i) => seen(points[i], 0.01));
  const body = [11, 12, 23, 24].every((i) => seen(points[i], 0.01));
  const footY = Math.max(...[27, 28, 29, 30, 31, 32].map((i) => points[i]?.y ?? 0));
  const span = footY - (points[0]?.y ?? 1);
  const ok = head && leftFoot && rightFoot && body && span > 0.45;
  const lines: string[] = [];
  if (ok && heightCm >= 100 && heightCm <= 240 && points[0] && points[11] && points[12]) {
    const bodyPx = span * h;
    const cm = heightCm / bodyPx;
    const shoulder = dist(points[11], points[12], w, h) * cm;
    if (points[23] && points[24]) {
      const hip = dist(points[23], points[24], w, h) * cm;
      lines.push(`Schouderbreedte ± ${shoulder.toFixed(0)} cm`);
      lines.push(`Heupbreedte ± ${hip.toFixed(0)} cm`);
    }
    lines.push('Schaal: van kruin tot voeten, op jouw lengte.');
  }
  return {
    ok,
    fit: ok ? 100 : head || body ? 48 : 20,
    message: ok
      ? 'Zakelijk en volledig: hoofd, romp en beide voeten staan in beeld.'
      : 'Het hele lichaam moet zichtbaar zijn, van de kruin tot beide blote of geschoeide voeten. Ga verder van de camera staan.',
    lines,
  };
}

function pairScore(
  points: NonNullable<Shot['points']>,
  left: number,
  right: number,
  mid: number,
  top: number,
  bottom: number,
) {
  const faceH = Math.hypot(points[top].x - points[bottom].x, points[top].y - points[bottom].y) || 1;
  const dl = Math.abs(points[left].x - points[mid].x);
  const dr = Math.abs(points[right].x - points[mid].x);
  const balance = 100 - Math.min(100, (Math.abs(dl - dr) / Math.max(dl, dr, 0.0001)) * 100);
  const level = 100 - Math.min(100, (Math.abs(points[left].y - points[right].y) / faceH) * 140);
  return Math.round(balance * 0.55 + level * 0.45);
}

function assessFace(points: NonNullable<Shot['points']>, w: number, h: number) {
  const need = [10, 152, 1, 33, 263, 61, 291, 234, 454];
  if (!need.every((i) => points[i] && points[i].x > 0.04 && points[i].x < 0.96)) {
    return { ok: false, fit: 36, message: 'Het gezicht moet volledig in beeld: voorhoofd, beide wangen en kin.', lines: [] as string[] };
  }
  const eyes = pairScore(points, 33, 263, 1, 10, 152);
  const mouth = pairScore(points, 61, 291, 1, 10, 152);
  const jaw = pairScore(points, 234, 454, 1, 10, 152);
  const overall = Math.round((eyes + mouth + jaw) / 3);
  const faceW = dist(points[234], points[454], w, h);
  const faceH = dist(points[10], points[152], w, h);
  const ratio = faceW > 0 ? faceH / faceW : 0;
  return {
    ok: true,
    fit: 100,
    message: 'Gezicht recht van voren. De lijnen tonen de symmetrie.',
    lines: [
      `Symmetrie ogen ${eyes}%`,
      `Symmetrie mond ${mouth}%`,
      `Symmetrie wangen ${jaw}%`,
      `Totaal ${overall}%`,
      `Gezichtsverhouding hoogte/breedte ${ratio.toFixed(2)}`,
    ],
  };
}

function assessSide(points: NonNullable<Shot['points']>) {
  const need = [10, 1, 152, 234, 454];
  if (!need.every((i) => points[i])) {
    return { ok: false, fit: 28, message: 'Geen duidelijk zijaanzicht. Draai het hoofd zuiver opzij.', lines: [] as string[] };
  }
  const left = Math.hypot(points[1].x - points[234].x, points[1].y - points[234].y);
  const right = Math.hypot(points[1].x - points[454].x, points[1].y - points[454].y);
  const turn = Math.abs(left - right) / Math.max(0.001, left + right);
  if (turn < 0.28) {
    return { ok: false, fit: 44, message: 'Dit is nog te veel van voren of in driekwart. Maak een zuiver profiel.', lines: [] as string[] };
  }
  return {
    ok: true,
    fit: 100,
    message: 'Profiel herkend: voorhoofd, neus en kin zijn bruikbaar.',
    lines: ['Zijaanzicht aanvaard', 'Voorhoofd, neus en kin in beeld'],
  };
}

function meanPoint(points: NonNullable<Shot['points']>, ids: number[]) {
  const found = ids.map((id) => points[id]).filter((point) => point && Number.isFinite(point.x));
  if (!found.length) return null;
  return {
    x: found.reduce((sum, point) => sum + point.x, 0) / found.length,
    y: found.reduce((sum, point) => sum + point.y, 0) / found.length,
  };
}

function betweenEyes(points: NonNullable<Shot['points']>) {
  const left = meanPoint(points, [33, 133]);
  const right = meanPoint(points, [263, 362]);
  return left && right ? [left, right] : null;
}

function eyeToEar(points: NonNullable<Shot['points']>) {
  const nose = points[1];
  const leftEye = meanPoint(points, [33, 133, 159, 145]);
  const rightEye = meanPoint(points, [263, 362, 386, 374]);
  const leftEar = points[234];
  const rightEar = points[454];
  if (!nose || !leftEye || !rightEye || !leftEar || !rightEar) return null;
  const leftDist = Math.hypot(leftEye.x - nose.x, leftEye.y - nose.y);
  const rightDist = Math.hypot(rightEye.x - nose.x, rightEye.y - nose.y);
  return leftDist > rightDist ? [leftEye, leftEar] : [rightEye, rightEar];
}

async function inspect(kind: Kind, img: HTMLImageElement, heightCm: number): Promise<Omit<Shot, 'url' | 'width' | 'height'>> {
  const small = document.createElement('canvas');
  const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  small.width = Math.max(2, Math.round(img.naturalWidth * scale));
  small.height = Math.max(2, Math.round(img.naturalHeight * scale));
  small.getContext('2d')!.drawImage(img, 0, 0, small.width, small.height);
  if (kind === 'full') {
    const pose = (await detector('pose')) as { detect: (c: HTMLCanvasElement) => { landmarks?: Shot['points'][] } };
    const found = pose.detect(small).landmarks?.[0] ?? null;
    if (!found) {
      return { ok: false, fit: 0, message: 'Geen volledig lichaam gevonden. Sta recht, armen licht los, van hoofd tot voeten.', points: null, eyeLine: null, lines: [] };
    }
    let eyeLine: Shot['eyeLine'] = null;
    try {
      const face = (await detector('face')) as { detect: (c: HTMLCanvasElement) => { faceLandmarks?: Shot['points'][] } };
      eyeLine = betweenEyes(face.detect(small).faceLandmarks?.[0] ?? []);
    } catch {
      eyeLine = null;
    }
    const judged = assessFull(found, heightCm, img.naturalWidth, img.naturalHeight);
    return { ...judged, points: found, eyeLine };
  }
  const face = (await detector('face')) as { detect: (c: HTMLCanvasElement) => { faceLandmarks?: Shot['points'][] } };
  const found = face.detect(small).faceLandmarks?.[0] ?? null;
  if (!found) {
    return { ok: false, fit: 0, message: 'Geen gezicht gevonden. Gebruik een close-up zonder zonnebril of filter.', points: null, eyeLine: null, lines: [] };
  }
  const judged = kind === 'face' ? assessFace(found, img.naturalWidth, img.naturalHeight) : assessSide(found);
  return { ...judged, points: found, eyeLine: kind === 'side' ? eyeToEar(found) : betweenEyes(found) };
}

function draw(canvas: HTMLCanvasElement, img: HTMLImageElement, kind: Kind, points: Shot['points'], eyeLine: Shot['eyeLine']) {
  const box = canvas.parentElement?.getBoundingClientRect();
  if (!box) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(box.width * ratio));
  canvas.height = Math.max(1, Math.round(box.height * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx || !points) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const fit = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
  const w = img.naturalWidth * fit;
  const h = img.naturalHeight * fit;
  const ox = (box.width - w) / 2;
  const oy = (box.height - h) / 2;
  const pt = (i: number) => ({ x: ox + points[i].x * w, y: oy + points[i].y * h });
  const unit = Math.max(1, Math.min(w, h) / 520);
  const trace = (ids: number[]) => {
    if (!ids.every((id) => points[id])) return false;
    ctx.beginPath();
    ids.forEach((id, i) => {
      const p = pt(id);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    return true;
  };
  const wire = (ids: number[], inner: string) => {
    if (!trace(ids)) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.78)';
    ctx.lineWidth = 2.8 * unit;
    ctx.stroke();
    ctx.strokeStyle = inner;
    ctx.lineWidth = 1.15 * unit;
    ctx.stroke();
  };
  const ring = (id: number) => {
    if (!points[id]) return;
    const p = pt(id);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.arc(p.x, p.y, 4.6 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#b34b2b';
    ctx.arc(p.x, p.y, 2.5 * unit, 0, Math.PI * 2);
    ctx.fill();
  };
  if (kind === 'face') {
    const outline = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
    for (const ids of [outline, [70, 63, 105, 66, 107, 9, 336, 296, 334, 293, 300], [10, 9], [67, 105], [297, 334], [127, 356], [234, 454], [127, 152, 356], [33, 1, 263], [33, 152, 263], [61, 291], [133, 362], [172, 397]]) {
      wire(ids, ids === outline ? 'rgba(124,69,47,.95)' : 'rgba(91,94,82,.95)');
    }
    for (const id of [10, 109, 338, 67, 297, 9, 127, 356, 33, 263, 234, 454, 152, 1, 61, 291]) ring(id);
    if (points[10] && points[152] && points[127] && points[109] && points[338] && points[356]) {
      const top = pt(10);
      const chin = pt(152);
      const crown = { x: top.x, y: Math.max(oy + 3, top.y - Math.abs(chin.y - top.y) * 0.1) };
      const a = pt(127);
      const b = pt(109);
      const c = pt(338);
      const d = pt(356);
      ctx.save();
      ctx.setLineDash([4 * unit, 3 * unit]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(b.x, crown.y, crown.x, crown.y);
      ctx.quadraticCurveTo(c.x, crown.y, d.x, d.y);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2.5 * unit;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(124,69,47,.85)';
      ctx.lineWidth = 1.1 * unit;
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  if (kind === 'side') {
    for (const ids of [[10, 9, 6, 1, 2, 0, 17, 152], [10, 152], [1, 152], [2, 152]]) wire(ids, '#777c69');
    for (const id of [10, 1, 2, 152]) ring(id);
    return;
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#e23d3d';
  const chains = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
  const strokeChains = () => {
    for (const chain of chains) {
      ctx.beginPath();
      chain.forEach((id, i) => {
        if (!points[id]) return;
        const p = pt(id);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  };
  strokeChains();
  if (kind === 'full') {
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 1.6;
    strokeChains();
    const shoulderY = ((points[11]?.y ?? points[0]?.y ?? 0.2) + (points[12]?.y ?? points[0]?.y ?? 0.2)) / 2;
    const crown = (points[0]?.y ?? shoulderY) - Math.max(0.03, (shoulderY - (points[0]?.y ?? shoulderY)) * 0.9);
    const feet = [29, 30, 31, 32, 27, 28].map((id) => points[id]).filter((p) => p && (p.visibility ?? 1) > 0.35);
    const sole = feet.length ? Math.max(...feet.map((p) => p.y)) : points[28]?.y ?? points[27]?.y;
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = '#e07a4c';
    ctx.lineWidth = 1.3;
    for (const y of [crown, sole]) {
      if (y == null) continue;
      const yy = oy + y * h;
      ctx.beginPath();
      ctx.moveTo(ox + 6, yy);
      ctx.lineTo(ox + w - 6, yy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.font = '600 11px sans-serif';
    ctx.textBaseline = 'middle';
    const tag = (text: string, y: number) => {
      const yy = oy + y * h;
      const width = ctx.measureText(text).width + 14;
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(ox + 8, yy - 9, width, 18);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillText(text, ox + 15, yy);
    };
    tag('KRUIN', crown);
    if (sole != null) tag('VOETZOLEN', sole);
    ctx.fillStyle = '#e23d3d';
  }
  for (const id of kind === 'full' ? [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] : kind === 'side' ? [10, 1, 152] : [33, 263, 1, 152]) {
    if (!points[id]) continue;
    const p = pt(id);
    ctx.beginPath();
    ctx.arc(p.x, p.y, kind === 'full' ? 7 : 2.4, 0, Math.PI * 2);
    if (kind === 'full') {
      ctx.fillStyle = '#f7f7f7';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#c4553a';
    }
    ctx.fill();
  }
  if (eyeLine && eyeLine.length === 2) {
    ctx.strokeStyle = 'rgba(212,175,106,.95)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([]);
    const a = { x: ox + eyeLine[0].x * w, y: oy + eyeLine[0].y * h };
    const b = { x: ox + eyeLine[1].x * w, y: oy + eyeLine[1].y * h };
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function Frame({ kind, shot }: { kind: Kind; shot: Shot | null }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !shot?.points) return;
    const paint = () => {
      if (img.naturalWidth) draw(canvas, img, kind, shot.points, shot.eyeLine);
    };
    if (img.complete) paint();
    img.addEventListener('load', paint);
    window.addEventListener('resize', paint);
    return () => {
      img.removeEventListener('load', paint);
      window.removeEventListener('resize', paint);
    };
  }, [kind, shot]);
  return (
    <div className="mp-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={shot?.url || COPY[kind].guide} alt="" />
      <canvas ref={canvasRef} />
      <i className="mp-scan" />
    </div>
  );
}


const NONE: Record<Kind, boolean> = { full: false, face: false, side: false };

function dataUrl(url: string) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const edge = 1200;
      const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(2, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('foto'));
    img.src = url;
  });
}

function measureRows(shots: Record<Kind, Shot | null>, heightCm: number | null): MeasureRow[] {
  const rows: MeasureRow[] = [];
  if (heightCm) {
    rows.push({
      part: 'Lengte',
      value: String(heightCm),
      unit: 'cm',
      status: 'gemeten',
      meaning: 'Opgegeven door de kandidaat of voogd. Dit is invoer, geen fotometing.',
    });
  } else {
    rows.push({
      part: 'Lengte',
      value: '—',
      unit: 'cm',
      status: 'niet vast te stellen',
      meaning: 'Zonder lengte worden geen lichaamsmaten in centimeters berekend.',
    });
  }
  const full = shots.full;
  const points = full?.points;
  if (full?.ok && points && heightCm && points[0] && points[11] && points[12] && points[23] && points[24]) {
    const shoulderY = (points[11].y + points[12].y) / 2;
    const crown = points[0].y - Math.max(0.03, (shoulderY - points[0].y) * 0.9);
    const sole = Math.max(...[29, 30, 31, 32, 27, 28].map((id) => points[id]?.y ?? 0));
    const px = (sole - crown) * full.height;
    if (px > 40) {
      const cm = heightCm / px;
      const part = (a: number, b: number) =>
        points[a] && points[b] ? Math.round(dist(points[a], points[b], full.width, full.height) * cm) : null;
      const path = (ids: number[]) => {
        let sum = 0;
        for (let i = 1; i < ids.length; i += 1) {
          const bit = part(ids[i - 1], ids[i]);
          if (bit == null) return null;
          sum += bit;
        }
        return sum;
      };
      const add = (name: string, value: number | null, meaning: string) => {
        rows.push({
          part: name,
          value: value == null ? '—' : String(value),
          unit: 'cm',
          status: value == null ? 'niet vast te stellen' : 'geschat',
          meaning,
        });
      };
      add('Schouderpuntbreedte', part(11, 12), '2D-schatting, geschaald op de opgegeven lengte.');
      add('Heuppuntbreedte', part(23, 24), '2D-afstand, geen heupomtrek.');
      add('Romplijn', path([11, 23]), 'Schouder tot heup.');
      add('Arm links', path([11, 13, 15]), 'Schouder, elleboog en pols.');
      add('Arm rechts', path([12, 14, 16]), 'Schouder, elleboog en pols.');
      add('Bovenbeen links', part(23, 25), 'Heup tot knie.');
      add('Onderbeen links', part(25, 27), 'Knie tot enkel.');
      add('Bovenbeen rechts', part(24, 26), 'Heup tot knie.');
      add('Onderbeen rechts', part(26, 28), 'Knie tot enkel.');
    }
  } else {
    rows.push({
      part: 'Lichaamsmaten',
      value: '—',
      unit: 'cm',
      status: 'niet vast te stellen',
      meaning: 'De schaal of de houding laat geen betrouwbare centimetermaat toe.',
    });
  }
  const face = shots.face;
  if (face?.ok && face.points?.[10] && face.points[152] && face.points[234] && face.points[454]) {
    const w = dist(face.points[234], face.points[454], face.width, face.height);
    const h = dist(face.points[10], face.points[152], face.width, face.height);
    rows.push({
      part: 'Gezichtshoogte / gezichtsbreedte',
      value: w > 0 ? (h / w).toFixed(2) : '—',
      unit: 'verhouding',
      status: w > 0 ? 'geschat' : 'niet vast te stellen',
      meaning: 'Alleen een 2D-verhouding. Geen bewijs van schoonheid of succes.',
    });
  } else {
    rows.push({
      part: 'Gezichtsverhouding',
      value: '—',
      unit: 'verhouding',
      status: 'niet vast te stellen',
      meaning: 'De close-up levert geen betrouwbare verhouding.',
    });
  }
  return rows;
}

export function ModelIntakeSection() {
  const { token, isAdmin } = useAuth();
  const [coupon, setCoupon] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [childAge, setChildAge] = useState('');
  const [shots, setShots] = useState(EMPTY);
  const [approved, setApproved] = useState(NONE);
  const [busy, setBusy] = useState<Kind | 'run' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ModelReport | null>(null);
  const [pay, setPay] = useState<{ id: string; qr: string; checkout: string; emailSent?: boolean } | null>(null);

  function missingFields(photos: boolean) {
    const list: string[] = [];
    if (!firstName.trim()) list.push('Voornaam');
    if (!lastName.trim()) list.push('Naam');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) list.push('E-mailadres');
    if (gender !== 'women' && gender !== 'men') list.push('Man of vrouw');
    if (ageGroup !== 'adult' && ageGroup !== 'child') list.push('Leeftijdsgroep');
    if (ageGroup === 'child') {
      const age = Number(childAge);
      if (!Number.isFinite(age) || age < 1 || age > 17) list.push('Leeftijd in jaren');
    }
    const cm = heightCm ? Number(heightCm) : null;
    if (ageGroup === 'adult' && (cm === null || cm < 100 || cm > 240)) list.push('Lengte in cm');
    if (cm !== null && (cm < 100 || cm > 240)) list.push('Lengte tussen 100 en 240 cm');
    if (photos) {
      for (const kind of Object.keys(COPY) as Kind[]) {
        if (!shots[kind]) list.push(`${COPY[kind].title}: foto opladen`);
        else if (!approved[kind]) list.push(`${COPY[kind].title}: foto goedkeuren`);
      }
    }
    return list;
  }

  function heightValue() {
    const cm = Number(heightCm);
    return Number.isFinite(cm) && cm >= 100 && cm <= 240 ? cm : null;
  }

  async function onFile(kind: Kind, file?: File) {
    if (!file) return;
    setError('');
    setApproved((prev) => ({ ...prev, [kind]: false }));
    setBusy(kind);
    try {
      const img = await loadImage(file);
      const result = await inspect(kind, img, heightValue() || 0);
      setShots((prev) => ({
        ...prev,
        [kind]: { url: img.src, width: img.naturalWidth, height: img.naturalHeight, ...result },
      }));
    } catch {
      setError('Deze foto kon niet worden gecontroleerd. Kies een andere.');
    } finally {
      setBusy(null);
    }
  }

  function show(next: ModelReport) {
    setReport(next);
    setBusy(null);
    window.setTimeout(() => document.getElementById('mp-analyse')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  }

  async function startReal() {
    const gaps = missingFields(true);
    if (gaps.length) {
      setMissing(gaps);
      return;
    }
    setError('');
    setReport(null);
    setPay(null);
    const code = coupon.trim().toLowerCase();
    if (isAdmin && code) {
      if (code !== 'alain') {
        setError('Die couponcode klopt niet.');
        return;
      }
      setBusy('run');
      try {
        const images = await Promise.all((['full', 'face', 'side'] as Kind[]).map((kind) => dataUrl(shots[kind]!.url)));
        const res = await fetch('/api/model-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
          body: JSON.stringify({
            action: 'run',
            coupon: 'alain',
            firstName,
            lastName,
            email,
            ageGroup,
            gender,
            heightCm: heightValue(),
            childAge: ageGroup === 'child' ? Number(childAge) : null,
            images,
            measures: measureRows(shots, heightValue()),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.report) {
          setError(data.error || 'De analyse kon niet starten.');
          setBusy(null);
          return;
        }
        setPay({ id: 'alain', qr: '', checkout: '', emailSent: data.emailSent });
        show(data.report);
      } catch {
        setError('De analyse kon niet starten.');
        setBusy(null);
      }
      return;
    }
    setBusy('save');
    try {
      const images = await Promise.all((['full', 'face', 'side'] as Kind[]).map((kind) => dataUrl(shots[kind]!.url)));
      const res = await fetch('/api/model-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          ageGroup,
          gender,
          heightCm: heightValue(),
          childAge: ageGroup === 'child' ? Number(childAge) : null,
          images,
          measures: measureRows(shots, heightValue()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id || !data.checkout) {
        setError(data.error || 'De analyse kon niet starten.');
        setBusy(null);
        return;
      }
      setPay({ id: data.id, qr: data.qr || '', checkout: data.checkout });
      setBusy(null);
      window.setTimeout(() => document.getElementById('mp-pay')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    } catch {
      setError('De analyse kon niet starten.');
      setBusy(null);
    }
  }

  function printReport() {
    document.body.dataset.print = 'profiel';
    window.print();
  }

  useEffect(() => {
    const done = () => {
      if (document.body.dataset.print === 'profiel') delete document.body.dataset.print;
    };
    window.addEventListener('afterprint', done);
    return () => window.removeEventListener('afterprint', done);
  }, []);

  useEffect(() => {
    const existing = new URLSearchParams(window.location.search).get('intake');
    if (existing) setPay({ id: existing, qr: '', checkout: '' });
  }, []);

  useEffect(() => {
    if (!pay?.id || report) return;
    let stop = false;
    let shown = false;
    let paidAt = 0;
    const tick = async () => {
      try {
        const res = await fetch(`/api/model-intake?id=${encodeURIComponent(pay.id)}`);
        const data = await res.json();
        if (stop || shown) return;
        if (data.qr || data.checkout) {
          setPay((prev) => (prev ? { ...prev, qr: data.qr || prev.qr, checkout: data.checkout || prev.checkout, emailSent: data.emailSent } : prev));
        }
        if (data.error) setError(data.error);
        if (data.status === 'paid' && !shown) {
          if (!paidAt) paidAt = Date.now();
          setBusy('run');
          shown = true;
          const images = await Promise.all((['full', 'face', 'side'] as Kind[]).map((kind) => dataUrl(shots[kind]!.url)));
          const run = await fetch('/api/model-intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'run',
              paymentId: pay.id,
              firstName,
              lastName,
              email,
              ageGroup,
              gender,
              heightCm: heightValue(),
              childAge: ageGroup === 'child' ? Number(childAge) : null,
              images,
              measures: measureRows(shots, heightValue()),
            }),
          });
          const done = await run.json().catch(() => ({}));
          if (!run.ok || !done.report) {
            shown = false;
            setError(done.error || 'De analyse is niet gelukt.');
            setBusy(null);
            return;
          }
          data.report = done.report;
          data.emailSent = done.emailSent;
        }
        if (data.report) {
          shown = true;
          const wait = Math.max(0, 6400 - (Date.now() - (paidAt || Date.now())));
          window.setTimeout(() => {
            if (stop) return;
            setPay((prev) => (prev ? { ...prev, emailSent: data.emailSent } : prev));
            show(data.report);
          }, wait);
        }
      } catch {
        if (!stop) setError('De betaling kon niet worden gecontroleerd.');
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [pay?.id, report]);

  return (
    <section id="profiel" className="nieuw-sectie mp-sectie" style={{ scrollMarginTop: 12 }}>
      <div className="nieuw-wrap">
        <span className="nieuw-label">Profiel en kennismaking</span>
        <h2 className="mp-title">
          Jouw modelprofiel. <em>Nog voor je binnenkomt.</em>
        </h2>
        <p className="nieuw-lead" style={{ maxWidth: 860 }}>
          Om verder te komen als model heb je eerst een analyse nodig. Je ziet hier of je in aanmerking komt,
          en voor welke opdrachten. Je krijgt een uitgebreide analyse: je volledige maten, je sterke en minder
          sterke punten, de modelrichtingen waarvoor je geschikt bent en het percentage per richting.
        </p>
        <div className="mp-fields">
          <label>
            Voornaam
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label>
            Naam
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label>
            E-mailadres
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Lengte in cm{ageGroup === 'child' ? ' · optioneel' : ''}
            <input inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </label>
          <label>
            Man / vrouw
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Kies</option>
              <option value="women">Vrouw</option>
              <option value="men">Man</option>
            </select>
          </label>
          <label>
            Leeftijdsgroep
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option value="">Kies</option>
              <option value="adult">Volwassene</option>
              <option value="child">Kind / minderjarige</option>
            </select>
          </label>
          {ageGroup === 'child' ? (
            <label>
              Leeftijd in jaren
              <input inputMode="numeric" value={childAge} placeholder="12" onChange={(e) => setChildAge(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} />
            </label>
          ) : null}
        </div>
        <div className={`mp-grid${busy === 'run' ? ' is-scanning' : ''}`}>
          {(Object.keys(COPY) as Kind[]).map((kind) => {
            const shot = shots[kind];
            return (
              <article key={kind} className="nieuw-panel mp-card">
                <div className="mp-card-top">
                  <strong>{COPY[kind].title}</strong>
                  <span>{approved[kind] ? 'Goedgekeurd' : 'Foto'}</span>
                </div>
                {shot ? (
                  <div className="mp-fit">
                    <div>
                      <span>In aanmerking voor analyse</span>
                      <b><i style={{ width: `${shot.fit}%` }} /></b>
                    </div>
                    <strong>{shot.fit}%</strong>
                  </div>
                ) : null}
                <Frame kind={kind} shot={shot} />
                {shot ? (
                  <div className="mp-choice">
                    <button className="mp-no" type="button" onClick={() => document.getElementById(`mp-file-${kind}`)?.click()}>Vervangen</button>
                    <button className={`mp-yes${approved[kind] ? ' on' : ''}`} type="button" onClick={() => setApproved((prev) => ({ ...prev, [kind]: true }))}>
                      {approved[kind] ? 'Goedgekeurd' : 'Goedkeuren'}
                    </button>
                  </div>
                ) : (
                  <div className="mp-upload-row">
                    <label className="mp-shot">
                      Foto maken
                      <input className="mp-file" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(kind, e.target.files?.[0])} />
                    </label>
                    <label className="mp-shot">
                      Kies uit foto's
                      <input className="mp-file" type="file" accept="image/*" onChange={(e) => onFile(kind, e.target.files?.[0])} />
                    </label>
                    <small>{COPY[kind].hint}</small>
                  </div>
                )}
                {shot && !shot.ok ? <p className="mp-wait">{shot.message}</p> : null}
              </article>
            );
          })}
        </div>
        {error ? <p className="mp-err">{error}</p> : null}
        {isAdmin ? (
          <label className="mp-coupon">
            Couponcode
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} autoComplete="off" placeholder="alain" />
          </label>
        ) : null}
        <div className="mp-actions">
          <button className="nieuw-btn mp-start" type="button" onClick={startReal} disabled={busy === 'run' || busy === 'save'}>
            {busy === 'save' ? 'Bezig…' : busy === 'run' ? 'Analyse loopt…' : 'Maak de analyse'}
          </button>
        </div>
        {pay && !report ? (
          <div className="mp-pay" id="mp-pay">
            <h3>Volledige analyse · € 3,99</h3>
            <p>
              Voor de volledige analyse betaal je € 3,99. Zo weten we dat je een afspraak maakt en ook komt.
              Daarmee weren we aanvragen die niet ernstig zijn. Na betaling zie je de analyse hier, en sturen we ze ook per e-mail door.
            </p>
            {pay.qr ? <img src={pay.qr} alt="QR-code om € 3,99 te betalen" /> : null}
            <div className="mp-pay-actions">
              {pay.checkout ? <a className="nieuw-btn" href={pay.checkout}>Betaal € 3,99</a> : null}
            </div>
          </div>
        ) : null}
        <article id="mp-analyse" className="mp-report" hidden={!report}>
          {report && pay?.emailSent === false ? <p className="mp-err">De analyse staat hier. De mail kon nog niet worden verstuurd.</p> : null}
          {report ? (
            <ReportView
              report={shots.full?.ok && heightValue() ? { ...report, measures: measureRows(shots, heightValue()) } : report}
              onPrint={printReport}
            />
          ) : null}
        </article>
        <NieuwAlertDialog
          open={missing.length > 0}
          title="Nog invullen"
          message="Dit moet nog ingevuld worden voor de analyse:"
          items={missing}
          onClose={() => setMissing([])}
        />
      </div>
      <style>{`
        .mp-sectie{padding-top:36px;padding-bottom:48px}
        .mp-title{margin:8px 0 0;font-family:var(--n-serif);font-weight:500;font-size:clamp(26px,2.6vw,36px);line-height:1.15;letter-spacing:0.01em;text-transform:none;color:var(--n-ink);white-space:nowrap}
        .mp-title em{font-style:italic;font-weight:500;color:var(--n-gold)}
        .mp-fields{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:22px 0 8px}
        .mp-fields:has(label:nth-child(7)){grid-template-columns:repeat(7,minmax(0,1fr))}
        .mp-fields label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--n-dim);min-width:0}
        .mp-fields input,.mp-fields select{box-sizing:border-box;display:block;margin-top:6px;width:100%;min-width:0;height:36px;background:#101010;color:var(--n-ink);border:1px solid var(--n-hair);padding:0 8px;font:inherit;font-size:13px;line-height:34px}
        .mp-fields select{appearance:none;padding-right:26px;background-image:linear-gradient(45deg,transparent 50%,#cfd1da 50%),linear-gradient(135deg,#cfd1da 50%,transparent 50%);background-position:calc(100% - 16px) 15px,calc(100% - 11px) 15px;background-size:5px 5px,5px 5px;background-repeat:no-repeat}
        .mp-coupon{display:block;margin-top:16px;max-width:240px;color:var(--n-mut);font-size:12px}
        .mp-coupon input{box-sizing:border-box;display:block;margin-top:6px;width:100%;height:36px;background:#101010;color:var(--n-ink);border:1px solid var(--n-hair);padding:0 8px;font:inherit;font-size:13px}
        .mp-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:22px}
        .mp-pay{margin-top:22px;background:#14151c;border:1px solid #2f303c;color:#f0f1f6;padding:22px;box-shadow:0 18px 50px #000a}
        .mp-pay h3{margin:0 0 8px;font-size:22px;font-weight:500}
        .mp-pay p{color:#cfd1da;max-width:62ch}
        .mp-pay img{display:block;width:220px;height:220px;background:#fff;margin:16px 0}
        .mp-pay-actions{display:flex;gap:12px;flex-wrap:wrap}
        .mp-upload-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
        .mp-upload-row small{grid-column:1 / -1;color:#b7ad96;font-size:12px;line-height:1.45}
        .mp-shot{position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;background:#14151c;color:#f0f1f6;border:1px solid #2f303c;cursor:pointer;font-size:13px}
        .mp-ghost{background:transparent;color:var(--n-ink);border:1px solid var(--n-hair);min-height:44px;padding:0 16px;font:inherit;cursor:pointer}
        .mp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:22px}
        .mp-card{padding:14px}
        .mp-card-top{display:flex;justify-content:space-between;gap:8px;font-size:13px;margin-bottom:10px}
        .mp-card-top span{color:var(--n-gold);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
        .mp-fit{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:8px}
        .mp-fit span{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#b7ad96}
        .mp-fit b{display:block;height:3px;margin-top:8px;background:#2a2a2a}
        .mp-fit i{display:block;height:3px;background:#d4af6a}
        .mp-fit strong{font-family:Georgia,serif;font-size:28px;font-weight:400;color:#d4af6a;line-height:1}
        .mp-frame{position:relative;height:420px;background:#101010;border:1px solid var(--n-hair);display:flex;align-items:center;justify-content:center;overflow:hidden}
        .mp-frame img{width:100%;height:100%;object-fit:contain;display:block}
        .mp-frame canvas,.mp-scan{position:absolute;left:0;right:0;pointer-events:none}
        .mp-frame canvas{inset:0;width:100%;height:100%}
        .mp-scan{top:0;height:2px;opacity:0;background:linear-gradient(90deg,transparent,#d4af6a 20%,#fff6df 50%,#d4af6a 80%,transparent);box-shadow:0 0 16px #d4af6a}
        .mp-grid.is-scanning .mp-scan{opacity:1;animation:mp-scan 3.2s linear 2}
        @keyframes mp-scan{from{top:4%}to{top:96%}}
        .mp-upload{display:flex;align-items:flex-start;gap:12px;margin-top:12px;text-align:left;cursor:pointer}
        .mp-upload b{flex:none;width:28px;font-size:28px;line-height:.8;font-weight:400;color:#e23d3d}
        .mp-upload strong{display:block;font-size:13px;font-weight:600;color:var(--n-ink)}
        .mp-upload small{display:block;margin-top:3px;font-size:12px;line-height:1.45;color:#b7ad96}
        .mp-file{position:absolute;width:1px;height:1px;opacity:0}
        .mp-choice{display:grid;grid-template-columns:1fr 1fr;margin-top:8px}
        .mp-no,.mp-yes{min-height:46px;border:0;font:inherit;font-size:13px;cursor:pointer;color:#fff}
        .mp-no{background:#8e2f2f}
        .mp-yes{background:#2f6b45}
        .mp-yes.on{background:#3d8f5a}
        .mp-wait,.mp-err{color:var(--n-dim);font-size:13px}
        .mp-err{color:#e7b2a4;margin-top:12px}
        .mp-report{margin-top:36px;padding-top:28px;border-top:1px solid var(--n-hair)}
        .mp-banner{margin:0 0 16px;padding:10px 12px;border:1px solid rgba(212,175,106,.45);color:#d4af6a;font-size:13px}
        .mp-report-head h3{margin:8px 0 10px;font-family:Georgia,serif;font-size:40px;font-weight:400}
        .mp-report-head p{max-width:68ch;color:var(--n-mut);font-size:16px;line-height:1.6}
        .mp-overall{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:18px 0;border-top:1px solid var(--n-hair);border-bottom:1px solid var(--n-hair)}
        .mp-overall strong{font-family:Georgia,serif;font-size:64px;font-weight:400;color:#d4af6a;line-height:.9}
        .mp-overall h4,.mp-report h4{margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#d4af6a}
        .mp-overall p,.mp-report p,.mp-report li{color:var(--n-mut);font-size:14px;line-height:1.6}
        .mp-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;align-items:start}
        .mp-measures{grid-column:span 2;align-self:stretch}
        .mp-measures ul{list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 18px}
        .mp-measures li{display:flex;flex-direction:column;gap:2px;padding-bottom:8px;border-bottom:1px solid var(--n-hair)}
        .mp-measures span{color:var(--n-mut);font-size:12px}
        .mp-measures b{color:#d4af6a;font-weight:500;font-size:14px}
        .mp-cols article,.mp-dir article{padding:16px;border:1px solid var(--n-hair);background:#101010}
        .mp-cols h5{margin:12px 0 4px;font-size:15px;color:var(--n-ink)}
        .mp-dir{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px;margin-bottom:36px}
        .mp-dir strong{display:block;margin:8px 0 2px;font-family:Georgia,serif;font-size:32px;font-weight:400;color:#d4af6a}
        .mp-dir em,.mp-dir small{display:block;font-style:normal;color:#b7ad96;font-size:12px}
        .mp-dir small{margin-top:8px}
        .mp-report table{width:100%;border-collapse:collapse;margin-top:8px}
        .mp-report th,.mp-report td{padding:8px 10px 8px 0;border-bottom:1px solid var(--n-hair);text-align:left;vertical-align:top;font-size:13px;color:var(--n-mut)}
        .mp-report th{color:#b7ad96;font-weight:500}
        .mp-end{margin-top:8px}
        .mp-report .nieuw-btn{margin:8px 8px 0 0}
        @media(max-width:800px){.mp-grid,.mp-dir,.mp-cols,.mp-overall,.mp-measures ul{grid-template-columns:1fr;display:grid}.mp-measures{grid-column:auto}.mp-frame{height:420px}.mp-overall{align-items:flex-start}.mp-fields,.mp-fields:has(label:nth-child(7)){grid-template-columns:1fr 1fr}.mp-title{white-space:normal}.mp-upload-row,.mp-choice,.mp-actions,.mp-pay-actions,.mp-end{display:flex;flex-direction:column;align-items:stretch}.mp-shot,.mp-choice .mp-no,.mp-choice .mp-yes,.mp-actions .nieuw-btn,.mp-pay-actions .nieuw-btn,.mp-end .nieuw-btn{width:100%;box-sizing:border-box;margin-left:0;margin-right:0}}
        @media print{
          body[data-print='profiel'] *{visibility:hidden}
          body[data-print='profiel'] #mp-analyse,body[data-print='profiel'] #mp-analyse *{visibility:visible}
          body[data-print='profiel'] #mp-analyse{position:absolute;left:0;top:0;width:100%;background:#fff;color:#1c1c1c}
          body[data-print='profiel'] #mp-analyse h3,body[data-print='profiel'] #mp-analyse h4,body[data-print='profiel'] #mp-analyse strong{color:#8a3b28}
        }
      `}</style>
    </section>
  );
}

function ReportView({ report, onPrint }: { report: ModelReport; onPrint: () => void }) {
  return (
    <>
      {report.fictional ? <p className="mp-banner">Fictief voorbeeld. Dit is geen analyse van ingestuurde beelden.</p> : null}
      <header className="mp-report-head">
        <span className="nieuw-label">Modelprofiel</span>
        <h3>Een scherpere kijk op je profiel.</h3>
        <p>{report.summary}</p>
      </header>
      <section className="mp-overall">
        <div>
          <h4>Algemene profielmatch</h4>
          <p>{report.overallNote} Geen kans op werk, toelating of een contract.</p>
        </div>
        <strong>{report.overall === null ? '—' : `${report.overall}%`}</strong>
      </section>
      <div className="mp-cols">
        <article>
          <h4>Sterke punten</h4>
          {report.strengths.map((item) => (
            <div key={item.title}>
              <h5>{item.title}</h5>
              <p>{item.observation}</p>
              <p>{item.meaning}</p>
            </div>
          ))}
        </article>
        <article>
          <h4>Mindere punten</h4>
          {report.weaker.map((item) => (
            <div key={item.title}>
              <h5>{item.title}</h5>
              <p>{item.observation}</p>
              <p>{item.meaning}</p>
            </div>
          ))}
        </article>
      </div>
      <div className="mp-dir">
        {report.directions.map((item) => (
          <article key={item.label}>
            <h4>{item.label}</h4>
            <strong>{item.score === null ? '—' : `${item.score}%`}</strong>
            <em>{item.qualification}</em>
            {item.why ? <p>{item.why}</p> : null}
            {item.limit ? <p>{item.limit}</p> : null}
            {item.unknown ? <small>{item.unknown}</small> : null}
            {item.provisional && item.score !== null ? <small>Voorlopig</small> : null}
          </article>
        ))}
        <article className="mp-measures">
          <h4>Metingen</h4>
          <ul>
            {report.measures.map((row) => (
              <li key={row.part}>
                <span>{row.part}</span>
                <b>{row.value} {row.unit}</b>
              </li>
            ))}
          </ul>
        </article>
      </div>
      {report.heightScore !== null ? (
        <p>Lengte telt in de mannequinrubric voor 30% en staat op {Math.round(report.heightScore)}%. Dat is niet de totale mannequinmatch. Verhoudingen 25%, houding 25%, showstijl 20%. Beweging: nog niet beoordeeld.</p>
      ) : (
        <p>De volwassen lengteformule is hier niet toegepast.</p>
      )}
      <section className="mp-end">
        <h4>Eindconclusie</h4>
        <p>Best passend: {report.top.length ? report.top.join(', ') : 'nog niet vast te stellen'}.</p>
        <p>{report.forCandidate}</p>
        <p>{report.forBureau}</p>
        <p>{report.extra}</p>
        <button className="nieuw-btn" type="button" onClick={onPrint}>Bewaar als PDF / afdrukken</button>
        <a className="nieuw-btn" href="#inschrijven">Maak hier direct een afspraak in onze online agenda</a>
      </section>
    </>
  );
}
