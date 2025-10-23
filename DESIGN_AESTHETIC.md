# Design Aesthetic Guide - Liturgist App

This document captures the visual design patterns used in the liturgist app for reuse in other projects.

## Color Palette

### Primary Colors
- **Blue**: `bg-blue-600`, `text-blue-600`, `hover:bg-blue-700`
  - Used for: Primary buttons, links, interactive elements
- **Purple**: `bg-purple-600`, `text-purple-600`, `border-purple-500`
  - Used for: Current/highlighted items, "CURRENT" badges
- **Green**: `bg-green-700`, `bg-green-100`, `bg-green-50`
  - Used for: Success states, filled positions
- **Red**: `bg-red-600`, `text-red-600`, `bg-red-50`
  - Used for: Empty states, warnings, required fields

### Secondary/Accent Colors
- **Yellow**: `bg-yellow-50`, `border-yellow-400`, `bg-yellow-300`
  - Used for: Hover states, warnings
- **Amber**: `bg-amber-50`, `border-amber-300`, `text-amber-900`
  - Used for: Important notices, locked states
- **Orange**: `bg-orange-600`, `text-orange-600`
  - Used for: Backup positions, secondary highlights
- **Gray**: `bg-gray-50` to `bg-gray-800`
  - Used for: Neutral states, disabled elements, text hierarchy

## Typography

### Font Stack
```javascript
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
```

### Text Sizes & Weights
```css
/* Headers */
text-2xl font-semibold  /* Main section headers */
text-xl font-semibold   /* Sub-section headers */
text-lg font-bold       /* Important notices */

/* Body Text */
text-sm font-medium     /* Standard body, buttons */
text-sm                 /* Regular body text */
text-xs                 /* Secondary info, timestamps */

/* Special States */
font-bold               /* Emphasis, current items */
font-semibold          /* Important but not primary */
```

## Layout Patterns

### Container/Card Pattern
```jsx
<div className="bg-white rounded-lg shadow-lg p-6">
  {/* Content */}
</div>
```

### Spacing System
- **Padding**: `p-3`, `p-4`, `p-6` (primary container padding)
- **Margins**: `mb-2`, `mb-3`, `mb-4` (consistent vertical rhythm)
- **Gaps**: `gap-2`, `gap-3` (flexbox/grid spacing)
- **Space-y**: `space-y-3` (vertical stack spacing)

## Component Patterns

### 1. Primary Button
```jsx
<button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
  Button Text
</button>
```

### 2. Secondary/Small Button
```jsx
<button className="px-3 py-1 rounded-md text-sm font-medium flex items-center bg-blue-600 text-white hover:bg-blue-700">
  <svg className="w-4 h-4 mr-1">{/* icon */}</svg>
  Button Text
</button>
```

### 3. Disabled Button
```jsx
<button 
  disabled
  className="bg-gray-400 text-gray-200 cursor-not-allowed py-2 px-4 rounded-lg"
>
  Disabled Text
</button>
```

### 4. Collapsible Card
```jsx
<div className={`border rounded-lg transition-all duration-300 ${
  isActive 
    ? 'border-purple-500 bg-purple-50 shadow-md'
    : 'border-gray-200 bg-white hover:border-gray-300'
}`}>
  <div className="p-3 cursor-pointer" onClick={toggleExpand}>
    {/* Header with expand icon */}
  </div>
  {isExpanded && (
    <div className="px-3 pb-3 border-t border-gray-200 pt-3">
      {/* Expanded content */}
    </div>
  )}
</div>
```

### 5. Status Badge/Pill
```jsx
{/* Success/Filled */}
<span className="font-semibold text-green-700 px-2 py-0.5 bg-green-50 rounded">
  FILLED
</span>

{/* Empty/Error */}
<span className="font-semibold text-red-600 px-2 py-0.5 bg-red-50 rounded">
  EMPTY
</span>

{/* Current/Active */}
<span className="text-xs font-bold text-purple-600 bg-purple-200 px-2 py-0.5 rounded">
  CURRENT
</span>
```

### 6. Input Field
```jsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Enter text"
/>
```

### 7. Select/Dropdown
```jsx
<select
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">-- Select --</option>
</select>
```

### 8. Radio Button Group
```jsx
<div className="space-y-2">
  <label className="flex items-center cursor-pointer">
    <input
      type="radio"
      className="mr-2"
    />
    <span className="text-sm">Option Label</span>
  </label>
</div>
```

### 9. Info Box / Notice
```jsx
{/* Warning/Alert */}
<div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
  <div className="flex items-start gap-3">
    <svg className="w-6 h-6 text-amber-600 flex-shrink-0">{/* icon */}</svg>
    <div>
      <h3 className="font-bold text-amber-900 text-lg mb-1">Title</h3>
      <p className="text-sm text-amber-800">Message text</p>
    </div>
  </div>
</div>

{/* Info/Note */}
<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="text-sm text-gray-700">
    Info message
  </div>
</div>

{/* Help Text */}
<div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
  <strong>Note:</strong> Help text here
</div>
```

