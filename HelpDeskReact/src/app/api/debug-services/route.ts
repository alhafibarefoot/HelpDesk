
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: services, error } = await supabase.from('services').select('*');
    return NextResponse.json({ services, error });
}
