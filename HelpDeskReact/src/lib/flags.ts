export const featureFlags = {
    // Phase 1-5
    taskInbox: true,
    delegation: true,
    slaEngine: true,
    conditionalRouting: true,
    lookupFields: true,

    // Phase 6
    commentsMentions: true, // Enable by default as we just shipped it
    notifications: true,

    // Phase 7 (New)
    automationEngine: true,

    // Future
    analytics: false,
};

export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
    return featureFlags[feature];
}
