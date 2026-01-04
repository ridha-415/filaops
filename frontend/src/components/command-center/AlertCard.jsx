/**
 * AlertCard - Display a single action item requiring attention
 *
 * Shows priority-based styling with title, description, and action buttons.
 */
import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/formatting';

/**
 * Priority configurations
 */
const priorityConfig = {
  1: {
    label: 'Critical',
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    icon: (
      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    badge: 'bg-red-500/20 text-red-400'
  },
  2: {
    label: 'High',
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/10',
    icon: (
      <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    badge: 'bg-orange-500/20 text-orange-400'
  },
  3: {
    label: 'Medium',
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    icon: (
      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    badge: 'bg-yellow-500/20 text-yellow-400'
  },
  4: {
    label: 'Low',
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    badge: 'bg-blue-500/20 text-blue-400'
  }
};

/**
 * Type-specific icons
 */
const typeIcons = {
  blocked_po: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  overdue_so: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  due_today_so: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  overrunning_op: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  idle_resource: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  )
};

export default function AlertCard({
  type,
  priority,
  title,
  description,
  entityType: _entityType,
  entityId: _entityId,
  entityCode: _entityCode,
  suggestedActions = [],
  createdAt,
  metadata: _metadata = {}
}) {
  const config = priorityConfig[priority] || priorityConfig[4];
  const typeIcon = typeIcons[type];

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        {/* Priority icon */}
        <div className="flex-shrink-0 mt-0.5">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {typeIcon && (
                <span className="text-gray-400">{typeIcon}</span>
              )}
              <h4 className="text-white font-medium truncate">
                {title}
              </h4>
            </div>
            <span className={`${config.badge} text-xs px-2 py-0.5 rounded-full whitespace-nowrap`}>
              {config.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mt-1">
            {description}
          </p>

          {/* Timestamp */}
          {createdAt && (
            <p className="text-gray-500 text-xs mt-2">
              {formatRelativeTime(createdAt)}
            </p>
          )}

          {/* Actions */}
          {suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestedActions.map((action, idx) => (
                <Link
                  key={idx}
                  to={action.url}
                  className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
