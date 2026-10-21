// Cliente único de Supabase para toda la app.
//
// Requiere, en este orden:
//   1. El SDK global de Supabase (CDN, línea anterior en cada HTML).
//   2. Los valores de supabase-config.js.
//
// Expone `clienteSupabase` (const del módulo, disponible en cualquier página
// que incluya este script) para consultar la base de datos, por ejemplo:
//
//   const { data, error } = await clienteSupabase
//       .from(SUPABASE_TABLA_PRODUCTOS)
//       .select('*');

const clienteSupabase = typeof supabase !== 'undefined' && !supabaseSinConfigurar()
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!clienteSupabase) {
    console.warn(
        'Supabase no está conectado: faltan el SDK en el <head> o los valores de supabase-config.js.'
    );
}

// Comprueba que la conexión y la tabla de productos respondan.
// Devuelve una Promise que resuelve con { ok, mensaje, detalle }.
// Sirve para probar la conexión desde la consola del navegador: probarConexionSupabase().then(console.log)
async function probarConexionSupabase() {
    if (!clienteSupabase) {
        return { ok: false, mensaje: 'El cliente de Supabase no está creado.', detalle: null };
    }

    const { data, error } = await clienteSupabase
        .from(SUPABASE_TABLA_PRODUCTOS)
        .select('*', { count: 'exact', head: true });

    if (error) {
        // PGRST205 = la tabla todavía no existe (correr supabase/schema.sql).
        return {
            ok: false,
            mensaje: error.code === 'PGRST205'
                ? 'La conexión funciona, pero falta crear la tabla "' + SUPABASE_TABLA_PRODUCTOS + '".'
                : 'Supabase respondió con un error: ' + error.message,
            detalle: error
        };
    }

    return { ok: true, mensaje: 'Conexión con Supabase verificada.', detalle: data };
}
