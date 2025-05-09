import React from "react";
import Header from "./Header";
import Footer from "./Footer";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-slate-50/30">
      <Header />

      <main
        className={`flex-1 flex flex-col pt-24 px-4 sm:px-6 pb-16 ${className}`}
      >
        {children}
      </main>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
