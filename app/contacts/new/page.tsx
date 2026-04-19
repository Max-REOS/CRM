import ContactForm from '@/components/ContactForm';

export default function NewContactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Neuer Kontakt</h1>
        <p className="text-gray-500 text-sm mt-1">Fügen Sie einen neuen Kontakt zur Pipeline hinzu</p>
      </div>
      <ContactForm />
    </div>
  );
}
