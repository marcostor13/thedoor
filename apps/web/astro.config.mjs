// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

const site = process.env.PUBLIC_SITE_URL ?? 'https://thedoor.marcostorresalarcon.com'

export default defineConfig({
  site,
  // Estático: el contenido no cambia por petición y el formulario habla con la
  // API por fetch. Si el contenido pasa a servirse desde el backend, cambiar a
  // output: 'server' con @astrojs/node — el Dockerfile ya contempla ese caso.
  output: 'static',
  integrations: [
    // La landing de invitación se reparte a mano (WhatsApp, correo) y va
    // marcada `noindex`: tampoco tiene por qué anunciarse en el sitemap.
    sitemap({ filter: (page) => !page.includes('/invitacion') }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
})
