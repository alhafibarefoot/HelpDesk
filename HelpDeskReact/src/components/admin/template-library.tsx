import React, { useState, useEffect } from 'react';
import { FileText, Star, Clock, TrendingUp, Search, Filter, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { getWorkflowTemplates } from '@/app/actions';

interface WorkflowTemplate {
    id: string;
    name: string;
    name_ar: string;
    description?: string;
    description_ar?: string;
    category: string;
    tags: string[];
    complexity_score: number;
    estimated_duration_hours: number;
    usage_count: number;
    is_featured: boolean;
    is_system: boolean;
    definition: any;
}

interface TemplateLibraryProps {
    onSelectTemplate: (template: WorkflowTemplate) => void;
    onClose: () => void;
}

export function TemplateLibrary({ onSelectTemplate, onClose }: TemplateLibraryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const data = await getWorkflowTemplates();
                setTemplates(data || []);
            } catch (error) {
                console.error('Failed to fetch templates:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const categories = [
        { id: 'all', label: 'الكل', icon: '📋' },
        { id: 'general', label: 'عام', icon: '📄' },
        { id: 'hr', label: 'موارد بشرية', icon: '👥' },
        { id: 'finance', label: 'مالية', icon: '💰' },
        { id: 'it', label: 'تقنية معلومات', icon: '💻' },
        { id: 'procurement', label: 'مشتريات', icon: '🛒' },
        { id: 'custom', label: 'مخصص', icon: '⚙️' }
    ];

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description_ar?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const featuredTemplates = filteredTemplates.filter(t => t.is_featured);
    const regularTemplates = filteredTemplates.filter(t => !t.is_featured);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">📚 مكتبة القوالب</h2>
                        <Button variant="ghost" onClick={onClose}>✕</Button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="ابحث عن قالب..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="px-6 py-4 border-b border-gray-200 overflow-x-auto">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                                    selectedCategory === cat.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Featured Templates */}
                            {featuredTemplates.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Star className="text-yellow-500" size={20} />
                                        قوالب مميزة
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {featuredTemplates.map(template => (
                                            <TemplateCard
                                                key={template.id}
                                                template={template}
                                                onSelect={() => onSelectTemplate(template)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Regular Templates */}
                            {regularTemplates.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">جميع القوالب</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {regularTemplates.map(template => (
                                            <TemplateCard
                                                key={template.id}
                                                template={template}
                                                onSelect={() => onSelectTemplate(template)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {filteredTemplates.length === 0 && (
                                <div className="text-center py-12">
                                    <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                                    <p className="text-gray-600">لا توجد قوالب مطابقة</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

interface TemplateCardProps {
    template: WorkflowTemplate;
    onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
    const complexityColor =
        template.complexity_score <= 5 ? 'text-green-600' :
            template.complexity_score <= 15 ? 'text-yellow-600' :
                template.complexity_score <= 30 ? 'text-orange-600' : 'text-red-600';

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{template.name_ar}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{template.description_ar}</p>
                </div>
                {template.is_featured && (
                    <Star className="text-yellow-500 flex-shrink-0" size={16} fill="currentColor" />
                )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {tag}
                    </span>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{template.estimated_duration_hours}س</span>
                </div>
                <div className="flex items-center gap-1">
                    <TrendingUp size={12} className={complexityColor} />
                    <span className={complexityColor}>{template.complexity_score}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Copy size={12} />
                    <span>{template.usage_count}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    onClick={onSelect}
                    className="flex-1"
                    size="sm"
                >
                    <Copy size={14} className="ml-1" />
                    استخدام القالب
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                >
                    <Eye size={14} />
                </Button>
            </div>
        </div>
    );
}
