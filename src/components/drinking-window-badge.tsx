interface DrinkingWindowBadgeProps {
  drinkWindowStart: number | null;
  drinkWindowEnd: number | null;
}

export default function DrinkingWindowBadge({ drinkWindowStart, drinkWindowEnd }: DrinkingWindowBadgeProps) {
  if (!drinkWindowStart || !drinkWindowEnd) return null;

  const currentYear = new Date().getFullYear();

  let label: string;
  let className: string;

  if (currentYear < drinkWindowStart) {
    label = "Too Early";
    className = "bg-blue-100 text-blue-800";
  } else if (currentYear > drinkWindowEnd) {
    label = "Past Peak";
    className = "bg-red-100 text-red-800";
  } else if (currentYear === drinkWindowEnd) {
    label = "Drink Soon";
    className = "bg-yellow-100 text-yellow-800";
  } else {
    label = "Ready";
    className = "bg-green-100 text-green-800";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
