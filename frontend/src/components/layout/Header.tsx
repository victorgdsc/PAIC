import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Upload, FileText, ChevronRight } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  const { fileInfo, analysisResult } = useData();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3 px-6 flex items-center justify-between",
        scrolled
          ? "bg-background/80 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="flex items-center">
        <Link to="/" className="flex items-center mr-8">
          <BarChart3 className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-xl tracking-tight">PAIC</span>
        </Link>
        <nav className="hidden md:flex space-x-1">
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              className="text-sm font-medium"
            >
              Upload
            </Button>
          </Link>
          <Button
            variant={location.pathname === "/analysis" ? "default" : "ghost"}
            className="text-sm font-medium"
            disabled={!analysisResult}
            asChild
          >
            <Link to="/analysis">Análise</Link>
          </Button>
        </nav>
      </div>
      {fileInfo && (
        <div className="hidden md:flex items-center text-sm text-muted-foreground">
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          <span className="truncate max-w-[150px]">{fileInfo.name}</span>
          {analysisResult && (
            <>
              <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/50" />
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              <span>Análise concluída</span>
            </>
          )}
        </div>
      )}
      <div className="md:hidden"></div>
    </header>
  );
};

export default Header;
