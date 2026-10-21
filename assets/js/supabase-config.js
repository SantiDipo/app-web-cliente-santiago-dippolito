// Configuración de conexión con Supabase.
//
// Son los dos valores del dashboard de Supabase: Project Settings → API.
// La "publishable key" (antes "anon key") está pensada para viajar en el
// navegador: es pública por diseño y se puede commitear sin problema. Lo único
// que NUNCA se sube al repo es la "secret key" (sb_secret_...), que da acceso
// total a la base de datos.

const SUPABASE_URL = 'https://fnhewctbzzlpbbjpzoeb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1uiwMvOD-mjd4XNPvdiozg_lJp0tnI9';

// Tabla del catálogo en la base de datos (ver supabase/schema.sql).
const SUPABASE_TABLA_PRODUCTOS = 'productos';

// true sólo si todavía no se reemplazaron los valores de ejemplo.
function supabaseSinConfigurar() {
    return SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_ANON_KEY.includes('TU_ANON_KEY');
}
