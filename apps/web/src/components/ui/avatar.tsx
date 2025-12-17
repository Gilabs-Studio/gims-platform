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

  if (hasError || !src) {
    setImageLoaded(false);
    return null;
  }

  return (
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

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  const { imageLoaded } = React.useContext(AvatarContext);

  if (imageLoaded) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute flex h-full w-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
