import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { YuklemePlaniLayout } from "./components/YuklemePlaniLayout";
import { Dashboard } from "./pages/Dashboard";
import { YuklemePlanlari } from "./pages/YuklemePlanlari";
import { YuklemePlaniOlustur } from "./pages/YuklemePlaniOlustur";
import { UrunYonetimi } from "./pages/UrunYonetimi";
import { AracYonetimi } from "./pages/AracYonetimi";
import { Raporlama } from "./pages/Raporlama";
import { Entegrasyonlar } from "./pages/Entegrasyonlar";
import { Ayarlar } from "./pages/Ayarlar";
import { KullaniciProfili } from "./pages/KullaniciProfili";
import { Bildirimler } from "./pages/Bildirimler";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "yukleme-planlari", Component: YuklemePlanlari },
      { path: "urun-yonetimi", Component: UrunYonetimi },
      { path: "arac-yonetimi", Component: AracYonetimi },
      { path: "raporlama", Component: Raporlama },
      { path: "entegrasyonlar", Component: Entegrasyonlar },
      { path: "ayarlar", Component: Ayarlar },
      { path: "kullanici-profili", Component: KullaniciProfili },
      { path: "bildirimler", Component: Bildirimler },
    ],
  },
  {
    path: "/yukleme-plani-olustur",
    Component: YuklemePlaniLayout,
    children: [
      { index: true, Component: YuklemePlaniOlustur },
    ],
  },
]);