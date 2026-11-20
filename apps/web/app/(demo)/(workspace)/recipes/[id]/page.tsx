import type { Metadata } from "next";
import { RecipeDetail } from "@/components/recipe-detail";

export const metadata: Metadata = { title: "Procedimiento" };

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipeDetail id={id} />;
}
