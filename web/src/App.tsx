import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Splash from "./pages/Splash";
import Layout from "./pages/Layout";
import NodeList from "./pages/NodeList";
import PrintData from "./pages/PrintData";
import Data from "./pages/Data";
import Add from "./pages/Add";
import Search from "./pages/Search";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <Splash />;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/browse" replace />} />
          <Route path="browse" element={<NodeList />} />
          <Route path="browse/:nodeId" element={<NodeList />} />
          <Route path="browse/print-data/:printDataId" element={<PrintData />} />
          <Route path="data" element={<Data />} />
          <Route path="add" element={<Add />} />
          <Route path="search" element={<Search />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
