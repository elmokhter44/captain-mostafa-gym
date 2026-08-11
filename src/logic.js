'use strict';

const PLAN_DEFAULTS = [
  { id: 'bodybuilding', name: 'كمال أجسام', monthlyPrice: 300 },
  { id: 'rehab', name: 'تأهيل', monthlyPrice: 1500 },
  { id: 'military', name: 'تأهيل عسكري', monthlyPrice: 1000 },
  { id: 'body-diet', name: 'كمال أجسام + تخسيس + برنامج نظام غذائي', monthlyPrice: 700 },
  { id: 'body-height', name: 'كمال أجسام + زيادة طول', monthlyPrice: 450 }
];

function dateOnly(value = new Date()) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addCalendarMonthsInclusive(startValue, months) {
  const start = dateOnly(startValue);
  const count = Math.max(1, Number(months) || 1);
  const target = new Date(start.getFullYear(), start.getMonth() + count, start.getDate());
  if (target.getDate() !== start.getDate()) target.setDate(0);
  target.setDate(target.getDate() - 1);
  return dateOnly(target);
}

function daysUntil(endValue, nowValue = new Date()) {
  const ms = dateOnly(endValue) - dateOnly(nowValue);
  return Math.ceil(ms / 86400000);
}

function subscriptionStatus(endValue, nowValue = new Date()) {
  const days = daysUntil(endValue, nowValue);
  if (days < 0) return 'expired';
  if (days <= 2) return 'expiring';
  return 'active';
}

function normalizePhone(countryCode = '+20', phone = '') {
  let cc = String(countryCode || '+20').replace(/[^\d+]/g, '');
  if (!cc.startsWith('+')) cc = `+${cc.replace(/^0+/, '')}`;
  let local = String(phone || '').replace(/\D/g, '');
  if (local.startsWith('00')) local = local.slice(2);
  const ccDigits = cc.replace(/\D/g, '');
  if (local.startsWith(ccDigits)) return `+${local}`;
  local = local.replace(/^0+/, '');
  return `${cc}${local}`;
}

function money(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

module.exports = { PLAN_DEFAULTS, dateOnly, addCalendarMonthsInclusive, daysUntil, subscriptionStatus, normalizePhone, money };
