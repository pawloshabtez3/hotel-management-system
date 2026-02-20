type RatingStarsProps = {
  rating: number | null;
};

export function RatingStars({ rating }: RatingStarsProps) {
  if (!rating) {
    return <span className="text-xs text-foreground/60">No ratings yet</span>;
  }

  const filled = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, index) => (index < filled ? "★" : "☆")).join("");

  return (
    <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-forest">
      {stars} {rating.toFixed(1)}
    </span>
  );
}
