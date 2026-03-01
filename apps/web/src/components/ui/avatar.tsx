import * as React from "react";
import { cn } from "@/lib/utils";

const AvatarContext = React.createContext<{
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
}>({
  imageLoaded: false,
  setImageLoaded: () => {},
});

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

  // Avoid calling setState during render — effects handle notifying parent
  if (hasError || !src) {
    return null;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
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

  const seedText = dataSeed ?? (typeof children === "string" && children.trim().length > 0 ? children.trim() : "user");
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
      <img src={dicebearUrl} alt={seedText} className="h-full w-full object-cover" />
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
