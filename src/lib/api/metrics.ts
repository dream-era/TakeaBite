import { createBrowserSupabase } from '@/lib/supabase/client';
import { StaffRole } from '@/types/database';

export async function fetchStaffDailyMetrics(restaurantId: string, role: StaffRole) {
  const supabase = createBrowserSupabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startOfDay.toISOString());

  if (error || !orders) {
    return { completed: 0, pending: 0, avgTime: '0 min', recentActivity: [] };
  }

  let completed = 0;
  let pending = 0;
  let totalTime = 0;
  let completedCount = 0;

  const activities: { id: string; message: string; time: string }[] = [];

  const isCook = role === 'cook' || role === 'chef';
  const isJuice = role === 'juice_maker' || role === 'juice';

  orders.forEach(order => {
    // Determine if this order is relevant to the staff member
    const hasFood = order.order_items.some((i: any) => i.station === 'food' || i.station === 'both');
    const hasJuice = order.order_items.some((i: any) => i.station === 'juice' || i.station === 'both');

    let isRelevant = false;
    if (isCook) isRelevant = hasFood;
    else if (isJuice) isRelevant = hasJuice;
    else isRelevant = true; // Servant sees all

    if (isRelevant) {
      if (order.status === 'served' || order.status === 'ready' || order.status === 'completed') {
        completed++;
        
        const created = new Date(order.created_at).getTime();
        const updated = new Date(order.updated_at).getTime();
        
        if (updated > created) {
          totalTime += (updated - created);
          completedCount++;
        }

        activities.push({
          id: order.id,
          message: isCook || isJuice ? `Order #${order.daily_order_number || order.id.slice(0, 6)} prepared` : `Order #${order.daily_order_number || order.id.slice(0, 6)} delivered`,
          time: new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

      } else if (order.status !== 'cancelled') {
        pending++;
        
        activities.push({
          id: order.id,
          message: `New order #${order.daily_order_number || order.id.slice(0, 6)} received`,
          time: new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }
  });

  const avgMs = completedCount > 0 ? totalTime / completedCount : 0;
  const avgMinutes = Math.round(avgMs / 60000);

  // Sort activities by time (newest first) and take top 5
  activities.sort((a, b) => {
    const timeA = new Date(`1970/01/01 ${a.time}`).getTime();
    const timeB = new Date(`1970/01/01 ${b.time}`).getTime();
    return timeB - timeA;
  });

  return {
    completed,
    pending,
    avgTime: `${avgMinutes} min`,
    recentActivity: activities.slice(0, 5)
  };
}
