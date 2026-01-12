"use client"

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequestFiltersProps {
    onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
    search: string;
    status: string;
    priority: string;
    service: string;
}

const statusOptions = [
    { value: "", label: "جميع الحالات" },
    { value: "جديد", label: "جديد" },
    { value: "قيد المراجعة", label: "قيد المراجعة" },
    { value: "قيد التنفيذ", label: "قيد التنفيذ" },
    { value: "مكتمل", label: "مكتمل" },
    { value: "مرفوض", label: "مرفوض" },
];

const priorityOptions = [
    { value: "", label: "جميع الأولويات" },
    { value: "منخفض", label: "منخفض" },
    { value: "متوسط", label: "متوسط" },
    { value: "مرتفع", label: "مرتفع" },
    { value: "عاجل", label: "عاجل" },
];

export function RequestFilters({ onFilterChange }: RequestFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: "",
        priority: "",
        service: "",
    });

    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const emptyFilters = {
            search: "",
            status: "",
            priority: "",
            service: "",
        };
        setFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    const hasActiveFilters = filters.status || filters.priority || filters.service;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ابحث عن طلب..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Filter Toggle */}
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                >
                    <Filter className="w-4 h-4" />
                    فلترة
                    {hasActiveFilters && (
                        <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            •
                        </span>
                    )}
                </Button>

                {hasActiveFilters && (
                    <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                        <X className="w-4 h-4" />
                        مسح الفلاتر
                    </Button>
                )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            الحالة
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            الأولوية
                        </label>
                        <select
                            value={filters.priority}
                            onChange={(e) => handleFilterChange("priority", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            الخدمة
                        </label>
                        <input
                            type="text"
                            placeholder="اسم الخدمة..."
                            value={filters.service}
                            onChange={(e) => handleFilterChange("service", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
