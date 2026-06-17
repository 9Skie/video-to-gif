import { Show, createEffect, createMemo, createRoot, type Component } from 'solid-js';
import { store, updateStore } from './store';
import { FileSelector } from './components/FileSelector';
import { OptionEditor } from './components/OptionEditor';
import { ProcessingBar } from './components/Processing';
import { OutputDisplay } from './components/OutputDisplay';
import { FileSelector2 } from './components/FileSelector2';

const App: Component = () => {
  let out = createMemo(() => {
    return store.outputFileURL && <OutputDisplay />
  })

  return (
    <div class="App min-h-screen px-4 sm:px-6">
      <header class='text-center my-20'>
        <h1 class='text-6xl font-thin my-10 tracking-tight text-neutral-900'>Video to GIF</h1>
        <p class='text-neutral-500'>Convert in local browser, no uploading</p>
      </header>

      <Show when={!store.fileInfo.url}>
        <FileSelector />
      </Show>

      {store.file && <FileSelector2 />}
      <Show when={store.fileInfo.url}>
        <div class='mx-auto max-w-5xl'>
          <OptionEditor />

          <a
            href="#" class='mt-2 block text-sm text-neutral-500 text-center hover:text-indigo-600 transition-colors decoration-none'
            onClick={() => updateStore({ file: null, fileInfo: { ...store.fileInfo, url: '' } })}
          >Choose another file...</a>

          <ProcessingBar />
          {out()}
        </div>
      </Show>

      <footer class="text-center my-20 text-sm text-neutral-500">
        Made by @lyonbot, <a href="https://github.com/lyonbot/video-to-gif" class='text-indigo-600 hover:underline decoration-none' target='_blank'>Open-Sourced</a>
      </footer>
    </div>
  );
}

export default App;
