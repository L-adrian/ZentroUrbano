export function isMobileUserAgent(userAgent: string) {
  return /Android|iPhone|iPod|IEMobile|Opera Mini|Mobile|SamsungBrowser/i.test(userAgent);
}
