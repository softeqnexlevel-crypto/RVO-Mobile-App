// src/state/settingsStore.ts
import { createStore } from './persistedStore';
export const settingsStore = createStore('settings.v1', { refreshSec: 10 as 5 | 10 | 30 });

/** Hook: app settings (recording interval). */
export const useSettings = () => settingsStore.useStore();