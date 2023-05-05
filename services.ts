import { createService } from './configureService'

export const getCustomers = createService({
  name: 'getCustomers',
  baseUrl: 'https://example.com',
  path: '/api/customers/{customerId}',
  method: 'GET',
  usesAccessToken: true,
  usesIdToken: true,
  acceptType: 'json',
  contentType: 'json',
  prefer: 'example=populated',
});

export const getCustomerProfile = createService({
  name: 'getCustomerProfile',
  baseUrl: 'https://example.com',
  path: '/api/customers/{customerId}/location/{locationId}',
  method: 'GET',
  usesAccessToken: true,
  usesIdToken: true,
  acceptType: 'json',
  contentType: 'json',
  prefer: 'example={customerId}',
});

export const editCustomerProfile = createService({
  name: 'editCustomerProfile',
  baseUrl: 'https://example.com',
  path: '/api/customers/{customerId}',
  method: 'PATCH',
  usesAccessToken: true,
  usesIdToken: true,
  acceptType: 'json',
  contentType: 'json',
  prefer: 'example={customerId}',
});

export const logIn = createService({
  name: 'logIn',
  baseUrl: 'https://example.com',
  path: '/api/login',
  method: 'POST',
  usesAccessToken: false,
  usesIdToken: false,
  acceptType: 'json',
  contentType: 'json',
});

export const logOut = createService({
  name: 'logOut',
  baseUrl: 'https://example.com',
  path: '/api/logout',
  method: 'POST',
  usesAccessToken: true,
  usesIdToken: true,
  acceptType: 'json',
  contentType: 'json',
});

export const requestPasswordReset = createService({
  name: 'requestPasswordReset',
  baseUrl: 'https://example.com',
  path: '/api/password-reset/request',
  method: 'POST',
  usesAccessToken: false,
  usesIdToken: false,
  acceptType: 'text',
  contentType: 'json',
});

export const resetPassword = createService({
  name: 'resetPassword',
  baseUrl: 'https://example.com',
  path: '/api/password-reset/confirm',
  method: 'POST',
  usesAccessToken: false,
  usesIdToken: false,
  acceptType: 'text',
  contentType: 'json',
});
