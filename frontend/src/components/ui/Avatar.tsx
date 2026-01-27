interface AvatarProps {
  src?: string;
  size?: "sm" | "md" | "lg";
  alt?: string;
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function Avatar({
  src,
  alt = "avatar",
  size = "md",
}: AvatarProps) {
  return (
    <div
      className={`
        ${sizes[size]}
        border-3 border-ink
        shadow-brutal
        rounded-full
        overflow-hidden
        bg-paper
        flex items-center justify-center
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="font-black text-ink">?</span>
      )}
    </div>
  );
}
