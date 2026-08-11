'use strict';

module.exports = [
  { name: 'Trainee', primaryKey: 'id', properties: {
    id: 'string', name: 'string', country: 'string', countryCode: 'string', phone: 'string', normalizedPhone: 'string',
    whatsappEnabled: { type: 'bool', default: true }, notes: { type: 'string', default: '' }, archived: { type: 'bool', default: false },
    createdAt: 'date', updatedAt: 'date'
  }},
  { name: 'Plan', primaryKey: 'id', properties: { id: 'string', name: 'string', monthlyPrice: 'double', active: { type: 'bool', default: true } }},
  { name: 'Subscription', primaryKey: 'id', properties: {
    id: 'string', traineeId: 'string', planId: 'string', planName: 'string', monthlyPrice: 'double', months: 'int', totalAmount: 'double',
    startDate: 'date', endDate: 'date', createdAt: 'date'
  }},
  { name: 'Payment', primaryKey: 'id', properties: {
    id: 'string', traineeId: 'string', subscriptionId: 'string', amount: 'double', paymentDate: 'date', method: { type: 'string', default: 'نقدي' }, note: { type: 'string', default: '' }, createdAt: 'date'
  }},
  { name: 'Reminder', primaryKey: 'id', properties: {
    id: 'string', traineeId: 'string', subscriptionId: 'string', scheduledDate: 'date', sentAt: 'date?', status: 'string', message: 'string', errorMessage: { type: 'string', default: '' }
  }},
  { name: 'Setting', primaryKey: 'key', properties: { key: 'string', value: 'string' }}
];
