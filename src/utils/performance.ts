// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(label);
    return duration;
  }

  static logTimer(label: string): number {
    const duration = this.endTimer(label);
    console.log(`⏱️ ${label}: ${Math.round(duration)}ms`);
    return duration;
  }

  static async measureAsync<T>(
    label: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> {
    this.startTimer(label);
    try {
      const result = await asyncFn();
      this.logTimer(label);
      return result;
    } catch (error) {
      this.logTimer(`${label} (failed)`);
      throw error;
    }
  }
}

// Database query optimization helpers
export const QueryOptimizer = {
  // Batch multiple queries into a single Promise.all
  batchQueries: async <T>(queries: Array<() => Promise<T>>): Promise<T[]> => {
    return Promise.all(queries.map(query => query()));
  },

  // Batch queries with individual error handling
  batchQueriesSettled: async <T>(queries: Array<() => Promise<T>>): Promise<PromiseSettledResult<T>[]> => {
    return Promise.allSettled(queries.map(query => query()));
  },

  // Create a debounced function for search/filter operations
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  // Create a throttled function for scroll/resize events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
};

// Memory usage monitoring
export const MemoryMonitor = {
  logMemoryUsage: (label: string = 'Memory Usage') => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`${label}:`, {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      });
    }
  }
};
