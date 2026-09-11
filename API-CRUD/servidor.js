// servidor.js – API CRUD de productos con http nativo
import http from 'node:http';

// "Base de datos" en memoria
let productos = [
  { id: 1, nombre: 'Almuerzo del día', precio: 12000, stock: 25 },
  { id: 2, nombre: 'Jugo natural', precio: 4000, stock: 50 },
  { id: 3, nombre: 'Café campesino', precio: 2500, stock: 100 },
];
let siguienteId = 4;

function responderJson(res, codigo, datos) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos));
}

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = '';
    req.on('data', (pedazo) => { cuerpo += pedazo; });
    req.on('end', () => {
      if (cuerpo === '') return resolve(null);
      try {
        resolve(JSON.parse(cuerpo));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const partes = url.pathname.split('/').filter(Boolean);

  if (partes[0] !== 'api' || partes[1] !== 'productos') {
    return responderJson(res, 404, { error: 'Ruta no encontrada' });
  }

  const id = partes[2] ? Number(partes[2]) : null;

  try {
    if (req.method === 'GET' && id === null) {
  const soloDisponibles = url.searchParams.get('disponibles') === 'true';
  const resultado = soloDisponibles 
    ? productos.filter((p) => p.stock > 0) 
    : productos;

  return responderJson(res, 200, resultado);
}

    if (req.method === 'GET') {
      const producto = productos.find((p) => p.id === id);
      if (!producto) return responderJson(res, 404, { error: 'Producto no encontrado' });
      return responderJson(res, 200, producto);
    }

    if (req.method === 'POST' && id === null) {
    const body = await leerBody(req);
    
    // 1. Validación de campos requeridos
    if (!body || !body.nombre || typeof body.precio !== 'number' || body.stock === undefined) {
      return responderJson(res, 400, { error: 'Campos requeridos: nombre, precio (número) y stock' });
    }

    // 2. Validación de Precio No Negativo
    if (body.precio < 0) {
      return responderJson(res, 400, { error: 'El precio debe ser mayor o igual a 0' });
    }

    // 3. Validación de Nombre Único (sin importar mayúsculas/minúsculas)
    const existeNombre = productos.some(
      (p) => p.nombre.toLowerCase() === body.nombre.trim().toLowerCase()
    );

    if (existeNombre) {
      return responderJson(res, 400, { error: 'Ya existe un producto con ese nombre' });
    }

    const nuevo = {
      id: siguienteId++,
      nombre: body.nombre.trim(),
      precio: body.precio,
      stock: body.stock,
    };

    productos.push(nuevo);
    return responderJson(res, 201, nuevo);
  }

    if (req.method === 'PUT' && id !== null) {
      const producto = productos.find((p) => p.id === id);
      if (!producto) return responderJson(res, 404, { error: 'Producto no encontrado' });
      const body = await leerBody(req);
      if (!body) return responderJson(res, 400, { error: 'Body requerido' });

      if (body.nombre !== undefined) producto.nombre = body.nombre;
      if (body.precio !== undefined) producto.precio = body.precio;
      if (body.stock !== undefined) producto.stock = body.stock;
      return responderJson(res, 200, producto);
    }

    if (req.method === 'DELETE' && id !== null) {
      const existe = productos.some((p) => p.id === id);
      if (!existe) return responderJson(res, 404, { error: 'Producto no encontrado' });
      productos = productos.filter((p) => p.id !== id);
      return responderJson(res, 204, null);
    }

    return responderJson(res, 405, { error: `Método ${req.method} no permitido` });
  } catch (error) {
    const codigo = error.message === 'JSON inválido' ? 400 : 500;
    return responderJson(res, codigo, { error: error.message });
  }
});

servidor.listen(3000, () => {
  console.log('CampusEats (nativo) en http://localhost:3000');
});