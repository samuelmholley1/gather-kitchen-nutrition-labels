'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ReportContext } from '@/lib/types/report';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
  version?: string;
  context: ReportContext;
  preselectedIngredient?: { id: string; name: string; quantity?: number; units?: string };
  breakdownSnapshot?: unknown;
  totals?: { kcal: number; carbs: number; protein: number; fat: number } | null;
  laypersonSummary?: string;
  onSubmit?: (data: any) => void;
}

/**
 * Modal for reporting nutrition calculation issues.
 * Features:
 * - Ingredient-specific or recipe-level reporting
 * - Read-only calculation breakdown display
 * - Reason selection (self-evident or custom comment)
 * - Honeypot protection
 * - Focus trap and keyboard navigation
 */
export function ReportIssueModal({
  isOpen,
  onClose,
  recipeId,
  recipeName,
  version,
  context,
  preselectedIngredient,
  breakdownSnapshot,
  totals,
  laypersonSummary,
  onSubmit,
}: ReportIssueModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLElement>(null);

  const [reasonType, setReasonType] = useState<'self_evident' | 'comment'>('self_evident');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ccInfoGather, setCcInfoGather] = useState(false);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus on close button when modal opens
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Check if form is valid
  const isFormValid = reasonType === 'self_evident' || (reasonType === 'comment' && comment.trim().length > 0);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Please select a reason and provide a comment if needed');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reportId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const clientNonce = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);

      const payload = {
        reportId,
        recipeId,
        recipeName,
        version: version || '1.0',
        context,
        ...(context === 'ingredient' && preselectedIngredient ? {
          ingredientId: preselectedIngredient.id,
          ingredientName: preselectedIngredient.name,
        } : {}),
        reasonType,
        comment: reasonType === 'comment' ? comment : undefined,
        ccInfoGather,
        breakdownSnapshot: laypersonSummary 
          ? { ...(typeof breakdownSnapshot === 'object' && breakdownSnapshot !== null ? breakdownSnapshot : {}), laypersonSummary } 
          : breakdownSnapshot,
        totals,
        userAgent,
        clientNonce,
        favorite_color: '', // Honeypot
      };

      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setComment('');
        setReasonType('self_evident');
        setCcInfoGather(false);
      }, 2000);

      if (onSubmit) {
        onSubmit(payload);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="alertdialog"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description"
      >
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl pointer-events-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b">
            <div>
              <h2 id="report-modal-title" className="text-xl font-semibold">
                Report Issue
              </h2>
              <p id="report-modal-description" className="text-sm text-gray-600 mt-1">
                {recipeName}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              aria-label="Close modal"
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Email destination info */}
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Email Recipients</h3>
              <p className="text-blue-800 text-sm">
                THIS ERROR REPORT WILL BE EMAILED TO SAM@SAMUELHOLLEY.COM SO THAT SAMUEL CAN FIX IT. INFO@GATHER.KITCHEN CAN BE COPIED AS WELL IF YOU WOULD LIKE.
              </p>
              <label className="flex items-center gap-3 cursor-pointer group mt-3">
                <input
                  type="checkbox"
                  checked={ccInfoGather}
                  onChange={(e) => setCcInfoGather(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                />
                <span className="font-medium text-sm group-hover:text-blue-600">
                  Also send to info@gather.kitchen
                </span>
              </label>
            </section>
            {/* Ingredient Context Info (if ingredient-specific) */}
            {context === 'ingredient' && preselectedIngredient && (
              <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Reporting Issue With:</h3>
                <p className="text-blue-800 font-medium">
                  {preselectedIngredient.name}
                  {preselectedIngredient.quantity && (
                    <span className="text-blue-600 ml-2">
                      ({preselectedIngredient.quantity}{preselectedIngredient.units ? ` ${preselectedIngredient.units}` : ''})
                    </span>
                  )}
                </p>
              </section>
            )}

            {/* Section A: Calculation Breakdown */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
              <div className="bg-gray-50 rounded p-4 max-h-48 overflow-y-auto border border-gray-200">
                <dl className="space-y-2">
                  {totals && Object.keys(totals).length > 0 ? (
                    Object.entries(totals).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="font-medium text-gray-700">{key}:</dt>
                        <dd className="text-gray-900">{String(value)}</dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No totals available</p>
                  )}
                </dl>
              </div>
            </section>

            {/* Section B: Reason Selection */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Reason</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value="self_evident"
                    checked={reasonType === 'self_evident'}
                    onChange={() => setReasonType('self_evident')}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-medium text-sm group-hover:text-blue-600">
                    The error is self-evident
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value="comment"
                    checked={reasonType === 'comment'}
                    onChange={() => setReasonType('comment')}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="font-medium text-sm group-hover:text-blue-600">
                    I want to explain
                  </span>
                </label>

                {reasonType === 'comment' && (
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                    placeholder="Please explain what's wrong..."
                    maxLength={2000}
                    disabled={isSubmitting}
                    className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:opacity-50"
                    aria-label="Explanation"
                  />
                )}
                {reasonType === 'comment' && (
                  <div className="text-xs text-gray-500">
                    {comment.length} / 2000 characters
                  </div>
                )}
              </div>
            </section>

            {/* Honeypot (hidden) */}
            <input type="hidden" name="favorite_color" value="" />

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                ✓ Report submitted successfully. Thank you!
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-6 border-t bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Cancel
            </button>
            <form onSubmit={handleSubmit} className="contents">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
