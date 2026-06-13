import React from "react";

interface BrandLogoProps {
  size?: "xs" | "sm" | "navbar" | "md" | "lg" | "xl";
  className?: string;
  alt?: string;
}

export default function BrandLogo({ size = "md", className = "", alt = "Cafe Odoo Logo" }: BrandLogoProps) {
  let sizeClass = "";

  switch (size) {
    case "xs":
      sizeClass = "h-5 w-5";
      break;
    case "sm":
      sizeClass = "h-8 w-8";
      break;
    case "navbar":
      // Mobile: 36px (h-9/w-9), Tablet: 40px (md:h-10/md:w-10), Desktop: 48px (lg:h-12/lg:w-12)
      sizeClass = "h-9 w-9 md:h-10 md:w-10 lg:h-12 lg:w-12";
      break;
    case "md":
      sizeClass = "h-10 w-10 md:h-12 md:w-12";
      break;
    case "lg":
      sizeClass = "h-20 md:h-24";
      break;
    case "xl":
      sizeClass = "h-24 md:h-[120px]";
      break;
    default:
      sizeClass = "h-10 w-10 md:h-12 md:w-12";
  }

  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`object-contain ${sizeClass} ${className}`}
      style={{ display: "inline-block" }}
    />
  );
}
