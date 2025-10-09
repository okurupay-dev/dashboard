import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus, Edit, Trash2, User, Mail, Phone, MapPin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  billing_address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SavedContactsProps {
  onSelectContact?: (contact: Contact) => void;
  showSelectMode?: boolean;
  onClose?: () => void;
}

const SavedContacts: React.FC<SavedContactsProps> = ({ onSelectContact, showSelectMode = false, onClose }) => {
  const { userData } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    billing_address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    },
    notes: ''
  });

  // Load contacts from database
  const loadContacts = async () => {
    if (!userData?.merchant_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('merchant_id', userData.merchant_id)
        .order('name');

      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }

      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [userData?.merchant_id]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      billing_address: {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      },
      notes: ''
    });
    setEditingContact(null);
    setShowAddForm(false);
  };

  const handleSaveContact = async () => {
    if (!userData?.merchant_id || !formData.name || !formData.email) {
      alert('Please fill in required fields (Name and Email)');
      return;
    }

    try {
      const contactData = {
        merchant_id: userData.merchant_id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        billing_address: formData.billing_address.street ? formData.billing_address : null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        alert('Contact updated successfully!');
      } else {
        // Create new contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            ...contactData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        alert('Contact saved successfully!');
      }

      resetForm();
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact. Please try again.');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      billing_address: contact.billing_address || {
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      },
      notes: contact.notes || ''
    });
    setEditingContact(contact);
    setShowAddForm(true);
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Contact deleted successfully!');
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact. Please try again.');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {showSelectMode ? 'Select a Contact' : 'Saved Contacts'}
          </h2>
          <p className="text-gray-600">
            {showSelectMode 
              ? 'Choose a contact to auto-fill invoice details'
              : 'Manage your customer contacts for quick invoice creation'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search - Only show if there are contacts */}
      {contacts.length > 0 && (
        <div className="relative">
          <Input
            type="text"
            placeholder="Search contacts by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>
      )}

      {/* Add/Edit Contact Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingContact ? 'Edit Contact' : 'Add New Contact'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Billing Address</h4>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  value={formData.billing_address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    billing_address: { ...formData.billing_address, street: e.target.value }
                  })}
                  placeholder="Street address"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={formData.billing_address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, city: e.target.value }
                    })}
                    placeholder="City"
                  />
                  <Input
                    value={formData.billing_address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, state: e.target.value }
                    })}
                    placeholder="State/Province"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    value={formData.billing_address.postal_code}
                    onChange={(e) => setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, postal_code: e.target.value }
                    })}
                    placeholder="Postal code"
                  />
                  <Input
                    value={formData.billing_address.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      billing_address: { ...formData.billing_address, country: e.target.value }
                    })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveContact} className="bg-blue-600 hover:bg-blue-700">
                {editingContact ? 'Update Contact' : 'Save Contact'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts List */}
      <div className={`grid gap-4 ${
        showSelectMode 
          ? 'grid-cols-1 max-w-2xl mx-auto' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {filteredContacts.map((contact) => (
          <Card 
            key={contact.id} 
            className={`transition-all duration-200 ${
              showSelectMode 
                ? 'hover:shadow-lg hover:border-blue-300 cursor-pointer border-2 border-transparent'
                : 'hover:shadow-md'
            }`}
            onClick={showSelectMode && onSelectContact ? () => onSelectContact(contact) : undefined}
          >
            <CardContent className="p-6">
              {showSelectMode ? (
                // Enhanced layout for selection mode
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
                        {contact.company && (
                          <p className="text-sm font-medium text-blue-600">{contact.company}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditContact(contact);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(contact.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {contact.billing_address?.city && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="text-gray-700">
                            <div>{contact.billing_address.street}</div>
                            <div>{contact.billing_address.city}, {contact.billing_address.state} {contact.billing_address.postal_code}</div>
                            {contact.billing_address.country && (
                              <div>{contact.billing_address.country}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectContact?.(contact);
                      }}
                    >
                      Select Contact
                    </Button>
                  </div>
                </div>
              ) : (
                // Original compact layout for management mode
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                      {contact.company && (
                        <p className="text-sm text-gray-600">{contact.company}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditContact(contact)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.billing_address?.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{contact.billing_address.city}, {contact.billing_address.state}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No contacts match your search.' : 'Start by adding your first contact.'}
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Contact
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default SavedContacts;
