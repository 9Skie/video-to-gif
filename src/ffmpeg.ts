import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from '@ffmpeg/util';
import { updateStore } from "./store";
import workerURL from '@ffmpeg/ffmpeg/worker?url';

declare const FFMPEG_CORE_VERSION: string; // injected by vite

function isExtensionContext(): boolean {
  // @ts-ignore - chrome is injected in extension pages
  return typeof chrome !== 'undefined' && !!chrome?.runtime?.id;
}

let baseUrls = [
  `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`,
  `${import.meta.env.BASE_URL}ffmpeg-core/esm`,
]

export async function initFFmpeg() {
  let ffmpeg = new FFmpeg()

  // In a Chrome extension, MV3 CSP forbids loading scripts from blob: URLs.
  // Load ffmpeg-core directly from the packaged extension assets — no fetch,
  // no blob conversion, just the same-origin extension URL.
  if (isExtensionContext()) {
    // @ts-ignore
    const baseURL = chrome.runtime.getURL('ffmpeg-core/esm');
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      classWorkerURL: workerURL,
    });
    updateStore({ ffmpeg })
    return
  }

  const preferredBaseURLKey = 'video-to-gif/ffmpeg-core-url'
  const preferredBaseURL = localStorage.getItem(preferredBaseURLKey)
  if (preferredBaseURL) {
    baseUrls = [preferredBaseURL, ...baseUrls.filter(i => i !== preferredBaseURL)]
  }

  let coreURL = '';
  let baseURL = '';
  for (const iBaseURL of baseUrls) {
    try {
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort('timeout'), 10000);
      const response = await fetch(`${iBaseURL}/ffmpeg-core.js`, { signal: abortController.signal });
      clearTimeout(timer);
      if (!response.ok) continue;

      coreURL = URL.createObjectURL(await response.blob());
      baseURL = iBaseURL;
      localStorage.setItem(preferredBaseURLKey, baseURL);
      break;
    } catch (e) {
      console.error('Failed to use FFmpeg core from ' + iBaseURL, e);
      continue;
    }
  }

  if (!coreURL) throw new Error('No valid FFmpeg core URL found');
  const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

  await ffmpeg.load({
    coreURL,
    wasmURL,
    classWorkerURL: import.meta.env.PROD ? undefined : workerURL, // vite bug
  });

  updateStore({ ffmpeg })
}
