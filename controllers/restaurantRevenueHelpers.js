const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');


// Helper: breakdown by day, month, year, with restaurantName in each order detail
async function getBreakdown(orders, withRestaurantName = false) {
  // If withRestaurantName, populate restaurant field
  if (withRestaurantName && orders.length && orders[0].populate) {
    await Promise.all(orders.map(o => o.populate('restaurant', 'name')));
  }
  const byDay = {};
  const byMonth = {};
  const byYear = {};

  orders.forEach(order => {
    const d = new Date(order.orderDate);
    const day = d.toISOString().slice(0, 10);
    const month = d.toISOString().slice(0, 7);
    const year = d.getFullYear().toString();
    const restaurantName = order.restaurant && order.restaurant.name ? order.restaurant.name : undefined;
    // For each breakdown, push order details
    if (!byDay[day]) byDay[day] = [];
    if (!byMonth[month]) byMonth[month] = [];
    if (!byYear[year]) byYear[year] = [];
    const detail = {
      orderId: order._id,
      totalPrice: order.totalPrice,
      restaurant: order.restaurant && order.restaurant._id ? order.restaurant._id : order.restaurant,
      restaurantName
    };
    byDay[day].push(detail);
    byMonth[month].push(detail);
    byYear[year].push(detail);
  });

  // For each breakdown, sum revenue and include order details
  return {
    byDay: Object.entries(byDay).map(([date, orders]) => ({ date, revenue: orders.reduce((s, o) => s + (o.totalPrice || 0), 0), orders })),
    byMonth: Object.entries(byMonth).map(([month, orders]) => ({ month, revenue: orders.reduce((s, o) => s + (o.totalPrice || 0), 0), orders })),
    byYear: Object.entries(byYear).map(([year, orders]) => ({ year, revenue: orders.reduce((s, o) => s + (o.totalPrice || 0), 0), orders })),
  };
}

module.exports = { getBreakdown };
