"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Check, Globe, Moon, Sun } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function PreferencesForm() {
  const t = useTranslations("profile");
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Simple language switch logic assuming /en/ or /id/ prefix
  // In a real app with next-intl, we might use a proper navigation wrapper
  const currentLocale = pathname.startsWith("/id") ? "id" : "en";

  const handleLanguageChange = (value: string) => {
    // Replace current locale in path
    const newPath = pathname.replace(`/${currentLocale}`, `/${value}`);
    router.replace(newPath);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("preferences")}</CardTitle>
        <CardDescription>{t("preferencesDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Theme Preference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-base">{t("theme")}</Label>
            <p className="text-sm text-muted-foreground">{t("themeDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="cursor-pointer w-full sm:w-auto"
            >
              <Sun className="mr-2 h-4 w-4" />
              {t("light")}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="cursor-pointer w-full sm:w-auto"
            >
              <Moon className="mr-2 h-4 w-4" />
              {t("dark")}
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
              className="cursor-pointer w-full sm:w-auto"
            >
              <span className="mr-2">💻</span>
              {t("system")}
            </Button>
          </div>
        </div>

        {/* Language Preference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
             <Label className="text-base">{t("language")}</Label>
             <p className="text-sm text-muted-foreground">{t("languageDescription")}</p>
          </div>
          <div className="w-full sm:w-[180px]">
             <Select value={currentLocale} onValueChange={handleLanguageChange}>
               <SelectTrigger>
                 <SelectValue placeholder={t("selectLanguage")} />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="en">
                   <div className="flex items-center">
                     <span className="mr-2">🇺🇸</span> English
                   </div>
                 </SelectItem>
                 <SelectItem value="id">
                   <div className="flex items-center">
                     <span className="mr-2">🇮🇩</span> Indonesia
                   </div>
                 </SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
