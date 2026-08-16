// `import.meta` solo existe en módulos ES, así que Jest no puede parsear este
// archivo. Vive aislado para que la config de tests lo sustituya por un stub
// (ver moduleNameMapper en jest.config.cjs) sin tocar el resto del cliente.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';
