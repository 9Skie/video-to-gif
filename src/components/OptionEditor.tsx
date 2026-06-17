import { Show, Index, createMemo, createSignal, createEffect } from "solid-js";
import { WatermarkConfig, ditherOptions, getDefaultWatermark, outputSize, outputTimeRange, store, updateStore, watermarkLocation, watermarkTextAlign } from "../store";
import { startMouseMove } from 'yon-utils'
import JSON5 from 'json5'

const btnClass =
  "inline-flex items-center gap-1.5 bg-white b-0 text-neutral-700 cursor-pointer hover:bg-neutral-100 transition-colors text-sm px-3";
const selectClass =
  "bg-white text-neutral-800 b-1 b-solid b-neutral-200 hover:b-neutral-300 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer focus:b-indigo-400";
const rowClass = "min-h-[52px]";

export function OptionEditor() {
  var videoEl: HTMLVideoElement
  const [videoTime, setVideoTime] = createSignal(0)
  const t2p = (t: number) => (t / store.fileInfo.duration) * 100 + '%'

  function seekTo(t: number) {
    setVideoTime(t);
    videoEl.pause();
    videoEl.currentTime = t;
    setPreviewingSpeed(false);
  }

  var timelineEl: HTMLDivElement

  function TimelineThumb(props: { class: string, time: number, onUpdate(t: number): void }) {
    return <div
      class={"w-4 h-full pos-absolute top-0 ml--2 cursor-ew-resize " + props.class}
      style={{ left: t2p(props.time) }}
      onPointerDown={ev => {
        ev.preventDefault()
        timelineEl.focus()

        const w = timelineEl.clientWidth
        const duration = videoEl.duration
        const t0 = props.time

        seekTo(t0)

        startMouseMove({
          initialEvent: ev,
          onMove(data) {
            let deltaT = data.deltaX / w * duration
            let t = t0 + deltaT
            if (t < 0) t = 0
            if (t > duration) t = duration

            if (Math.abs(t - t0) > 0.05) props.onUpdate(t)
          },
        })
      }}
    />
  }

  const handleSeekingOnBar = (e: PointerEvent) => {
    if (timelineEl === e.target) {
      const w = timelineEl.clientWidth;
      const duration = videoEl.duration;
      e.preventDefault();
      timelineEl.focus();

      startMouseMove({
        initialEvent: e,
        onMove(data) {
          let t = data.event.offsetX / w * duration;
          if (t < 0) t = 0;
          if (t > duration) t = duration;
          seekTo(t);
        }
      });
    }
  };

  const handleKeypressOnBar = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
        seekTo(videoTime() - 0.2)
        e.preventDefault();
        break;

      case 'ArrowRight':
        seekTo(videoTime() + 0.2)
        e.preventDefault();
        break;

      case 'ArrowUp':
        seekTo(videoTime() - 1)
        e.preventDefault();
        break;

      case 'ArrowDown':
        seekTo(videoTime() + 1)
        e.preventDefault();
        break;

      case 'Space':
        videoEl.paused ? videoEl.play() : videoEl.pause()
        e.preventDefault();
        break;
    }
  }

  function OptionGroupHeader(props: { children: any }) {
    return (
      <h3 class="flex items-center gap-2 m-0 mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {props.children}
      </h3>
    )
  }

  function OptionLabel(props: { children: any }) {
    return (
      <label class="block text-xs font-medium text-neutral-500 mb-1.5">
        {props.children}
      </label>
    )
  }

  const [previewingSpeed, setPreviewingSpeed] = createSignal(false)
  createEffect(() => {
    if (!previewingSpeed()) return;

    // auto looping playback
    videoEl.playbackRate = store.options.speed
    videoEl.currentTime = store.options.start
    videoEl.play()

    createEffect(() => {
      if (videoTime() >= store.options.end) {
        videoEl.currentTime = store.options.start
        videoEl.play()
      }
    })
  })

  const cardClass = "bg-white rounded-2xl b-1 b-solid b-neutral-200 shadow-sm flex flex-col";
  const rowTextClass = "text-sm text-neutral-700";

  return <div class="flex flex-col gap-3">

    {/* Video + timeline card */}
    <div class={cardClass + " overflow-hidden"}>
      <video
        ref={x => (videoEl = x)}
        src={store.fileInfo.url}
        class="optionEditor-video w-full h-72 outline-0 bg-neutral-900"
        classList={{'outline-2 outline-solid outline-amber-400 outline-offset--2': previewingSpeed()}}
        controls muted
        onfocus={() => setPreviewingSpeed(false)}
        ontimeupdate={x => setVideoTime(x.currentTarget.currentTime)}
      />
      <div
        class="flex h-4 relative overflow-hidden outline-0 bg-neutral-900 b-0"
        ref={e => (timelineEl = e)}
        tabindex={-1}
        onPointerDown={handleSeekingOnBar}
        onKeyDown={handleKeypressOnBar}
      >
        <TimelineThumb class="bg-amber-400" time={videoTime()} onUpdate={seekTo} />
        <TimelineThumb class="bg-emerald-400" time={store.options.start} onUpdate={t => { seekTo(t), updateStore('options', 'start', t) }} />
        <TimelineThumb class="bg-sky-400" time={store.options.end} onUpdate={t => { seekTo(t), updateStore('options', 'end', t) }} />
      </div>
      <div class="flex bg-neutral-50">
        <div style={{ "width": t2p(videoTime()), "flex-shrink": 1 }}></div>
        <div class="flex items-stretch shrink-0 b-0 b-l-2 b-solid b-amber-400 ml--0.5 h-9">
          <button class={btnClass} onClick={() => { updateStore('options', 'start', videoTime()) }}>
            <i class="i-mdi-arrow-expand-right"></i> as start
          </button>
          <NumberInput precise={2} value={videoTime()} onChange={seekTo} />
          <button class={btnClass} onClick={() => { updateStore('options', 'end', videoTime()) }}>
            as end <i class="i-mdi-arrow-expand-left"></i>
          </button>
        </div>
      </div>
    </div>

    {/* Three option cards */}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">

      {/* Trimming */}
      <div class={cardClass + " p-5 gap-4"}>
        <OptionGroupHeader>
          <i class="i-mdi-content-cut"></i> Trimming
        </OptionGroupHeader>

        <div class={rowClass}>
          <OptionLabel>Range</OptionLabel>
          <div class="flex items-center gap-2">
            <NumberInput class="b-l-3 b-l-emerald-400 b-l-solid" precise={2} min={0} max={store.options.end} value={store.options.start} onChange={t => { updateStore('options', 'start', t); seekTo(t) }} />
            <span class="text-neutral-400">–</span>
            <NumberInput class="b-l-3 b-l-sky-400 b-l-solid" precise={2} min={store.options.start} max={store.fileInfo.duration} value={store.options.end} onChange={t => { updateStore('options', 'end', t); seekTo(t) }} />
          </div>
        </div>

        <div class={rowClass}>
          <OptionLabel><i class="i-mdi-play-speed"></i> Speed</OptionLabel>
          <NumberInput
            defaults={1} precise={2} step={0.25} min={0} max={10}
            value={store.options.speed}
            onChange={t => { updateStore('options', 'speed', t); setPreviewingSpeed(true) }}
          />
        </div>

        <div class={rowClass}>
          <OptionLabel>Framerate</OptionLabel>
          <div class="flex items-center gap-2">
            <NumberInput value={store.options.framerate} onChange={t => { updateStore('options', 'framerate', t); }} min={1} max={60} />
            <span class="text-sm text-neutral-500">fps</span>
          </div>
        </div>

        <div class={rowClass}>
          <OptionLabel>Duration</OptionLabel>
          <div class={rowTextClass}>
            ≈ {outputTimeRange().duration.toFixed(2)}s
            <span class="text-neutral-500"> ({outputTimeRange().frameCount} frames)</span>
          </div>
        </div>
      </div>

      {/* Dimension */}
      <div class={cardClass + " p-5 gap-4"}>
        <OptionGroupHeader>
          <i class="i-mdi-move-resize"></i> Dimension
        </OptionGroupHeader>

        <div class={rowClass}>
          <OptionLabel>Width</OptionLabel>
          <div class="flex items-center gap-2">
            <NumberInput value={store.options.width} min={-1} defaults={-1} onChange={t => { updateStore('options', 'width', t) }} />
            {store.options.width === -1 && <span class="text-sm text-neutral-400">(auto)</span>}
          </div>
        </div>

        <div class={rowClass}>
          <OptionLabel>Height</OptionLabel>
          <div class="flex items-center gap-2">
            <NumberInput value={store.options.height} min={-1} defaults={-1} onChange={t => { updateStore('options', 'height', t) }} />
            {store.options.height === -1 && <span class="text-sm text-neutral-400">(auto)</span>}
          </div>
        </div>

        <div class={rowClass}>
          <OptionLabel>Original</OptionLabel>
          <div class={rowTextClass + " font-mono"}>{store.fileInfo.width} × {store.fileInfo.height}</div>
        </div>

        <div class={rowClass}>
          <OptionLabel>Output</OptionLabel>
          <div class={rowTextClass + " font-mono"}>{outputSize().width} × {outputSize().height}</div>
        </div>
      </div>

      {/* GIF Output */}
      <div class={cardClass + " p-5 gap-4"}>
        <OptionGroupHeader>
          <i class="i-mdi-package-down"></i> GIF Output
        </OptionGroupHeader>

        <div class={rowClass}>
          <OptionLabel>Max Colors</OptionLabel>
          <select
            class={selectClass}
            value={store.options.maxColors}
            onChange={e => { updateStore('options', 'maxColors', parseInt(e.currentTarget.value)) }}
          >
            {[255, 128, 64, 32, 24, 16, 8, 4].map(x => <option value={x}>{x}</option>)}
          </select>
        </div>

        <div class={rowClass}>
          <OptionLabel>Dither</OptionLabel>
          <select
            class={selectClass}
            value={store.options.dither}
            onChange={e => { updateStore('options', 'dither', e.currentTarget.value) }}
          >
            {ditherOptions.map(x => <option value={x}>{x}</option>)}
          </select>
        </div>

        <div class={rowClass}>
          <OptionLabel>Watermark</OptionLabel>
          <select
            class={selectClass}
            value={String(store.options.watermarkIndex)}
            onChange={e => {
              let value: any = e.currentTarget.value
              if (value === '(add)') {
                updateStore('watermarks', m => [...m, getDefaultWatermark()])
                value = store.watermarks.length - 1
              }
              updateStore('options', 'watermarkIndex', parseInt(value))
            }}
          >
            <option value="-1">none</option>
            <Index each={store.watermarks}>
              {(x, i) => <option value={String(i)}>{i}. {x().name}</option>}
            </Index>

            <option value="(add)">+ new watermark</option>
          </select>

          <Show when={store.options.watermarkIndex >= 0}>
            <WatermarkEdit />
          </Show>
        </div>
      </div>

    </div>
  </div>
}

