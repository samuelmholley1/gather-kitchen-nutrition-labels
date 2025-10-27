'use client';

import React, { useState } from 'react';
import { ReportIssueModal } from './ReportIssueModal';
import type { ReportContext } from '@/lib/types/report';

interface ReportIssueButtonProps {
  recipeId: string;
  recipeName: string;
  version?: string;
  context: ReportContext;
  preselectedIngredient?: { id: string; name: string; quantity?: number; units?: string };
  breakdownSnapshot?: unknown;
  totals?: { kcal: number; carbs: number; protein: number; fat: number } | null;
  buttonText?: string;
  buttonClassName?: string;
  onReportSubmitted?: (reportId: string) => void;
}

/**
 * Button component that triggers the ReportIssueModal.
 * Manages modal state and provides a user-friendly interface.
 */
export function ReportIssueButton({
  recipeId,
  recipeName,
  version,
  context,
  preselectedIngredient,
  breakdownSnapshot,
  totals,
  buttonText = '🚨 Report issue',
  buttonClassName = 'text-blue-600 hover:text-blue-800 underline text-sm',
  onReportSubmitted,
}: ReportIssueButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (data: any) => {
    // Extract reportId from response if available
    if (onReportSubmitted && data.reportId) {
      onReportSubmitted(data.reportId);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={buttonClassName}
        type="button"
        aria-label="Report issue with nutrition calculation"
      >
        {buttonText}
      </button>

      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recipeId={recipeId}
        recipeName={recipeName}
        version={version}
        context={context}
        preselectedIngredient={preselectedIngredient}
        breakdownSnapshot={breakdownSnapshot}
        totals={totals}
        onSubmit={handleSubmit}
      />
    </>
  );
}
