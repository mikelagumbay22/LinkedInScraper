"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Contact {
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  email_address: string;
  phone_number: string;
  linkedin_url: string;
}

interface ContactsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  company: string;
  contacts: Contact[];
}

export function ContactsDialog({ isOpen, onClose, company, contacts }: ContactsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] !w-[800px] w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{`Contacts at ${company}`}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-auto space-y-6">
          {contacts.map((contact, index) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <h3 className="text-lg font-semibold mb-2">
                {contact.first_name} {contact.last_name}
              </h3>
              <div className="ml-4 space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">Position:</span> {contact.position}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Department:</span> {contact.department}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Email:</span>{" "}
                  <a href={`mailto:${contact.email_address}`} className="text-blue-500 hover:underline">
                    {contact.email_address}
                  </a>
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Phone:</span>{" "}
                  <a href={`tel:${contact.phone_number}`} className="text-blue-500 hover:underline">
                    {contact.phone_number}
                  </a>
                </p>
                {contact.linkedin_url && (
                  <p className="text-gray-700">
                    <span className="font-medium">LinkedIn:</span>{" "}
                    <a 
                      href={contact.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      View LinkedIn
                      <svg 
                        className="w-4 h-4" 
                        fill="currentColor" 
                        viewBox="0 0 24 24" 
                        aria-hidden="true"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 