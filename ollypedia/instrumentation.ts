// ollypedia/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startKeepAlive } = await import('./src/lib/keep-alive');
    startKeepAlive();
  }
}