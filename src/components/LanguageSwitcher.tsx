import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
      <Globe className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5 shrink-0" />
      <Button
        variant={language === "id" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("id")}
        className={`h-6 px-2 text-xs font-semibold rounded-md transition-all ${
          language === "id"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ID
      </Button>
      <Button
        variant={language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className={`h-6 px-2 text-xs font-semibold rounded-md transition-all ${
          language === "en"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </Button>
    </div>
  );
}
