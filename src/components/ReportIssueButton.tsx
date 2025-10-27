'use client';

import React, { useState } from 'react';
import { ReportIssueModal } from './ReportIssueModal';
import type { FlaggedIngredient } from '@/lib/types/report';

interface ReportIssueButtonProps {
  recipeId: string;
  recipeName: string;
  ingredients: FlaggedIngredient[];
  totals?: Record<string, any>;
  breakdownSnapshot?: Record<string, any>;
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
  ingredients,
  totals,
  breakdownSnapshot,
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
        ingredients={ingredients}
        totals={totals}
        breakdownSnapshot={breakdownSnapshot}
        onSubmit={handleSubmit}
      />
    </>
  );
}
