// DoD 2 · camino principal de Promociones en navegador real: login → menú → encuesta → listado → detalle → listado,
// sin errores de consola, excepciones no controladas ni respuestas 4xx/5xx del propio sitio.
import { test, expect } from '@playwright/test';

const origen = () => process.env.E2E_ORIGEN;
const delSitio = url => url.startsWith(origen());

function vigilarErrores(page) {
  const errores = [];
  page.on('console', mensaje => {
    if (mensaje.type() === 'error') errores.push(`consola: ${mensaje.text()} (${mensaje.location().url})`);
  });
  page.on('pageerror', error => errores.push(`excepción: ${error.message}`));
  page.on('response', respuesta => {
    if (delSitio(respuesta.url()) && respuesta.status() >= 400) {
      errores.push(`HTTP ${respuesta.status()}: ${respuesta.request().method()} ${respuesta.url()} (en ${new URL(page.url()).pathname})`);
    }
  });
  page.on('requestfailed', peticion => {
    if (delSitio(peticion.url())) errores.push(`petición fallida: ${peticion.method()} ${peticion.url()} (${peticion.failure()?.errorText})`);
  });
  return errores;
}

for (const movimiento of ['no-preference', 'reduce']) {
  test(`login pasa del botón al menú sin carga intermedia (${movimiento})`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.emulateMedia({ reducedMotion:movimiento });
    await page.addInitScript(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        if (this.matches('.app-wrapper')) sessionStorage.setItem('qa-slide-menu', '1');
        return animate.apply(this, args);
      };
      const observar = () => {
        if (sessionStorage.getItem('qa-acceso') === '1') {
          for (const id of ['startup-spinner', 'menu-entry-loading']) {
            const nodo = document.getElementById(id);
            if (nodo?.getBoundingClientRect().height && getComputedStyle(nodo).visibility === 'visible') {
              sessionStorage.setItem('qa-carga-intermedia', id);
            }
          }
        }
        requestAnimationFrame(observar);
      };
      requestAnimationFrame(observar);
    });
    let aceptarLogin, entregarProductos;
    const login = new Promise(resolve => { aceptarLogin = resolve; });
    const productos = new Promise(resolve => { entregarProductos = resolve; });
    await page.route('**/api/auth/login', async ruta => { await login; await ruta.continue(); });
    await page.route('**/api/menu', async ruta => { await productos; await ruta.continue(); });
    await page.goto(origen() + '/');
    const formulario = page.locator('#login-form');
    await expect(formulario).toBeVisible({ timeout:15000 });
    await formulario.locator('[name="username"]').fill('demo.basica');
    await formulario.locator('[name="password"]').fill('Basica2026');
    await page.evaluate(() => sessionStorage.setItem('qa-acceso', '1'));
    await formulario.locator('[type="submit"]').click();
    await expect(formulario.locator('[type="submit"]')).toHaveText('Ingresando…');
    await expect(formulario).toBeVisible();
    await expect(page.locator('#startup-spinner')).toBeHidden();
    aceptarLogin();
    await expect(page).toHaveURL(/\/menu\.html/);
    await expect(page.locator('.app-wrapper')).toBeInViewport();
    await expect(page.locator('#menu-entry-loading')).toBeHidden();
    await expect(page.locator('#menu-resume-loading')).toBeHidden();
    await expect(page.locator('#menu-loading')).toBeVisible();
    entregarProductos();
    await expect(page.locator('#menu-content')).toBeVisible({ timeout:15000 });
    expect(await page.evaluate(() => sessionStorage.getItem('qa-carga-intermedia'))).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem('qa-slide-menu'))).toBe(movimiento === 'reduce' ? null : '1');
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('perfil A completa el camino principal de Promociones sin errores', async ({ page }) => {
  const errores = vigilarErrores(page);

  await test.step('login con usuario de prueba', async () => {
    await page.goto(origen() + '/');
    const formulario = page.locator('#login-form');
    await expect(formulario).toBeVisible({ timeout: 15000 });
    await formulario.locator('[name="username"]').fill('demo.basica');
    await formulario.locator('[name="password"]').fill('Basica2026');
    await formulario.locator('[type="submit"]').click();
  });

  await test.step('menú con los productos del perfil A', async () => {
    await expect(page).toHaveURL(/\/menu\.html/);
    const productos = page.locator('#menu-content');
    await expect(productos).toBeVisible({ timeout: 15000 });
    await expect(productos).toContainText('Max Electrónico');
    await expect(productos).toContainText('7074589851');
  });

  await test.step('entrada a Promociones con encuesta pendiente', async () => {
    await page.locator('#btn-promociones').click();
    await expect(page).toHaveURL(/\/encuesta\.html/);
    const primera = page.locator('#category-options input[name="category"]').first();
    await expect(primera).toBeVisible();
    await primera.check();
    await page.locator('#survey-form button[type="submit"]').click();
  });

  let comercio, beneficio;
  await test.step('listado de promociones', async () => {
    await expect(page).toHaveURL(/\/promociones\.html/);
    const oferta = page.locator('#cards a[id^="promo-"]').first();
    await expect(oferta).toBeVisible({ timeout: 15000 });
    comercio = (await oferta.locator('h2').textContent()).trim();
    beneficio = (await oferta.locator('.promo-benefit').textContent()).trim();
    expect(comercio).not.toBe('');
    expect(beneficio).not.toBe('');
    await oferta.click();
  });

  await test.step('detalle de la promoción elegida', async () => {
    await expect(page).toHaveURL(/\/detalle\.html/);
    const detalle = page.locator('#detail');
    await expect(detalle).toBeVisible({ timeout: 15000 });
    await expect(detalle.locator('h1')).toHaveText(comercio);
    await expect(page.locator('#benefit')).toHaveText(beneficio);
    await page.locator('#back-to-list').click();
  });

  await test.step('regreso al listado', async () => {
    await expect(page).toHaveURL(/\/promociones\.html/);
    await expect(page.locator('#cards a[id^="promo-"]').first()).toBeVisible({ timeout: 15000 });
  });

  expect(errores, errores.join('\n')).toEqual([]);
});
