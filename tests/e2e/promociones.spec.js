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
  test(`login se retira a la derecha sobre el home preparado (${movimiento})`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.emulateMedia({ reducedMotion:movimiento });
    await page.addInitScript(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        const animacion = animate.apply(this, args);
        if (this.id === 'menu-entry-loading') {
          const home = document.querySelector('.app-wrapper');
          sessionStorage.setItem('qa-slide-login', JSON.stringify({
            fotogramas:args[0], homeTransform:getComputedStyle(home).transform,
            contenidoVisible:!document.getElementById('menu-content').hidden
          }));
        }
        if (this.matches('.app-wrapper')) sessionStorage.setItem('qa-slide-menu', '1');
        return animacion;
      };
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
    await formulario.locator('[type="submit"]').click();
    await expect(formulario).toBeHidden();
    await expect(page.locator('#startup-spinner')).toBeVisible();
    await expect(page.locator('#startup-screen')).toBeHidden();
    aceptarLogin();
    await expect(page).toHaveURL(/\/menu\.html/);
    await expect(page.locator('.app-wrapper')).toBeInViewport();
    await expect(page.locator('#menu-entry-loading')).toBeVisible();
    await expect(page.locator('#menu-resume-loading')).toBeHidden();
    expect(await page.evaluate(() => sessionStorage.getItem('qa-slide-login'))).toBeNull();
    entregarProductos();
    await expect(page.locator('#menu-content')).toBeVisible({ timeout:15000 });
    await expect(page.locator('#menu-entry-loading')).toBeHidden();
    const slide = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qa-slide-login')));
    if (movimiento === 'reduce') expect(slide).toBeNull();
    else expect(slide).toEqual({ fotogramas:[{transform:'translateX(0)'},{transform:'translateX(100%)'}], homeTransform:'none', contenidoVisible:true });
    expect(await page.evaluate(() => sessionStorage.getItem('qa-slide-menu'))).toBeNull();
    expect(errores, errores.join('\n')).toEqual([]);
  });
}

test('el acceso recupera el formulario tras rechazo y permite reintentar una carga fallida del home', async ({ page }) => {
  const excepciones=[];
  page.on('pageerror',error=>excepciones.push(error.message));
  await page.goto(origen()+'/');
  const formulario=page.locator('#login-form');
  await expect(formulario).toBeVisible({timeout:15000});
  await formulario.locator('[name="username"]').fill('demo.basica');
  await formulario.locator('[name="password"]').fill('clave-incorrecta');
  const rechazo=page.waitForResponse(r=>r.url().endsWith('/api/auth/login'));
  await formulario.locator('[type="submit"]').click();
  expect((await rechazo).status()).toBe(401);
  await expect(page.locator('#login-error')).not.toBeEmpty();
  await expect(formulario).toBeVisible();
  await expect(page.locator('#startup-spinner')).toBeHidden();
  await expect(formulario.locator('[type="submit"]')).toBeEnabled();
  await formulario.locator('[name="password"]').fill('Basica2026');
  let primera=true;
  await page.route('**/api/menu',async ruta=>{
    if (primera) { primera=false;await ruta.fulfill({status:503,json:{error:'No se pudieron cargar los datos del menú.'}}); }
    else await ruta.continue();
  });
  await formulario.locator('[type="submit"]').click();
  await expect(page.locator('#menu-error')).toBeVisible({timeout:15000});
  await expect(page.locator('#menu-entry-loading')).toBeHidden();
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await expect(page.locator('#menu-content')).toBeVisible({timeout:15000});
  await expect(page.locator('#menu-entry-loading')).toBeHidden();
  await expect(page.locator('#tab-cuentas')).toBeEnabled();
  expect(excepciones).toEqual([]);
});

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