### 10. Loading/Refresh Indicator
```jsx
<div className="bg-blue-500 text-white text-xs py-1 px-3 rounded-full shadow-lg flex items-center gap-2">
  <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
  Updating...
</div>
```

### 11. Modal Overlay
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
    {/* Modal content */}
  </div>
</div>
```

### 12. Fixed Sidebar/Widget
```jsx
<div className="fixed top-4 left-4 z-50 bg-white shadow-xl rounded-lg border-2 border-gray-200 w-80">
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

## Interaction Patterns

### 1. Hover States
```jsx
className="hover:bg-blue-700 transition-colors"
className="hover:border-gray-300"
className="hover:text-blue-700"
```

### 2. Transitions
```jsx
className="transition-all duration-300"
className="transition-colors"
className="transition-transform"
```

### 3. Disabled States
```jsx
className="opacity-50 cursor-not-allowed"
disabled={condition}
```

### 4. Focus States
```jsx
className="focus:outline-none focus:ring-2 focus:ring-blue-500"
```

### 5. Active/Selected States
```jsx
className={`
  ${isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'}
`}
```

## Icon Usage

### Using SVG Icons (Heroicons style)
```jsx
<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
</svg>
```

### Icon Sizes
- `w-4 h-4` - Small inline icons
- `w-5 h-5` - Standard icons
- `w-6 h-6` - Section header icons
- `w-8 h-8` - Large feature icons

### Icon Colors
- `text-blue-600` - Primary actions
- `text-gray-400` - Neutral/inactive
- `text-green-700` - Success
- `text-red-600` - Error/warning
- `text-purple-600` - Active/current

## Calendar/Grid Pattern

```jsx
<div className="grid grid-cols-7 gap-1 text-xs">
  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
    <div key={day} className="text-center font-medium text-gray-600 py-1">
      {day}
    </div>
  ))}
  {days.map((day, index) => (
    <div
      key={index}
      className={`text-center py-2 rounded text-xs transition-colors ${
        day.isToday ? 'bg-blue-600 text-white font-bold' :
        day.isSpecial ? 'bg-purple-600 text-white font-bold cursor-pointer' :
        day.hasContent ? 'bg-green-100 font-medium cursor-pointer hover:bg-green-200' :
        'text-gray-600'
      }`}
    >
      {day.number}
    </div>
  ))}
</div>
```

## Responsive Patterns

### Max Width Containers
```jsx
className="max-w-4xl mx-auto"  /* Main content */
className="max-w-md"            /* Modals */
```

### Mobile Optimization
```jsx
className="p-4 md:p-6"         /* Responsive padding */
className="text-sm md:text-base" /* Responsive text */
className="max-h-[90vh]"       /* Mobile-friendly heights */
```

## Shadow Hierarchy

```css
shadow-sm      /* Subtle elevation */
shadow-md      /* Standard cards */
shadow-lg      /* Primary sections */
shadow-xl      /* Modals, fixed elements */
```

## Border Radius Scale

```css
rounded        /* Small elements (4px) */
rounded-md     /* Buttons (6px) */
rounded-lg     /* Cards, containers (8px) */
rounded-full   /* Pills, badges, avatars */
```

## Key Design Principles

1. **Consistent Spacing**: Use multiples of 4px (p-2, p-3, p-4, p-6)
2. **Visual Hierarchy**: Bold for primary, semibold for secondary, regular for body
3. **Color Coding**: Blue=action, Green=success, Red=error, Purple=current/special
4. **Hover Feedback**: Always provide hover states on interactive elements
5. **Transitions**: Smooth transitions (300ms) for state changes
6. **White Space**: Don't be afraid of space - clean layouts breathe
7. **Borders**: Subtle borders (gray-200) for definition, bold colors for emphasis
8. **Shadows**: Use shadows to show elevation and importance
9. **Accessibility**: Good color contrast, focus states, semantic HTML
10. **Mobile First**: Consider touch targets, scrolling, and viewport constraints

## Quick Start Template

```jsx
export default function MyComponent() {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600">{/* icon */}</svg>
            Section Title
          </h2>
          
          <div className="space-y-3">
            {/* Card */}
            <div className="border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-all">
              <div className="p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-gray-800 text-sm">Item Title</p>
                  <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    {/* chevron icon */}
                  </svg>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-200 pt-3">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Primary Action
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
```

---

**Tech Stack:**
- Next.js 14 with App Router
- Tailwind CSS 3.x
- TypeScript
- Inter font from Google Fonts
