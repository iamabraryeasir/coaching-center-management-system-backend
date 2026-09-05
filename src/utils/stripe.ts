import Stripe from 'stripe';
import { config } from '../config';
import { ApiError } from './api-error';

export const stripe = new Stripe(config.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  typescript: true,
});

/**
 * Validates that Stripe secret key is configured in the environment
 */
export const ensureStripeConfigured = (): void => {
  if (!config.STRIPE_SECRET_KEY || config.STRIPE_SECRET_KEY.trim().length === 0) {
    throw ApiError.internal('Stripe payment gateway is not configured on this server.');
  }
};
