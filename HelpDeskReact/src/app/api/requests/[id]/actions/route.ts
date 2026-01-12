import { updateRequestStatus } from "@/app/actions";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const { action, comment } = await request.json();

        // Map API 'action' to updateRequestStatus 'status'
        // 'approve' -> 'قيد التنفيذ' (Proceed to next step)
        // 'reject' -> 'مرفوض'

        let status = 'قيد التنفيذ';
        if (action === 'reject') status = 'مرفوض';
        if (action === 'complete') status = 'مكتمل';

        // Delegate to the Server Action logic
        const result = await updateRequestStatus(id, status, comment);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

    } catch (e: any) {
        console.error("Workflow Action API Error", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
