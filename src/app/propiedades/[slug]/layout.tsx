import { notFound } from "next/navigation";
import { findListingPage } from "@/lib/listing-page-lookup";

// Runs before loading.tsx starts streaming the skeleton, so a missing listing gets HTTP 404.
export default async function ListingLayout({ children, params }: LayoutProps<"/propiedades/[slug]">) {
  const { slug } = await params;
  if (!(await findListingPage(slug))) notFound();
  return children;
}
