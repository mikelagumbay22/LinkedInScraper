export class ProxyManager {
  private proxies: string[] = [
    // Add your proxy list here or use a proxy service API
    'http://proxy1:port',
    'http://proxy2:port',
    // Add more proxies
  ];
  private currentIndex = 0;

  getNextProxy(): string {
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }
}