/**
 * ADMIN WHITELIST
 * 
 * This list defines email addresses that should AUTOMATICALLY be granted
 * Admin privileges upon login. This is a secure way to bootstrap the
 * first admin in a new environment (Production/Staging).
 */
const admins = import.meta.env.VITE_ADMIN_EMAILS || '';
export const ADMIN_WHITELIST = admins.split(',').map(email => email.trim());
