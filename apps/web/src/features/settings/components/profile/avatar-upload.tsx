"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Upload } from "lucide-react";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUploadAvatar } from "../../hooks/use-profile";
import { toast } from "sonner";

export function AvatarUpload() {
  const t = useTranslations("profile");
  const user = useAuthStore((state) => state.user);
  const { mutate: uploadAvatar, isPending } = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("fileTooLarge", { size: "5MB" }));
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error(t("invalidFileType"));
      return;
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload
    uploadAvatar(file, {
      onSuccess: () => {
        // Clear preview only after successful update (hook updates store which updates Avatar source)
         setPreviewUrl(null); 
         if (fileInputRef.current) {
             fileInputRef.current.value = "";
         }
      },
      onError: () => {
          setPreviewUrl(null);
      }
    });
  };

  const currentAvatarUrl = previewUrl || user?.avatar_url;

  return (
    <Card className="h-fit">
      <CardContent className="flex flex-col items-center gap-6">
        <div className="relative group">
          <Avatar className="h-32 w-32 cursor-pointer ring-4 ring-background shadow-xl transition-all hover:opacity-90" onClick={handleFileClick}>
             {/* If currentAvatarUrl is a helper that returns null, allow AvatarImage to handle src={undefined} */}
            <AvatarImage src={currentAvatarUrl || ""} alt={user?.name || "Avatar"} className="object-cover" />
            <AvatarFallback className="text-4xl">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
            
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
               {isPending ? (
                   <Loader2 className="h-8 w-8 animate-spin text-white" />
               ) : (
                   <Camera className="h-8 w-8 text-white" />
               )}
            </div>
          </Avatar>
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-semibold text-xl">{user?.name}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
             <input
               type="file"
               ref={fileInputRef}
               className="hidden"
               accept="image/jpeg,image/png,image/gif,image/webp"
               onChange={handleFileChange}
             />
             <Button className="w-full cursor-pointer" onClick={handleFileClick} disabled={isPending}>
               <Upload className="mr-2 h-4 w-4" />
               {t("uploadNewPhoto")}
             </Button>
             {/* Remove photo is currently visual-only or resets preview */}
             {previewUrl && (
                 <Button variant="outline" className="w-full text-destructive hover:text-destructive cursor-pointer" onClick={() => {
                     setPreviewUrl(null);
                     if (fileInputRef.current) fileInputRef.current.value = "";
                 }}>
                   Remove Photo
                 </Button>
             )}
        </div>
      </CardContent>
    </Card>
  );
}
