import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Splash from "./pages/Splash";
import Layout from "./pages/Layout";
import Cameras from "./pages/Cameras";
import LensGroups from "./pages/LensGroups";
import Formats from "./pages/Formats";
import FilmTypes from "./pages/FilmTypes";
import PaperBrands from "./pages/PaperBrands";
import PaperTypes from "./pages/PaperTypes";
import PaperSizes from "./pages/PaperSizes";
import PrintDataList from "./pages/PrintDataList";
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/browse" replace />} />
          <Route path="browse" element={<Navigate to="/browse/cameras" replace />} />
          <Route path="browse/cameras" element={<Cameras />} />
          <Route path="browse/lens-groups/:cameraTypeId" element={<LensGroups />} />
          <Route path="browse/formats/:lensGroupId" element={<Formats />} />
          <Route path="browse/film-types/:formatId" element={<FilmTypes />} />
          <Route path="browse/paper-brands/:filmTypeId" element={<PaperBrands />} />
          <Route path="browse/paper-types/:paperBrandId" element={<PaperTypes />} />
          <Route path="browse/paper-sizes/:paperTypeId" element={<PaperSizes />} />
          <Route path="browse/print-data-list/:paperSizeId" element={<PrintDataList />} />
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
