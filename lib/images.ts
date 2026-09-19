import type { StaticImageData } from "next/image";
import caboArch from "@/assets/images/cabo-arch.jpg";
import caboCover from "@/assets/images/cabo-cover.jpg";
import heroImage from "@/assets/images/hero.jpg";
import lisbonImage from "@/assets/images/lisbon.jpg";
import tulumImage from "@/assets/images/tulum.jpg";

export type Photo = {
  src: StaticImageData;
  alt: string;
  /** Where to hold the crop when the container is a different shape. */
  objectPosition?: string;
  credit: {
    title: string;
    artist: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
  };
};

/**
 * Photography is from Wikimedia Commons under CC BY / CC BY-SA. Every licence
 * here requires attribution, which is why the credit travels with the image
 * and is listed at /credits.
 */
export const photos = {
  hero: {
    src: heroImage,
    alt: "Friends silhouetted against a pastel sunset, walking along a calm shoreline",
    credit: {
      title: "Families and friends silhouetted against a pastel sunset",
      artist: "PattayaPatrol",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:DFC_3896_Families_and_friends_silhouetted_against_a_pastel_sunset_as_they_stroll_and_play_along_a_calm_shoreline.jpg",
    },
  },
  caboCover: {
    src: caboCover,
    alt: "Waves breaking over golden granite boulders on the Cabo San Lucas coast",
    credit: {
      title: "Lovers Beach, Los Cabos",
      artist: "Kirt Edblom",
      license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Lovers_Beach_Los_Cabos_2008_(8997396795).jpg",
    },
  },
  caboArch: {
    src: caboArch,
    alt: "El Arco, the sea arch at Land's End in Cabo San Lucas, under a streaked blue sky",
    // The arch itself sits low in the frame; keep it in shot on wide crops.
    objectPosition: "50% 72%",
    credit: {
      title: "El Arco, Cabo San Lucas, Baja California Sur",
      artist: "Comisión Mexicana de Filmaciones",
      license: "CC BY-SA 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:El_Arco,_Cabo_San_Lucas,_Baja_California_Sur_(16638939645).jpg",
    },
  },
  tulum: {
    src: tulumImage,
    alt: "Mayan ruins on the cliffs above the turquoise Caribbean at Tulum",
    credit: {
      title: "Tulum — God of the Winds Temple",
      artist: "Martin Falbisoner",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Tulum_-_God_of_the_Winds_Temple_03.JPG",
    },
  },
  lisbon: {
    src: lisbonImage,
    alt: "Terracotta rooftops of Lisbon at dusk, seen from Miradouro da Senhora do Monte",
    credit: {
      title: "Panoramic Lisbon cityscape from Miradouro da Senhora do Monte at dusk",
      artist: "Dale Cruse",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Panoramic_Lisbon_Cityscape_from_Miradouro_da_Senhora_do_Monte_at_Dusk_(54715110886).jpg",
    },
  },
} satisfies Record<string, Photo>;

export const allPhotos = Object.values(photos) as Photo[];

export type PhotoKey = keyof typeof photos;

/**
 * Rows store a photo key. Places people add themselves have none yet, so the
 * lookup can come back empty and the card falls back to a striped panel.
 */
export function photoFor(key: string | null | undefined): Photo | null {
  if (!key) return null;
  return (photos as Record<string, Photo>)[key] ?? null;
}
