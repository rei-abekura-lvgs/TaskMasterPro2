import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { TaskProvider } from "@/context/TaskContext";
import { useEffect, useState } from "react";

// スクロールインジケーターコンポーネント
function ScrollIndicator() {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const updateScrollWidth = () => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (window.scrollY / windowHeight) * 100;
      setWidth(scrolled);
    };
    
    window.addEventListener("scroll", updateScrollWidth);
    return () => window.removeEventListener("scroll", updateScrollWidth);
  }, []);
  
  return <div className="scroll-indicator" style={{ width: `${width}%` }}></div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TaskProvider>
        <TooltipProvider>
          <ScrollIndicator />
          <Toaster />
          <Router />
        </TooltipProvider>
      </TaskProvider>
    </QueryClientProvider>
  );
}

export default App;
