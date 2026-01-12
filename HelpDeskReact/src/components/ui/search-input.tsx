
'use client';

import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export function SearchInput({ placeholder }: { placeholder: string }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        params.set('page', '1'); // Reset to page 1 on search
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return (
        <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
                className="pr-10"
                placeholder={placeholder}
                onChange={(e) => handleSearch(e.target.value)}
                defaultValue={searchParams.get('q')?.toString()}
            />
        </div>
    );
}
