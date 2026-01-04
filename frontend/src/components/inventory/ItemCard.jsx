/**
 * ItemCard - Displays item with demand context.
 *
 * Shows on-hand, allocated, available quantities with visual status indicators.
 * Used throughout the app wherever items need to be displayed with demand info.
 */
import { Link } from 'react-router-dom';
import { useItemDemand } from '../../hooks/useItemDemand';
import { getStockStatus, getStatusColors } from '../../types/itemDemand';

/**
 * Status dot indicator
 */
function StatusDot({ status }) {
  const colors = getStatusColors(status);
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}
      aria-label={`Stock status: ${status}`}
    />
  );
}

/**
 * Single quantity display box
 */
function QuantityBox({ label, value, highlight = false, muted = false, status }) {
  const colors = status ? getStatusColors(status) : null;

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`
        text-lg font-semibold
        ${highlight && colors ? colors.text : ''}
        ${muted ? 'text-gray-600' : 'text-white'}
      `}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/**
 * Shortage warning section
 */
function ShortageWarning({ shortage }) {
  return (
    <div className="mt-3 p-2 bg-red-900/40 border border-red-700 rounded text-sm">
      <p className="font-medium text-red-400">
        Shortage: {shortage.quantity.toLocaleString()} units
      </p>
      {shortage.blocking_orders.length > 0 && (
        <p className="text-red-300 mt-1 text-xs">
          Blocking: {shortage.blocking_orders.slice(0, 3).join(', ')}
          {shortage.blocking_orders.length > 3 && ` +${shortage.blocking_orders.length - 3} more`}
        </p>
      )}
    </div>
  );
}

/**
 * List of allocations
 */
function AllocationList({ allocations }) {
  return (
    <div className="mt-3 border-t border-gray-700 pt-3">
      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
        Allocated To
      </h4>
      <ul className="space-y-1">
        {allocations.slice(0, 5).map((alloc) => (
          <li key={alloc.reference_id} className="text-sm flex justify-between">
            <span>
              <Link
                to={`/admin/production/${alloc.reference_id}`}
                className="text-cyan-400 hover:underline"
              >
                {alloc.reference_code}
              </Link>
              {alloc.linked_sales_order && (
                <span className="text-gray-500 ml-2">
                  {alloc.linked_sales_order.customer}
                </span>
              )}
            </span>
            <span className="text-gray-400">{alloc.quantity}</span>
          </li>
        ))}
        {allocations.length > 5 && (
          <li className="text-xs text-gray-500">
            +{allocations.length - 5} more allocations
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Compact mode view
 */
function ItemCardCompact({ data, status, colors, onClick, className }) {
  return (
    <div
      data-testid="item-card"
      className={`
        flex items-center justify-between p-2 border rounded
        ${colors.border} ${colors.bg} ${className || ''}
        ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        <span className="font-medium text-sm text-white">{data.sku}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">{data.quantities.on_hand} on hand</span>
        <span className={`font-medium ${status === 'critical' ? colors.text : 'text-white'}`}>
          {data.quantities.available} avail
        </span>
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function ItemCardSkeleton({ compact }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          <div className="h-4 w-24 bg-gray-600 rounded" />
        </div>
        <div className="h-4 w-32 bg-gray-600 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <div className="h-5 w-32 bg-gray-600 rounded" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="h-3 w-12 bg-gray-600 rounded mx-auto mb-1" />
            <div className="h-6 w-16 bg-gray-600 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ItemCard component - displays item with demand context
 *
 * @param {Object} props
 * @param {number} props.itemId - Item ID to fetch demand for
 * @param {import('../../types/itemDemand').ItemDemandSummary} [props.demandData] - Pre-fetched data (skip API call)
 * @param {boolean} [props.showDetails] - Show detailed view with allocations
 * @param {boolean} [props.compact] - Compact mode for lists
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 */
export function ItemCard({
  itemId,
  demandData,
  showDetails = false,
  compact = false,
  onClick,
  className = ''
}) {
  // Use provided data or fetch
  const { data: fetchedData, loading, error } = useItemDemand(
    demandData ? null : itemId
  );

  const data = demandData || fetchedData;

  // Clickable wrapper props
  const wrapperProps = onClick ? {
    onClick,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => e.key === 'Enter' && onClick(),
    className: 'cursor-pointer'
  } : {};

  if (loading) {
    return (
      <div {...wrapperProps}>
        <ItemCardSkeleton compact={compact} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div {...wrapperProps}>
        <div className={`p-4 border border-red-700 bg-red-900/30 rounded-lg ${className}`}>
          <p className="text-red-400 text-sm">
            {error || 'Failed to load item'}
          </p>
        </div>
      </div>
    );
  }

  const status = getStockStatus(data.quantities);
  const colors = getStatusColors(status);

  if (compact) {
    return (
      <ItemCardCompact
        data={data}
        status={status}
        colors={colors}
        onClick={onClick}
        className={className}
      />
    );
  }

  return (
    <div
      data-testid="item-card"
      className={`
        p-4 border rounded-lg transition-shadow hover:shadow-md
        ${colors.border} ${colors.bg} ${className}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <div>
            <h3 className="font-semibold text-white">{data.sku}</h3>
            <p className="text-sm text-gray-400">{data.name}</p>
          </div>
        </div>
      </div>

      {/* Quantity Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <QuantityBox label="On Hand" value={data.quantities.on_hand} />
        <QuantityBox label="Allocated" value={data.quantities.allocated} />
        <QuantityBox
          label="Available"
          value={data.quantities.available}
          highlight={data.quantities.available < 0}
          status={status}
        />
        <QuantityBox
          label="Incoming"
          value={data.quantities.incoming}
          muted={data.quantities.incoming === 0}
        />
      </div>

      {/* Shortage Warning */}
      {data.shortage.is_short && (
        <ShortageWarning shortage={data.shortage} />
      )}

      {/* Allocation Details (optional) */}
      {showDetails && data.allocations.length > 0 && (
        <AllocationList allocations={data.allocations} />
      )}
    </div>
  );
}

export default ItemCard;
