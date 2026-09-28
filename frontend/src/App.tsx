import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/useAuth";
import Login from "@/pages/Login";
import BscMain from "@/pages/BscMain";
import AllDetail from "@/pages/AllDetail";
import DpAnalysis from "@/pages/DpAnalysis";
import Delivery from "@/pages/Delivery";
import Sos from "@/pages/Sos";
import StoreDetail from "@/pages/StoreDetail";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<BscMain />} />
        <Route path="/detail" element={<AllDetail />} />
        <Route path="/dp/:dp" element={<DpAnalysis />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/sos" element={<Sos />} />
        <Route path="/store/:storeId" element={<StoreDetail />} />
      </Route>
    </Routes>
  );
}
