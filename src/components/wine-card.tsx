import Link from "next/link";
import DrinkingWindowBadge from "./drinking-window-badge";

interface Wine {
  id: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  imageUrl: string | null;
  drinkWindowStart: number | null;
  drinkWindowEnd: number | null;
  estimatedRating: number | null;
}

interface WineCardProps {
  wine: Wine;
  quantity?: number;
  extra?: React.ReactNode;
  href?: string | null;
}

export default function WineCard({ wine, quantity, extra, href }: WineCardProps) {
  const content = (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex">
        {wine.imageUrl && (
          <div className="w-24 h-28 flex-shrink-0">
            <img src={wine.imageUrl} alt={wine.brand} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{wine.brand}</h3>
            {wine.estimatedRating && (
              <span className="text-sm font-bold text-rose-600 flex-shrink-0">{wine.estimatedRating}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {wine.varietal && <span className="text-xs text-gray-500">{wine.varietal}</span>}
            {wine.vintage && <span className="text-xs text-gray-400">&middot; {wine.vintage}</span>}
            {wine.region && <span className="text-xs text-gray-400">&middot; {wine.region}</span>}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <DrinkingWindowBadge
              drinkWindowStart={wine.drinkWindowStart}
              drinkWindowEnd={wine.drinkWindowEnd}
            />
            {quantity !== undefined && (
              <span className="text-xs text-gray-400 font-medium">&times;{quantity}</span>
            )}
          </div>
          {extra}
        </div>
      </div>
    </div>
  );

  if (href === null) {
    return <div>{content}</div>;
  }

  return (
    <Link href={href ?? `/wine/${wine.id}`} className="block">
      {content}
    </Link>
  );
}
