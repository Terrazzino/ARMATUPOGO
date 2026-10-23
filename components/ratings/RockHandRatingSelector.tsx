"use client";

import { useState } from "react";
import { RockHandIcon } from "@/components/ratings/RockHandRating";
import { getVisibleRatingValue } from "@/lib/rating-presentation";

interface RockHandRatingSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  labelledBy: string;
}

export function RockHandRatingSelector({
  value,
  onChange,
  labelledBy,
}: RockHandRatingSelectorProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const visibleValue = getVisibleRatingValue(value, preview);

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-labelledby={labelledBy}
        onMouseLeave={() => setPreview(null)}
      >
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = rating <= visibleValue;

          return (
            <button
              type="button"
              key={rating}
              onClick={() => onChange(rating)}
              onMouseEnter={() => setPreview(rating)}
              onFocus={() => setPreview(rating)}
              onBlur={() => setPreview(null)}
              aria-label={`Calificar con ${rating} de 5`}
              aria-pressed={rating === value}
              className={`rounded-sm p-1 transition-[opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 motion-reduce:transform-none motion-reduce:transition-none ${
                isActive ? "scale-105 opacity-100" : "opacity-30 hover:opacity-60"
              }`}
            >
              <RockHandIcon size={38} />
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs font-bold text-neutral-400" aria-live="polite">
        {value === null ? "Sin puntuación seleccionada" : `${value} de 5 seleccionado`}
      </p>
    </div>
  );
}
