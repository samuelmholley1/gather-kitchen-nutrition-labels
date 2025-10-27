'use client'

import { useState } from 'react'

interface ParseIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  lineNumber?: number
  originalLine?: string
  actionable?: boolean
  actionLabel?: string
  onAction?: () => void
}

interface ParseIssuesPanelProps {
  issues: ParseIssue[]
  onDismissIssue?: (index: number) => void
  className?: string
}

export default function ParseIssuesPanel({
  issues,
  onDismissIssue,
  className = ''
}: ParseIssuesPanelProps) {
  const [dismissedIssues, setDismissedIssues] = useState<Set<number>>(new Set())

  if (issues.length === 0) return null

  const visibleIssues = issues.filter((_, index) => !dismissedIssues.has(index))

  if (visibleIssues.length === 0) return null

  const handleDismiss = (index: number) => {
    setDismissedIssues(prev => new Set([...Array.from(prev), index]))
    onDismissIssue?.(index)
  }

  const getIssueIcon = (type: ParseIssue['type']) => {
    switch (type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  const getIssueColor = (type: ParseIssue['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-800 bg-red-50 border-red-200'
      case 'warning':
        return 'text-amber-800 bg-amber-50 border-amber-200'
      case 'info':
        return 'text-blue-800 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-800 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`border-2 rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">🔧</span>
          Parse Issues & Actions
        </h3>
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
          {visibleIssues.length} issue{visibleIssues.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {visibleIssues.map((issue, visibleIndex) => {
          // Find the original index in the full issues array
          const originalIndex = issues.findIndex((_, idx) => !dismissedIssues.has(idx) && idx === issues.indexOf(issue))

          return (
            <div
              key={originalIndex}
              className={`border rounded-lg p-4 ${getIssueColor(issue.type)}`}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 text-lg">
                  {getIssueIcon(issue.type)}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="font-medium mb-1">
                    {issue.message}
                  </div>

                  {issue.originalLine && (
                    <div className="mt-2 p-2 bg-white/50 rounded text-sm font-mono border">
                      {issue.originalLine}
                    </div>
                  )}

                  {issue.lineNumber && (
                    <div className="mt-1 text-xs opacity-75">
                      Line {issue.lineNumber}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {issue.actionable && issue.onAction && (
                    <button
                      onClick={issue.onAction}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 transition-colors font-medium"
                    >
                      {issue.actionLabel || 'Fix'}
                    </button>
                  )}

                  {onDismissIssue && (
                    <button
                      onClick={() => handleDismiss(originalIndex)}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded transition-colors"
                      title="Dismiss this issue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {visibleIssues.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              const allIndices = issues.map((_, idx) => idx).filter(idx => !dismissedIssues.has(idx))
              allIndices.forEach(idx => handleDismiss(idx))
            }}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Dismiss all issues
          </button>
        </div>
      )}
    </div>
  )
}