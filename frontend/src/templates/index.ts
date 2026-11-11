import type { ComponentType } from "react";
import { WorkshopAd } from "./workshop/WorkshopAd";

export type Template = {
  slug: string;
  title: string;
  summary: string;
  /** A Material Symbols name. */
  icon: string;
  Component: ComponentType;
};

/** Every template on the Templates page, in order. */
export const TEMPLATES: Template[] = [
  {
    slug: "workshop-ad",
    title: "Workshop ad",
    summary: "Fill in this week's details, check the animation, and download it as an image or video for Reels or X.",
    icon: "campaign",
    Component: WorkshopAd,
  },
];
