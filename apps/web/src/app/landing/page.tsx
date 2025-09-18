import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/landing/hero";
import { SITE_URL } from "@/constants/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenCut - 免费开源视频编辑器",
  description: "一个免费、开源的网页、桌面和移动端视频编辑器。保护隐私，功能完整，无水印。",
  alternates: {
    canonical: `${SITE_URL}/landing`,
  },
};

export default async function LandingPage() {
  return (
    <div>
      <Header />
      <Hero />
      <Footer />
    </div>
  );
}
