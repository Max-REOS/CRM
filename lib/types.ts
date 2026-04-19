export type ContactType = 'Baufinanzierer' | 'Immobilienmakler';
export type TierInterest = 'Bronze' | 'Silver' | 'Gold' | 'Enterprise';
export type ContactStatus =
  | 'Offen'
  | 'Kontaktiert'
  | 'Gespräch geführt'
  | 'Angebot gesendet'
  | 'Abgeschlossen'
  | 'Abgelehnt';

export interface Lead {
  id: string;
  company: string;
  contactPerson: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  bundesland: string;
  type: ContactType;
  segment: string;
  called: boolean;
  notes: string;
}

export interface Contact {
  id: string;
  company: string;
  contactPerson: string;
  type: ContactType;
  phone: string;
  email: string;
  city: string;
  tier: TierInterest;
  status: ContactStatus;
  notes: string;
  lastContactDate: string;
  followUpDate: string;
  createdAt: string;
  updatedAt: string;
}
