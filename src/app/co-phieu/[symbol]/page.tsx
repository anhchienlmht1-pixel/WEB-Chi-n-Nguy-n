import { notFound } from "next/navigation";
import { StockDetail } from "@/components/StockDetail";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const upper = symbol?.toUpperCase();

  if (!upper || !/^[A-Z0-9]{2,10}$/.test(upper)) {
    notFound();
  }

  return <StockDetail symbol={upper} />;
}
