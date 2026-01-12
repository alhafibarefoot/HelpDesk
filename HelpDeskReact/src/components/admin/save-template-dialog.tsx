import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveWorkflowTemplate } from '@/app/actions';
import { Loader2 } from 'lucide-react';

interface SaveTemplateDialogProps {
    definition: any;
    onClose: () => void;
    onSave: () => void;
}

export function SaveTemplateDialog({ definition, onClose, onSave }: SaveTemplateDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name_ar: '',
        description_ar: '',
        category: 'general',
        tags: '',
        complexity_score: 5,
        estimated_duration_hours: 24
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const templateData = {
                ...formData,
                name: formData.name_ar, // Fallback for English name
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                definition,
                is_system: false,
                is_featured: false,
                usage_count: 0
            };

            await saveWorkflowTemplate(templateData);
            onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save template:', error);
            alert('فشل حفظ القالب');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">حفظ كقالب جديد</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name_ar">اسم القالب</Label>
                        <Input
                            id="name_ar"
                            required
                            value={formData.name_ar}
                            onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                            placeholder="مثال: طلب إجازة اعتيادية"
                        />
                    </div>

                    <div>
                        <Label htmlFor="description_ar">الوصف</Label>
                        <Textarea
                            id="description_ar"
                            value={formData.description_ar}
                            onChange={e => setFormData({ ...formData, description_ar: e.target.value })}
                            placeholder="وصف مختصر للقالب..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="category">التصنيف</Label>
                            <select
                                id="category"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="general">عام</option>
                                <option value="hr">موارد بشرية</option>
                                <option value="finance">مالية</option>
                                <option value="it">تقنية معلومات</option>
                                <option value="procurement">مشتريات</option>
                                <option value="custom">مخصص</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="estimated_duration">المدة المتوقعة (ساعات)</Label>
                            <Input
                                id="estimated_duration"
                                type="number"
                                min="1"
                                value={formData.estimated_duration_hours}
                                onChange={e => setFormData({ ...formData, estimated_duration_hours: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="tags">الوسوم (مفصولة بفاصلة)</Label>
                        <Input
                            id="tags"
                            value={formData.tags}
                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="إجازة, سنوية, HR"
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            حفظ القالب
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
