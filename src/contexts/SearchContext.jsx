import { createContext, useState, useContext } from 'react';

export const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext);
