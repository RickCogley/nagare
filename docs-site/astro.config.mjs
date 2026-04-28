import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://nagare-docs.workers.dev",
  integrations: [
    starlight({
      title: "Nagare",
      description:
        "流れ — Deno-native release management library. Conventional commits, semver bumps, JSR publishing, GitHub releases.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/RickCogley/nagare" },
        { icon: "jsr", label: "JSR", href: "https://jsr.io/@rick/nagare" },
      ],
      sidebar: [
        { label: "Tutorials", autogenerate: { directory: "tutorials" } },
        { label: "How-to guides", autogenerate: { directory: "how-to" } },
        { label: "Reference", autogenerate: { directory: "reference" } },
        { label: "Explanation", autogenerate: { directory: "explanation" } },
        { label: "Development", autogenerate: { directory: "development" } },
        {
          label: "API Reference",
          link: "/api/",
          attrs: { target: "_blank", rel: "noopener" },
          badge: { text: "deno doc", variant: "tip" },
        },
      ],
      editLink: {
        baseUrl: "https://github.com/RickCogley/nagare/edit/main/docs-site/",
      },
      lastUpdated: true,
    }),
  ],
});
