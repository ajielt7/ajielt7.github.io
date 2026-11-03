import worker from "../../worker/index.js";

const SECRET_NAMES = [
  "RAJAONGKIR_API_KEY",
  "GOOGLE_APPS_SCRIPT_URL",
  "GOOGLE_SCRIPT_TOKEN",
  "ADMIN_TOKEN",
];

export default async (request) => {
  const env = Object.fromEntries(
    SECRET_NAMES.map((name) => [name, Netlify.env.get(name) || ""]),
  );

  return worker.fetch(request, env);
};

export const config = {
  path: ["/health", "/api/*"],
};
