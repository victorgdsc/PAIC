import React from "react";
import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-muted py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              PAIC - Sistema de Análise de Entregas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-2 sm:space-y-0">
            <Link
              to="https://github.com/victorgdsc/PAIC"
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center"
            >
              <FileQuestion className="h-4 w-4 mr-1" />
              Documentação
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
