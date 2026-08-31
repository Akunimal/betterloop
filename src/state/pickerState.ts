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

  async requestFile(options: MagicPickerOptions = {}): Promise<FileResult> {
    return new Promise((resolve) => {
      this.setState({
        isOpen: true,
        options,
        resolvePromise: resolve
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
