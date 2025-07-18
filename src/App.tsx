
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/Layout/MainLayout";
import CloneProduct from "./pages/CloneProduct";
import UpdateProduct from "./pages/UpdateProduct";
import ListProxies from "./pages/ListProxies";
import ListProducts from "./pages/ListProducts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout><Navigate to="/clone-product" replace /></MainLayout>} />
          <Route path="/clone-product" element={<MainLayout><CloneProduct /></MainLayout>} />
          <Route path="/update-product" element={<MainLayout><UpdateProduct /></MainLayout>} />
          <Route path="/list-proxies" element={<MainLayout><ListProxies /></MainLayout>} />
          <Route path="/list-products" element={<MainLayout><ListProducts /></MainLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
