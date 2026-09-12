export type AppEventSyncPayload = {
  eventId: string;
  type: 'interest' | 'save' | 'delete' | 'create';
  isInterested?: boolean;
  newInterestedCount?: number;
  interestedCountDelta?: number;
  isSaved?: boolean;
  event?: any;
};

type AppEventSyncListener = (payload: AppEventSyncPayload) => void;

class AppEventSyncBus {
  private listeners = new Set<AppEventSyncListener>();

  emit(payload: AppEventSyncPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('[AppEventSync] Listener error:', e);
      }
    });
  }

  subscribe(listener: AppEventSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const appEventSync = new AppEventSyncBus();
