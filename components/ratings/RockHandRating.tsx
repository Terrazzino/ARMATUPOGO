import Image from "next/image";
import rockHandImage from "@/public/branding/valoracion-256.webp";

interface RockHandIconProps {
  size?: number;
  className?: string;
  decorative?: boolean;
}

export function RockHandIcon({
  size = 24,
  className = "",
  decorative = true,
}: RockHandIconProps) {
  return (
    <Image
      src={rockHandImage}
      alt={decorative ? "" : "Mano rockera"}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

interface RockHandScoreProps {
  score: number | null;
  total?: number;
  iconSize?: number;
  className?: string;
}

export function RockHandScore({
  score,
  total,
  iconSize = 24,
  className = "",
}: RockHandScoreProps) {
  const hasRatings = score !== null && (total === undefined || total > 0);
  const accessibleLabel = hasRatings
    ? `Reputación: ${score} de 5${total === undefined ? "" : `, ${total} ${total === 1 ? "valoración" : "valoraciones"}`}`
    : "Sin valoraciones";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={accessibleLabel}>
      <RockHandIcon size={iconSize} />
      <span>{hasRatings ? score : "—"}</span>
    </span>
  );
}

interface RockHandScaleProps {
  score: number;
  size?: number;
  className?: string;
}

export function RockHandScale({ score, size = 20, className = "" }: RockHandScaleProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={`Calificación: ${score} de 5`}
    >
      {[1, 2, 3, 4, 5].map((position) => (
        <RockHandIcon
          key={position}
          size={size}
          className={position <= score ? "opacity-100" : "opacity-30"}
        />
      ))}
    </span>
  );
}
