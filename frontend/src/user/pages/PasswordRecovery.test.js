import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import PasswordRecovery from './PasswordRecovery';
import { useHttpClient } from '../../shared/hooks/http-hook';

jest.mock('../../shared/hooks/http-hook');
let container;
let sendRequest;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  sendRequest = jest.fn().mockResolvedValue({});
  useHttpClient.mockReturnValue({ isLoading: false, error: null, sendRequest, clearError: jest.fn() });
});
afterEach(() => {
  act(() => { ReactDOM.unmountComponentAtNode(container); });
  container.remove();
});
const render = (reset, search = '') => act(() => {
  ReactDOM.render(<MemoryRouter initialEntries={['/' + search]}><PasswordRecovery reset={reset} /></MemoryRouter>, container);
});
const change = (id, value) => act(() => Simulate.change(container.querySelector('#' + id), { target: { value } }));
const submit = () => act(async () => { Simulate.submit(container.querySelector('form')); });

test('requests a reset email and shows a neutral confirmation', async () => {
  render(false);
  change('reset-email', 'hiker@example.com');
  await submit();
  expect(sendRequest).toHaveBeenCalledWith('/api/users/forgot-password', 'POST', JSON.stringify({ email: 'hiker@example.com' }), { 'Content-Type': 'application/json' });
  expect(container.textContent).toContain('If an account exists');
  expect(container.querySelector('form')).toBeNull();
});
test('invalid link offers recovery without showing a password form', () => {
  render(true, '?token=bad');
  expect(container.textContent).toContain('Invalid reset link');
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('a[href="/forgot-password"]')).not.toBeNull();
  expect(sendRequest).not.toHaveBeenCalled();
});
test('requires matching passwords then submits the token from the URL', async () => {
  const token = 'ab'.repeat(32);
  render(true, '?token=' + token);
  change('new-password', 'NewPassword123');
  change('confirm-password', 'DifferentPassword');
  await submit();
  expect(sendRequest).not.toHaveBeenCalled();
  expect(container.textContent).toContain('passwords do not match');
  change('confirm-password', 'NewPassword123');
  await submit();
  expect(sendRequest).toHaveBeenCalledWith('/api/users/reset-password', 'POST', JSON.stringify({ token, password: 'NewPassword123' }), { 'Content-Type': 'application/json' });
  expect(container.textContent).toContain('Password updated');
  expect(container.querySelector('input[type="password"]')).toBeNull();
});
test('server errors are visible and offer a fresh reset link', () => {
  useHttpClient.mockReturnValue({ isLoading: false, error: 'This password reset link is invalid or has expired.', sendRequest, clearError: jest.fn() });
  render(true, '?token=' + 'ab'.repeat(32));
  expect(container.querySelector('[role="alert"]').textContent).toContain('expired');
  expect(container.querySelector('a[href="/forgot-password"]')).not.toBeNull();
});
