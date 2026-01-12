import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

interface ServiceInfo {
    key: string;
    name: string;
    description: string;
    fields: Array<{
        id: string;
        label: string;
        type: string;
        required?: boolean;
        options?: string[];
    }>;
}

export async function POST(request: NextRequest) {
    try {
        const { userInput, image, availableServices } = await request.json();

        if ((!userInput && !image) || !availableServices) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log('[Parse User Request] Processing request:', { hasText: !!userInput, hasImage: !!image });

        // Ensure API key is available for Vercel AI SDK
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
            process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
        }

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.error('[Parse User Request] Missing API Key');
            throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY');
        }

        const systemPrompt = `أنت مساعد ذكي لنظام إدارة الخدمات. مهمتك هي فهم طلب المستخدم (سواء نص أو صورة) واستخراج المعلومات المطلوبة.

**الخدمات المتاحة:**
${availableServices.map((s: ServiceInfo) => `
- ${s.name} (${s.key})
  الوصف: ${s.description}
  الحقول المطلوبة:
${s.fields.map(f => `  * ${f.label} (${f.type})${f.required ? ' - مطلوب' : ''}`).join('\n')}
`).join('\n')}

**المطلوب منك:**
1. حدد الخدمة الأنسب من القائمة أعلاه بناءً على النص أو محتوى الصورة المرفقة (مثل نموذج ورقي، رسالة، لقطة شاشة).
2. استخرج قيم الحقول من نص المستخدم أو الصورة.
3. إذا كانت هناك معلومات ناقصة، استخدم قيم افتراضية معقولة أو اتركها فارغة.

**الرد يجب أن يكون JSON فقط بهذا الشكل:**
{
  "serviceKey": "meeting-room-booking",
  "serviceName": "حجز قاعة اجتماعات",
  "formData": {
    "اسم الحقل": "القيمة",
    "تاريخ الحجز": "2024-12-05",
    ...
  },
  "confidence": 0.95
}

**ملاحظات مهمة:**
- استخدم أسماء الحقول بالعربية كما هي في قائمة الحقول
- للتواريخ استخدم صيغة YYYY-MM-DD
- للأوقات استخدم صيغة HH:MM
- confidence يجب أن يكون بين 0 و 1
- إذا لم تكن متأكداً من الخدمة، اختر الأقرب وقلل confidence

أرجع JSON فقط بدون أي نص إضافي.`;

        // Prepare messages for Multimodal input
        const messages: any[] = [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userInput || 'Analyze this image and map it to a service.' },
                    ...(image ? [{ type: 'image', image: image.split(',')[1] || image }] : []) // Remove data URL prefix if present
                ]
            }
        ];

        const { text } = await generateText({
            model: google('models/gemini-2.0-flash'),
            messages: messages, // Use messages instead of prompt
        });

        console.log('[Parse User Request] AI Response:', text);

        // Extract JSON from response
        let jsonText = text.trim();

        // Remove markdown code blocks if present
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        const parsed = JSON.parse(jsonText);

        // Validate the response
        if (!parsed.serviceKey || !parsed.serviceName || !parsed.formData) {
            throw new Error('Invalid AI response format');
        }

        // Verify service exists
        const serviceExists = availableServices.some((s: ServiceInfo) => s.key === parsed.serviceKey);
        if (!serviceExists) {
            throw new Error('AI selected an invalid service');
        }

        return NextResponse.json(parsed);

    } catch (error) {
        console.error('[Parse User Request] Error:', error);
        return NextResponse.json(
            {
                error: 'فشل في معالجة الطلب',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
