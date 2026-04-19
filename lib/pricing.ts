import { Contact, ContactType, TierInterest } from './types';

const MONTHLY_PRICES: Record<ContactType, Record<TierInterest, number>> = {
  Baufinanzierer: { Bronze: 3000, Silver: 6000, Gold: 8000, Enterprise: 12000 },
  Immobilienmakler: { Bronze: 1000, Silver: 2500, Gold: 4000, Enterprise: 6000 },
};

export const ACTIVATION_FEE = 3500;

export function getMonthlyPrice(type: ContactType, tier: TierInterest): number {
  return MONTHLY_PRICES[type][tier];
}

export function calculateContactRevenue(contact: Contact): number {
  return getMonthlyPrice(contact.type, contact.tier) * 3 + ACTIVATION_FEE;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function calculatePipelineStats(contacts: Contact[]) {
  let confirmedRevenue = 0;
  let pipelineValue = 0;
  for (const c of contacts) {
    const rev = calculateContactRevenue(c);
    if (c.status === 'Abgeschlossen') confirmedRevenue += rev;
    else if (c.status !== 'Abgelehnt') pipelineValue += rev;
  }
  return { confirmedRevenue, pipelineValue };
}

export function getFollowUpStatus(
  followUpDate: string
): 'overdue' | 'today' | 'upcoming' | null {
  if (!followUpDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fup = new Date(followUpDate);
  fup.setHours(0, 0, 0, 0);
  if (fup < today) return 'overdue';
  if (fup.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}
