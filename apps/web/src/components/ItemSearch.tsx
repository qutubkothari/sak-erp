'use client';

import { useState, useEffect, useRef } from 'react';

interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  uom?: string;
  category?: string;
}

interface ItemSearchProps {
  value: string;
  onSelect: (item: Item) => void;
  placeholder?: string;
  className?: string;
}

export default function ItemSearch({ value, onSelect, placeholder, className }: ItemSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search items as user types
  useEffect(() => {
    const searchItems = async () => {
      if (searchQuery.trim().length < 2) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/v1/items/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setItems(data);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Error searching items:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchItems, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchQuery(`${item.code} - ${item.name}`);
    setShowDropdown(false);
    onSelect(item);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedItem(null);
    if (e.target.value.trim().length >= 2) {
      setShowDropdown(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
        className={className || "w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"}
        placeholder={placeholder || "Type to search items..."}
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              {searchQuery.length < 2 ? 'Type at least 2 characters' : 'No items found'}
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="p-3 hover:bg-amber-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium text-gray-900">{item.code} - {item.name}</div>
                {item.description && (
                  <div className="text-sm text-gray-600">{item.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {item.category && <span className="mr-3">Category: {item.category}</span>}
                  {item.uom && <span>UOM: {item.uom}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
