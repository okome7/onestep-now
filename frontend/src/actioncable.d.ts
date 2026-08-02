declare module '@rails/actioncable' {
  type SubscriptionCallbacks = {
    connected?: () => void
    disconnected?: () => void
    rejected?: () => void
    received?: (data: unknown) => void
  }

  type Subscription = {
    unsubscribe: () => void
  }

  type Consumer = {
    subscriptions: {
      create: (
        identifier: Record<string, string>,
        callbacks: SubscriptionCallbacks,
      ) => Subscription
    }
    disconnect: () => void
  }

  export function createConsumer(url?: string): Consumer
}
