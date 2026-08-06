import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: () => 'blob:test-image',
})

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: () => undefined,
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: class ResizeObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}
  },
})

// jsdom does not decode media or implement Canvas. These small browser API
// shims let upload tests exercise the real thumbnail-generation flow without
// replacing the component's implementation.
Object.defineProperty(globalThis, 'Image', {
  configurable: true,
  value: class ImageMock {
    decoding = 'async'
    naturalWidth = 640
    naturalHeight = 360
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  },
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => ({
    fillStyle: '#ffffff',
    fillRect: () => undefined,
    drawImage: () => undefined,
  }),
})

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  configurable: true,
  value: (callback: BlobCallback) => {
    callback(new Blob(['test-thumbnail'], { type: 'image/jpeg' }))
  },
})

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  configurable: true,
  value: 640,
})

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  configurable: true,
  value: 360,
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value(this: HTMLMediaElement) {
    queueMicrotask(() => this.dispatchEvent(new Event('loadeddata')))
  },
})