function NumberInput(props: {
  value: number
  defaults?: number
  precise?: number
  step?: number
  onChange?: (v: number) => void
  class?: string
  min?: number
  max?: number
}) {
  const getDisplayNum = () => props.value.toFixed(props.precise ?? 0)
  return <input
    class={"bg-white b-1 b-solid b-neutral-200 hover:b-neutral-300 focus:b-indigo-400 rounded-md text-neutral-800 font-mono text-sm px-2 py-1 w-24 text-right outline-0 transition-colors " + (props.class || '')}
    value={getDisplayNum()}
    min={props.min}
    max={props.max}
    step={props.step ?? 1}
    type="number"
    onChange={e => {
      const val = parseFloat(e.currentTarget.value);
      if (Number.isNaN(val)) {
        e.currentTarget.value = String(props.defaults ?? getDisplayNum())
        if (typeof props.defaults === 'number') props.onChange?.(props.defaults)
        return
      }
      return props.onChange?.(val);
    }}
  />
}

function WatermarkEdit() {
  const watermark = createMemo(() => store.watermarks[store.options.watermarkIndex])
  const updateWatermark = (...args: [Partial<WatermarkConfig>]) => updateStore('watermarks', store.options.watermarkIndex, ...args)

  const wmBtn = "inline-flex items-center gap-1 bg-white b-1 b-solid b-neutral-200 hover:bg-neutral-50 text-neutral-700 cursor-pointer text-xs rounded-md px-2 py-1 transition-colors";

  return <>
    <div class="flex gap-2 mt-2">
      <button class={wmBtn} onClick={() => {
        const idx = store.options.watermarkIndex
        updateStore('watermarks', m => m.filter((_, i) => i !== idx))
        if (idx >= store.watermarks.length) updateStore('options', 'watermarkIndex', store.watermarks.length - 1)
      }}>
        <i class="i-mdi-delete"></i> delete
      </button>

      <button class={wmBtn} onClick={() => {
        const idx = store.options.watermarkIndex
        updateStore('watermarks', m => {
          const m2 = m.slice()
          m2.splice(idx, 0, { ...m2[idx] })
          return m2
        })
        updateStore('options', 'watermarkIndex', idx + 1)
      }}>
        <i class="i-mdi-content-copy"></i> duplicate
      </button>
    </div>

    <Show when={!!watermark()}>
      <div class="mt-3 text-sm flex flex-col gap-2">
        <div>
          <label class="block text-xs font-medium text-neutral-500 mb-1">Text</label>
          <input
            class="bg-neutral-50 text-neutral-800 b-1 b-solid b-neutral-200 hover:b-neutral-300 focus:b-indigo-400 rounded-md px-2 py-1 w-full transition-colors"
            value={watermark().text}
            onChange={e => { updateWatermark({ text: e.currentTarget.value }) }}
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-neutral-500 mb-1">Extra</label>
          <div class="relative">
            <textarea
              class="optionEditorWatermarkExtra"
              spellcheck={false}
              value={JSON5.stringify(watermark(), null, 2)}
              onChange={e => {
                try {
                  updateWatermark({ ...JSON5.parse(e.currentTarget.value) })
                } catch (err) {
                  e.currentTarget.value = JSON5.stringify(watermark(), null, 2)
                }
              }}
            />

            <div class="optionEditorWatermarkExtraNotice">
              <div><b>location</b>: {Object.values(watermarkLocation).join(', ')}</div>
              <div><b>textAlign</b>: {Object.values(watermarkTextAlign).join(', ')}</div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  </>
}
