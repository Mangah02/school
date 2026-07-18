// apps/web/src/components/layout/global-search.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Users, GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  students: any[];
  staff: any[];
  books: any[];
  total_results: number;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 400); // Wait 400ms after typing stops

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch data when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults(null);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        // Calls the Phase 10.3 Search Endpoint
        const res = await api.get('/search', { params: { q: debouncedQuery } });
        setResults(res.data);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-lg px-3 py-2 text-sm transition w-64"
      >
        <Search className="h-4 w-4" />
        <span>Search students, staff, books...</span>
        <kbd className="absolute right-2 pointer-events-none hidden md:inline-block h-5 select-none items-center gap-1 rounded border bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-600 opacity-100">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Type a name, admission number, or ISBN..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}
          
          {!loading && results && results.total_results === 0 && (
            <CommandEmpty>No results found for "{query}".</CommandEmpty>
          )}

          {!loading && results && results.total_results > 0 && (
            <>
              {results.students.length > 0 && (
                <CommandGroup heading="Students">
                  {results.students.map((student) => (
                    <CommandItem key={student.id} className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{student.first_name} {student.last_name}</span>
                      </div>
                      <Badge variant="outline">{student.admission_number}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.staff.length > 0 && (
                <CommandGroup heading="Staff">
                  {results.staff.map((staff) => (
                    <CommandItem key={staff.id} className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-green-500" />
                        <span>{staff.first_name} {staff.last_name}</span>
                      </div>
                      <Badge variant="outline">{staff.employee_id}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.books.length > 0 && (
                <CommandGroup heading="Library Books">
                  {results.books.map((book) => (
                    <CommandItem key={book.id} className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-purple-500" />
                        <span>{book.title}</span>
                      </div>
                      <Badge variant="outline">{book.isbn}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
          
          {!loading && !results && (
            <div className="p-8 text-center text-sm text-gray-500">
              Start typing to search across the entire school database...
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}