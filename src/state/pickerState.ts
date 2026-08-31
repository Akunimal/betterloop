import { MagicPickerOptions, FileResult } from '../webmcp-types';

type PickerState = {
  isOpen: boolean;
  options: MagicPickerOptions;
  resolvePromise: ((result: FileResult) => void) | null;
};

class PickerStateManager {
  private state: PickerState = {
    isOpen: false,
    options: {},
    resolvePromise: null
  };

  private listeners: Array<(state: PickerState) => void> = [];

  constructor() {
    // A real WebMCP implementation aborts pending executions when the target
    // document is unloaded. This fallback keeps the local polyfill from
    // leaving a stale modal behind during a full-page navigation.
    window.addEventListener('pagehide', (event) => {
      if (!event.persisted && this.state.resolvePromise) {
        this.complete({
          success: false,
          error: 'File request was cancelled because the page was unloaded'
        });
      }
    });
  }

  getState(): PickerState {
    return this.state;
  }

  setState(newState: Partial<PickerState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: PickerState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  requestFile(options: MagicPickerOptions = {}, signal?: AbortSignal): Promise<FileResult> {
    return new Promise((resolve) => {
      if (signal?.aborted) {
        resolve({
          success: false,
          error: 'File request was cancelled before the picker opened'
        });
        return;
      }

      if (this.state.resolvePromise) {
        this.complete({
          success: false,
          error: 'File request was replaced by a newer request'
        });
      }

      let settled = false;
      const settle = (result: FileResult) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', handleAbort);
        resolve(result);
      };
      const handleAbort = () => {
        if (this.state.resolvePromise === settle) {
          this.complete({
            success: false,
            error: 'File request was cancelled because the browser flow changed'
          });
        }
      };

      signal?.addEventListener('abort', handleAbort, { once: true });
      this.setState({
        isOpen: true,
        options,
        resolvePromise: settle
      });
    });
  }

  complete(result: FileResult) {
    const { resolvePromise } = this.state;
    if (resolvePromise) {
      resolvePromise(result);
    }
    this.setState({
      isOpen: false,
      resolvePromise: null
    });
  }
}

export const pickerState = new PickerStateManager();
