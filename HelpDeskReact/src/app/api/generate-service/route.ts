import { NextRequest, NextResponse } from 'next/server';
import { generateServiceFromDescription } from '@/lib/ai-service-builder';

export async function POST(request: NextRequest) {
    try {
        console.log('[API Route] Received request');
        console.log('[API Route] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

        const { description, image } = await request.json();

        if ((!description || typeof description !== 'string') && !image) {
            return NextResponse.json(
                { error: 'Description or Image is required' },
                { status: 400 }
            );
        }

        console.log('[API Route] Calling generateServiceFromDescription with multimodal input...');
        // We need to modify generateServiceFromDescription to accept image or handle it here
        // For simplicity, let's pass a structured prompt if image exists

        const result = await generateServiceFromDescription(description, image);

        console.log('[API Route] Success!');
        return NextResponse.json(result);
    } catch (error) {
        console.error('[API Route] Error:', error);
        console.error('[API Route] Error stack:', error instanceof Error ? error.stack : 'No stack');
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate service' },
            { status: 500 }
        );
    }
}
