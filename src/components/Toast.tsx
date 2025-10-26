'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }[type]

  const icon = {
    success: '✓',
    error: '✗',
    info: 'ℹ'
  }[type]

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}>
        <div className="text-2xl font-bold">{icon}</div>
        <div className="flex-1 font-medium">{message}</div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white text-xl font-bold leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
