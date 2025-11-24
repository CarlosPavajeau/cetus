export function createQueryKeys<T extends string>(domain: T) {
  return {
    all: [domain] as const,
    lists: () => [...createQueryKeys(domain).all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...createQueryKeys(domain).lists(), filters] as const,
    details: () => [...createQueryKeys(domain).all, 'detail'] as const,
    detail: (id: string) => [...createQueryKeys(domain).details(), id] as const,
  }
}
