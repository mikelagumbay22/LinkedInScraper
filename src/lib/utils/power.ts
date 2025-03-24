export class PowerManager {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported: boolean = 'wakeLock' in navigator;

  async preventSleep() {
    if (!this.isSupported) {
      console.warn('Wake Lock API is not supported in this browser');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock is active');
      return true;
    } catch (err) {
      console.error('Error activating Wake Lock:', err);
      return false;
    }
  }

  async allowSleep() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake Lock released');
      } catch (err) {
        console.error('Error releasing Wake Lock:', err);
      }
    }
  }
} 