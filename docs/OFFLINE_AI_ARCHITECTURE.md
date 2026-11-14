# ASTRAMED Offline AI and Vision Architecture

## Goal

ASTRAMED must launch and perform its core mission workflows without an internet
connection on supported Android devices and computers. The interface should
remain consistent while each platform uses an inference backend suited to its
hardware.

## Existing application

The current application is React + TypeScript + Vite with an Express server.
The AI Assistant currently sends chat requests to `/api/ai/chat`; this is a
server-dependent path and is not yet an offline local-model integration.

## Runtime boundaries

### Language model

Application code uses `src/core/ai/runtime.ts`. It defines the common
contract for model discovery, status, loading and chat generation.

- Desktop: a locally managed inference service may be used. The first adapter
  now uses a loopback-only Express bridge to Ollama (`127.0.0.1:11434`). The
  browser talks only to ASTRAMED's same-origin API, not directly to Ollama.
  This adapter is a development bridge, not yet a self-contained desktop package. It deliberately has no model-download route; models must be provisioned before going offline.
- Android: use a mobile-compatible inference backend. The desktop Ollama
  service is not the Android embedding strategy.
- Model weights must be present on the device before offline operation.
  First-time provisioning may require a network or an installation package
  containing the model.

### Computer vision

Application code uses `src/core/vision/runtime.ts`. It defines a common
pose-detection contract.

- Use a supported exported pose model and platform runtime.
- The detector returns keypoints and confidence values only.
- A separate ASTRAMED movement engine calculates angles, repetitions and
  assessment outputs.
- Low-confidence, occluded or missing keypoints must be marked invalid,
  never silently converted into normal movement values.

### Device capability checks

`src/platform/runtimeCapabilities.ts` reports browser-visible capabilities.
These values are compatibility hints, not proof that a particular model will
fit or run at an acceptable speed. Model selection needs real-device tests.

## Safety and data integrity

- Health thresholds, unit conversion, trend calculations and alert rules stay
  deterministic and outside the language model.
- The model may explain readings and cite the local research library, but must
  not invent telemetry or turn research suggestions into measured facts.
- Distinguish measured, imported, calculated, simulated and AI-generated data.
- Camera frames should be processed locally and not saved unless the user
  explicitly enables an approved recording workflow.
- No cloud fallback is allowed for a workflow advertised as fully offline.

## Licensing checkpoint

- Ollama's source repository is MIT-licensed; retain required copyright and
  licence notices when redistributing its code.
- Ultralytics YOLO code and trained models are AGPL-3.0 by default, with an
  Enterprise licensing alternative. Before distributing a bundled Ultralytics
  implementation or weights, confirm the project's intended source-release
  and distribution obligations. Do not remove upstream notices.
- Each exported model/runtime dependency must be checked independently;
  the runtime licence does not automatically settle the model-weight licence.

## Implementation sequence

1. Add platform-neutral AI and pose runtime contracts. (Current foundation.)
2. Add a desktop local-model adapter and controlled selection of preinstalled local models. (Initial Ollama bridge added; UI selection and local validation remain.)
3. Add an Android-native inference adapter and compatible quantized model.
4. Add the pose model adapter for desktop and Android.
5. Replace the AI Assistant's direct server call with an injected runtime.
6. Add offline-first storage and app-shell caching.
7. Package and test on real Android and computer hardware with networking
   disabled.

## Current status

This branch establishes interfaces, adds an initial loopback Ollama API bridge,
and records constraints. The existing AI Assistant is not yet wired to the new
adapter. Ollama, YOLO and model weights are not bundled; the branch has not yet
been validated on a real offline device.
