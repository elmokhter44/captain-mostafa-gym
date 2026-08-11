'use strict';

module.exports = [
  { name: 'Trainee', primaryKey: 'id', properties: {
    id: 'string', name: { type: 'string', indexed: true }, country: 'string', countryCode: 'string', phone: 'string',
    normalizedPhone: { type: 'string', indexed: true }, whatsappEnabled: { type: 'bool', default: true }, notes: 'string?',
    archived: { type: 'bool', default: false }, createdAt: 'date', updatedAt: 'date'
  }},
  { name: 'MembershipPlan', primaryKey: 'id', properties: {
    id: 'string', name: { type: 'string', indexed: true }, monthlyPrice: 'double', active: { type: 'bool', default: true }, createdAt: 'date', updatedAt: 'date'
  }},
  { name: 'Subscription', primaryKey: 'id', properties: {
    id: 'string', traineeId: { type: 'string', indexed: true }, planId: 'string', planNameSnapshot: 'string', monthlyPriceSnapshot: 'double',
    numberOfMonths: 'int', totalAmount: 'double', startDate: 'date', endDate: { type: 'date', indexed: true }, createdAt: 'date', updatedAt: 'date'
  }},
  { name: 'Payment', primaryKey: 'id', properties: {
    id: 'string', subscriptionId: { type: 'string', indexed: true }, traineeId: { type: 'string', indexed: true }, amount: 'double',
    paymentDate: 'date', method: 'string?', note: 'string?', createdAt: 'date'
  }},
  { name: 'WhatsAppReminder', primaryKey: 'id', properties: {
    id: 'string', traineeId: { type: 'string', indexed: true }, subscriptionId: { type: 'string', indexed: true }, phone: 'string',
    scheduledDate: { type: 'date', indexed: true }, sentAt: 'date?', status: { type: 'string', indexed: true }, message: 'string',
    errorMessage: 'string?', createdAt: 'date', updatedAt: 'date'
  }},
  { name: 'AppSettings', primaryKey: 'id', properties: {
    id: 'string', gymName: 'string', currency: 'string', reminderDays: 'int', whatsappMode: 'string', whatsappAutoSend: 'bool',
    whatsappMessageTemplate: 'string', graphVersion: 'string', phoneNumberId: 'string', whatsappTemplateName: 'string',
    whatsappTemplateLanguage: 'string', createdAt: 'date', updatedAt: 'date'
  }},
  { name: 'AuditLog', primaryKey: 'id', properties: {
    id: 'string', action: { type: 'string', indexed: true }, entityType: 'string', entityId: 'string?', description: 'string', createdAt: 'date'
  }}
];
