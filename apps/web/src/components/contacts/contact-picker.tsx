"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useContacts } from "@/hooks/use-contacts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, X, Search, Loader2 } from "lucide-react";

interface ContactPickerProps {
  onSelect: (contactId: string | null, contactName: string | null) => void;
  selectedContactId?: string | null;
  selectedContactName?: string | null;
  placeholder?: string;
  excludeIds?: string[];
}

export function ContactPicker({
  onSelect,
  selectedContactId,
  selectedContactName,
  placeholder = "Select contact...",
  excludeIds = [],
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { contacts, isLoading } = useContacts({ limit: 50 });

  // Filter contacts by search and exclusions
  const filteredContacts = useMemo(() => {
    let filtered = contacts.filter((c) => !excludeIds.includes(c.id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.headline?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [contacts, searchQuery, excludeIds]);

  const handleSelect = (contactId: string, contactName: string) => {
    onSelect(contactId, contactName);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null, null);
  };

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select contact"
            className="flex-1 justify-between font-normal"
          >
            <span className={selectedContactName ? "" : "text-muted-foreground"}>
              {selectedContactName || placeholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border-0 bg-transparent p-0 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const initials = contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact.id, contact.name)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-secondary"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name}</p>
                    {contact.headline && (
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.headline}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
      {selectedContactId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Clear"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
