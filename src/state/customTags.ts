// src/state/customTags.ts  — extra tags the user adds in Tag Manager (kept on this device).
import { createStore } from './persistedStore';
export type CustomTag = { tag: string; label: string; unit: string };
export const MAX_CUSTOM_TAGS = 15; // SecureStore values are small, so keep this list short
export const customTagsStore = createStore('tags.v1', { tags: [] as CustomTag[] });
export const addCustomTag = (t: CustomTag) => {
  const cur = customTagsStore.get().tags;
  if (cur.length >= MAX_CUSTOM_TAGS || cur.some((x) => x.tag === t.tag)) return false;
  customTagsStore.set({ tags: [...cur, t] });
  return true;
};
export const removeCustomTag = (tag: string) => customTagsStore.set({ tags: customTagsStore.get().tags.filter((t) => t.tag !== tag) });

/** Hook: the user's custom tags. */
export const useCustomTags = () => customTagsStore.useStore();