'use client'

import { useEffect, useState } from 'react'
import { useRevenueCat } from '@/providers/RevenueCat'

export type SubscriptionStatus = {
  isSubscribed: boolean
  entitlements: string[]
  expirationDate: Date | null
  isLoading: boolean
  error: Error | null
}

export const useSubscription = (entitlementId?: string): SubscriptionStatus => {
  const { customerInfo, isLoading: isRevenueCatLoading, error: revenueCatError } = useRevenueCat()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    entitlements: [],
    expirationDate: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // First check with RevenueCat client-side
        if (customerInfo) {
          const entitlements = customerInfo.entitlements?.active || {};
          const activeEntitlementKeys = Object.keys(entitlements);

          const isCurrentlySubscribed = entitlementId
            ? activeEntitlementKeys.includes(entitlementId)
            : activeEntitlementKeys.length > 0;

          if (isCurrentlySubscribed) {
            setSubscriptionStatus({
              isSubscribed: true,
              entitlements: activeEntitlementKeys,
              expirationDate: entitlementId && entitlements[entitlementId]?.expirationDate
                ? new Date(entitlements[entitlementId].expirationDate)
                : activeEntitlementKeys.length > 0 && entitlements[activeEntitlementKeys[0]]?.expirationDate
                  ? new Date(entitlements[activeEntitlementKeys[0]].expirationDate)
                  : null,
              isLoading: false,
              error: null,
            });
            return;
          }
        }

        // If not subscribed client-side, check with the API
        const response = await fetch('/api/check-subscription', {
          credentials: 'include',
        })

        // DETAILED LOGGING START
        console.log('useSubscription - API Response Status:', response.status);
        console.log('useSubscription - API Response OK:', response.ok);
        
        const responseData = await response.json();
        
        if (response.status === 401) {
          // User is not authenticated
          setSubscriptionStatus({
            isSubscribed: false,
            entitlements: [],
            expirationDate: null,
            isLoading: false,
            error: new Error('User not authenticated'),
          });
          return;
        }

        if (responseData.error) {
          console.error('useSubscription - API Error:', responseData.error);
          throw new Error(responseData.error);
        }

        setSubscriptionStatus({
          isSubscribed: responseData.hasActiveSubscription,
          entitlements: responseData.activeEntitlements || [],
          expirationDate: null,
          isLoading: false,
          error: null,
        });

      } catch (err) {
        console.error('useSubscription - Error in checkSubscription:', err);
        setSubscriptionStatus({
          isSubscribed: false,
          entitlements: [],
          expirationDate: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error checking subscription'),
        });
      }
    };

    // Always check subscription when the component mounts or when dependencies change
    checkSubscription();
  }, [customerInfo, entitlementId]);

  return subscriptionStatus;
} 