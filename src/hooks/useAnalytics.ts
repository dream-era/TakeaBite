export function useAnalytics() {
  // Set to false to indicate no real data source is connected
  const isDataConnected = false;

  return {
    isDataConnected,
    hasOrders: false,
    businessHealth: null,
    kpis: null,
    salesTrend: [],
    highDemandProducts: [],
    insights: null,
  };
}
