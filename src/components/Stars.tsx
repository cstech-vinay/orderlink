import { Icon } from "./Icon";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="inline-flex gap-[2px] text-amber-500">
      {[1, 2, 3, 4, 5].map(i => {
        const isFilled = i <= filled;
        return (
          <span
            key={i}
            data-testid="star"
            data-filled={isFilled}
            className={isFilled ? "opacity-100" : "opacity-25"}
          >
            <Icon name="star" size={size} />
          </span>
        );
      })}
    </span>
  );
}
