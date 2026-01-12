'use server';

import { createClient } from "@/lib/supabase-server";

export interface LookupOption {
    label: string;
    value: any;
}

export async function fetchLookupOptions(
    sourceType: 'api' | 'global' | 'static',
    config: { endpoint?: string; lookupKey?: string; options?: any[] }
): Promise<LookupOption[]> {

    if (sourceType === 'static') {
        return (config.options || []).map((o: any) => ({
            label: o.label || o.value,
            value: o.value
        }));
    }

    if (sourceType === 'global') {
        // Fetch from internal tables (e.g. departments, users)
        const supabase = await createClient();
        if (config.lookupKey === 'departments') {
            // Mock department fetch if table doesn't exist, or fetch from 'departments'
            // For now return static list or query distinct departments from users
            const { data } = await supabase.from('users').select('department').neq('department', null);
            const depts = Array.from(new Set(data?.map(u => u.department))).map(d => ({ label: d, value: d }));
            return depts as LookupOption[];
        }
        if (config.lookupKey === 'users') {
            const { data } = await supabase.from('users').select('id, full_name');
            return (data || []).map(u => ({ label: u.full_name, value: u.id }));
        }
        return [];
    }

    if (sourceType === 'api' && config.endpoint) {
        try {
            // Security: In prod, whitelist domains or use proxy
            const res = await fetch(config.endpoint);
            const data = await res.json();

            // Assume API returns { data: [{id, name}, ...] } or similar
            // Simple mapping heuristic
            if (Array.isArray(data)) {
                return data.map(item => ({
                    label: item.name || item.label || item.title || JSON.stringify(item),
                    value: item.id || item.value || item.key || item
                }));
            }
            return [];
        } catch (e) {
            console.error("Lookup API Error", e);
            return [];
        }
    }

    return [];
}
