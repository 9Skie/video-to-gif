import { Show, createMemo, createSignal } from "solid-js";
import { store } from "../store";
import confetti from 'canvas-confetti';

function readableFileSize(size: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, unitIndex)).toFixed(2) + ' ' + units[unitIndex];
}

function playConfetti(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  confetti({
    particleCount: 100,
    spread: 70,
    ticks: 60,
    origin: { x, y },
  })
}


export function OutputDisplay() {
  const [showDonate, setShowDonate] = createSignal(false)
  const hasError = createMemo(() => isNaN(store.outputFileContent?.length || 0))

  return <Show when={store.outputFileURL}>
    <section
      class="rounded-2xl p-6 mt-4 bg-white b-1 b-solid shadow-sm animate-zoom-in animate-duration-300 animate-ease-out"
      classList={{ 'b-rose-200': hasError(), 'b-neutral-200': !hasError() }}
      ref={e => setTimeout(() => playConfetti(e!), 50)}
    >
      <h2 class="text-lg font-semibold text-neutral-900 m-0 mb-4">Output</h2>

      <Show when={hasError()}>
        <div class="bg-rose-50 b-1 b-solid b-rose-200 p-4 rounded-xl mb-4 text-rose-900">
          <div class="flex items-center flex-wrap gap-3">
            <span class="text-sm">
              <i class="i-mdi-emoticon-sad-outline text-xl mr-2 align-middle" />
              Am I messed it up?
            </span>

            <button class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm cursor-pointer transition-colors" onClick={() => {
              const title = `Failed to convert: ${store.fileInfo.extname}`
              const body = [
                '<!-- if possible, please provide the video file 🫴🎬 to analyze and solve bug🔬. -->',
                '<!-- (sample files are public, please consider carefully) -->',
                '',
                `- File: ${store.fileInfo.extname}  (${readableFileSize(store.fileContent?.byteLength || 0)})` ,
                `- User-Agent: ${navigator.userAgent}`,
                `- File Info: \`${JSON.stringify(store.fileInfo)}\``,
                `- Options: \`${JSON.stringify(store.options)}\``,
                `- Git Revision: ${GIT_REVISION}`,
                `- Source: ${location.href}`,
              ].join('\n')
              window.open(`https://github.com/lyonbot/video-to-gif/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, 'tweetShare')
            }}>
              <i class="i-mdi-flag"></i> Report an Issue
            </button>
          </div>
        </div>
      </Show>

      <p class="text-sm text-neutral-500 m-0 mb-1">File size: {readableFileSize(store.outputFileContent?.length || 0)}</p>
      <p class="m-0 mb-4">
        <a
          class="inline-flex items-center gap-1.5 decoration-none text-indigo-600 hover:underline text-sm font-medium"
          download={store.file?.name + ".gif"} href={store.outputFileURL}
        >
          <i class="i-mdi-download"></i>
          Download GIF
        </a>
      </p>
      <img src={store.outputFileURL} alt="output" class="block mx-auto max-w-full rounded-xl bg-neutral-100" />
    </section>

    <div class="justify-center items-center mt-5 flex flex-wrap gap-3 text-sm text-neutral-500">
      Feeling helpful?

      <button class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm cursor-pointer transition-colors"
        onClick={() => { window.open('https://ko-fi.com/W7W0WWVJE', '_blank') }}
        onMouseEnter={() => { setShowDonate(true) }}
      >
        <i class="i-mdi-coffee"></i> Buy me a Coffee
      </button>

      <button class="inline-flex items-center gap-1.5 rounded-md px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm cursor-pointer transition-colors" onClick={() => {
        const message = '🎬⇒🎆 Video to GIF, in local, blazing fast⚡\n\nhttps://lyonbot.github.io/video-to-gif/\n\nJust found a handy web-app that convert video to GIF, no installing, blazing fast! 🤩 Check it out!'
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, 'tweetShare')
      }}>
        <i class="i-mdi-twitter"></i> Tell Friends
      </button>
    </div>

    {/* only render when language is zh-CN and hover on Donate button */}
    {(navigator.language === 'zh-CN') && <>
      <Show when={showDonate()}>
        <div class="mt-4 text-center">
          <img src="https://yons.site/donate1.png" class="max-w-full" onload={e => e.currentTarget.scrollIntoView()} />
        </div>
      </Show>
      <link rel="preload" as="image" href="https://yons.site/donate1.png" />
    </>}
  </Show>
}