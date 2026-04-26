import * as React from "react";
import { cn } from "@/lib/utils";

const AvatarContext = React.createContext<{
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
}>({
  imageLoaded: false,
  setImageLoaded: () => {},
});

/**
 * Validates if a URL is safe to use in an img src.
 * Prevents dangerous protocols like javascript:
 */
const isSafeUrl = (url?: string): boolean => {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  // Allow site-relative paths.
  if (trimmed.startsWith("/")) return true;

  // Allow image data URLs only.
  if (/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }

  // Allow browser-created blob URLs only (blob:<origin>/<uuid>).
  if (/^blob:https?:\/\/[^/]+\/[0-9a-f-]{36}$/i.test(trimmed)) {
    return true;
  }

  // Allow standard remote image URLs over HTTP(S).
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

function Avatar({ className, ...props }: React.ComponentProps<"div">) {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const contextValue = React.useMemo(
    () => ({ imageLoaded, setImageLoaded }),
    [imageLoaded],
  );

  return (
    <AvatarContext.Provider value={contextValue}>
      <div
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

function AvatarImage({
  className,
  src,
  alt,
  ...props
}: React.ComponentProps<"img">) {
  const { setImageLoaded } = React.useContext(AvatarContext);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (src) {
      setHasError(false);
      setImageLoaded(false);
    } else {
      setImageLoaded(false);
    }
  }, [src, setImageLoaded]);

  // Validate SRC and ensure it's a safe string
  const safeSrc = React.useMemo(() => {
    if (typeof src !== "string" || !isSafeUrl(src)) {
      return undefined;
    }
    return src;
  }, [src]);

  // Avoid calling setState during render — effects handle notifying parent
  if (hasError || !safeSrc) {
    return null;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={safeSrc}
      alt={alt ?? ""}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onLoad={() => setImageLoaded(true)}
      onError={() => {
        setHasError(true);
        setImageLoaded(false);
      }}
      {...props}
    />
  );
}

function AvatarFallback({ className, children, dataSeed, ...props }: React.PropsWithChildren<React.ComponentProps<"div"> & { dataSeed?: string }>) {
  const { imageLoaded } = React.useContext(AvatarContext);

  if (imageLoaded) {
    return null;
  }

  // Safely extract text from children for the seed, or default to "user"
  const getSeedText = () => {
    if (dataSeed) return dataSeed;
    if (typeof children === "string") return children.trim();
    if (typeof children === "number") return String(children);
    return "user";
  };

  const seedText = getSeedText() || "user";
  const seed = encodeURIComponent(seedText);
  // Use DiceBear 'lorelei' style (consistent with user module)
  const dicebearUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`;

  return (
    <div
      className={cn(
        "absolute flex h-full w-full items-center justify-center rounded-full bg-muted overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dicebearUrl}
        alt={seedText}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
