# ASTRAMED — Astronaut Health & Mobility Monitoring

ASTRAMED is a prototype for astronaut health decision support. Its monitoring design is camera-first for movement and uses authenticated medical-device ingestion for physiological readings.

## Current implementation

- **YOMA:** browser-based five-minute movement assessment using Ultralytics YOLO26n Pose; records 2D shoulder, elbow and knee movement estimates, coordination difference, pose confidence and quality status.
- **30-day mobility history:** compares accepted, non-simulated assessments for the same subject. Rejected assessments remain auditable but are excluded from progress comparisons.
- **Crew registry:** real or anonymised profiles with no invented age, flight history or medical baseline.
- **Data provenance:** manual readings and uploaded files are marked unverified. Uploaded source labels are retained as claims, not treated as verified provenance.
- **Sensor gateway:** authenticated API endpoint for compatible wearable or medical sensor integrations.
- **Research and AI:** NASA OSDR, NASA Life Sciences and Europe PMC are research sources; research records are not live astronaut telemetry.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run lint
npm run build
```

## Environment variables

Configure secrets in the deployment environment. Never commit API keys or sensor tokens.

- `OPENROUTER_API_KEY` — primary AI provider.
- `OPENROUTER_MODEL` — optional model override.
- `GEMINI_API_KEY` — optional secondary provider fallback.
- `ASTRAMED_SENSOR_INGEST_TOKEN` — optional bearer token that enables authenticated sensor ingestion. Without it, the sensor endpoint returns 503 and accepts no data.

## YOMA camera model

YOMA loads the YOLO26n-pose ONNX model in the browser on first use. The model is approximately 12 MB; the browser inference runtime downloads additional assets and caches them. Camera frames are processed client-side and are not uploaded by the YOMA view.

The current pretrained pose model uses ordinary human COCO keypoints. It is **not validated for spacesuits, microgravity, restraint systems, occlusion or clinical range-of-motion assessment**. Its angles are 2D image-plane estimates, not 3D anatomical joint angles. A quality-accepted record is not a medical diagnosis or proof of clinical validity.

The `@ultralytics/yolo` package and referenced model weights are distributed under AGPL-3.0. Review licensing obligations before redistributing or using ASTRAMED in a closed-source or commercial product.

## Five-minute YOMA protocol

| Time | Phase |
|---|---|
| 00:00–00:30 | Camera setup |
| 00:30–01:00 | Neutral calibration |
| 01:00–01:50 | Shoulder movement |
| 01:50–02:40 | Elbow movement |
| 02:40–03:30 | Knee movement |
| 03:30–04:20 | Coordination |
| 04:20–05:00 | Quality review |

The server only accepts an assessment record after the five-minute duration and a basic pose-quality gate: at least 30 valid frames, mean pose confidence of at least 0.55, and at least 10 samples for each shoulder, elbow and knee phase. This is a prototype data-quality gate, not clinical validation.

## Authenticated sensor gateway

Set `ASTRAMED_SENSOR_INGEST_TOKEN` on the backend deployment. Send a POST request to `/api/sensors/ingest` with:

- `Authorization: Bearer <configured-token>`
- `Content-Type: application/json`
- `crewId`, `deviceId`, `sensorType`, `category`, `parameter`, `value`, `unit`, `timestamp` (ISO 8601), and `qualityConfidence` (0.5–1.0).
- Optional `source`: `wearable_sensor` or `sensor_gateway`.
- Optional `measurementMethod`, `notes`; `simulated: true` is rejected.

Accepted authenticated sensor records are marked as source-verified for ingestion and can enter the rule-based alert engine. This does not establish a clinical diagnosis; the data still require appropriate medical review.

Manual entries and imported files remain `unverified`, are excluded from automatic health alerts, and are clearly distinguished from authenticated sensor readings.

## Data cleanup and storage

The database seed file is intentionally empty. On first startup after the 2.3.0 migration, ASTRAMED removes the old fictional Expedition 75 demo profiles, built-in sample readings, sample import and related events. It preserves unrelated user-created records, but marks manual/imported readings as unverified.

The server uses persistent JSON storage. Configure a persistent disk/path in the deployment environment if records must survive instance replacement.

## Important limitations

ASTRAMED is a research and demonstration prototype, not a certified medical device. It does not provide autonomous diagnosis or treatment recommendations. Camera-derived measurements and model confidence must be presented with their limitations, and clinical decisions require qualified medical review.
