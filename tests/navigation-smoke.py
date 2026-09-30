"""Check destination entry, resume, and first paint under slow/failed script loading."""
import asyncio
import sys
from urllib.parse import urljoin
from playwright.async_api import async_playwright

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8081/'
REGIONS=['farm','ranch','town','park','forest','fishing','mine']
PAINT_PROBE="""window.paintedBeforeWorld=0;
for(const method of ['fillRect','drawImage']){
 const original=CanvasRenderingContext2D.prototype[method];
 CanvasRenderingContext2D.prototype[method]=function(...args){
  if(this.canvas.id==='cv'&&!window.BackyardWorld)window.paintedBeforeWorld++;
  return original.apply(this,args);
 };
}"""

async def ready(page):
    await page.wait_for_function("document.body.dataset.worldState==='ready'")

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for mobile in [False,True]:
            context=await browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':960},reduced_motion='reduce')
            await context.add_init_script(PAINT_PROBE)
            page=await context.new_page();errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            for destination in REGIONS:
                await page.goto(urljoin(BASE,'index.html#work'))
                selector=f'.atlas-pin[href="world.html?place={destination}"]' if mobile else f'.valley-chapters [data-place="{destination}"]'
                await page.locator(selector).click()
                await ready(page)
                state=await page.evaluate('({position:BackyardWorld.position,paintedBeforeWorld,paused:BackyardWorld.paused})')
                assert state['position']['region']==destination,state
                assert not state['paused'] and state['paintedBeforeWorld']==0,state
                assert await page.locator('#worldWelcome').is_hidden()
                assert await page.locator('#ttl,#townNav,#ranchDock,#workshop').count()==0
                if destination=='farm':
                    await page.locator('#worldInteract').click()
                    assert await page.locator('#ledger').is_visible()
                    await page.keyboard.press('Escape')
                    assert await page.locator('#ledger').is_hidden()
                    assert await page.locator('#worldBagBtn').evaluate('(button)=>document.activeElement===button')
                assert '?place=' not in page.url
                x,y=await page.evaluate(f'[BackyardGeography.regions.{destination}.x,BackyardGeography.regions.{destination}.y]')
                assert state['position']['x']==x and state['position']['y']==y
                screen=await page.evaluate(f'BackyardWorld.project({x},{y})')
                assert abs(screen[0]-(390 if mobile else 1440)/2)<1
            await page.keyboard.down('s');await page.wait_for_timeout(250);await page.keyboard.up('s')
            position=await page.evaluate('BackyardWorld.position')
            await page.reload();await ready(page)
            assert await page.evaluate('BackyardWorld.position')==position
            assert not await page.evaluate('BackyardWorld.paused')
            await page.locator('#worldHelpBtn').click()
            assert await page.evaluate('BackyardWorld.paused')
            await page.reload();await ready(page)
            assert await page.locator('#worldWelcome').is_hidden()
            assert not await page.evaluate('BackyardWorld.paused')
            # Returning home goes straight back to the place list, without replaying the opening.
            await page.locator('.world-brand a').click()
            await page.wait_for_url('**/index.html#work')
            assert await page.locator('.valley-chapters').is_visible()
            assert await page.evaluate('!document.querySelector("#top").inert && document.querySelector("#opening").getAttribute("aria-hidden")==="true"')
            assert not errors,errors
            print('PASS seven '+('mobile map pins' if mobile else 'desktop place cards')+', direct first frame, refresh/resume, help and home')
            await context.close()

        context=await browser.new_context();await context.add_init_script(PAINT_PROBE)
        page=await context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        gate=asyncio.Event()
        async def delayed(route):
            await gate.wait();await route.continue_()
        await page.route('**/assets/js/world.js*',delayed)
        navigation=asyncio.create_task(page.goto(urljoin(BASE,'world.html?place=forest')))
        await page.wait_for_function('typeof rs === "function"')
        await page.wait_for_timeout(600)
        assert await page.locator('#worldBoot').is_visible()
        assert await page.locator('#cv').is_hidden()
        assert await page.evaluate('!window.BackyardWorld && paintedBeforeWorld===0 && (tick(),hour===8)')
        await page.screenshot(path='/tmp/backyard-loading.png')
        gate.set();await navigation;await ready(page)
        assert await page.evaluate("BackyardWorld.position.region==='forest' && paintedBeforeWorld===0")
        await page.screenshot(path='/tmp/backyard-forest-entry.png')
        assert not errors,errors
        print('PASS delayed world script: loading shell, no legacy frame, correct destination')
        await page.unroute('**/assets/js/world.js*',delayed)
        async def failed(route):
            await route.abort()
        await page.route('**/assets/js/world.js*',failed)
        await page.goto(urljoin(BASE,'world.html?place=park'))
        assert await page.locator('#worldRetry').is_visible()
        assert await page.locator('#cv').is_hidden()
        assert await page.locator('body').get_attribute('data-world-state')=='error'
        await page.unroute('**/assets/js/world.js*',failed)
        await page.locator('#worldRetry').click();await ready(page)
        assert await page.evaluate("BackyardWorld.position.region==='park'")
        print('PASS failed script shows retry; recovery keeps the chosen destination')
        await context.close()

        # Only new generic visits show the welcome; old URLs preserve their destination and hash.
        context=await browser.new_context();page=await context.new_page()
        await page.goto(urljoin(BASE,'world.html'));await ready(page)
        assert await page.locator('#worldWelcome').is_visible()
        await page.locator('#worldStart').click()
        await page.reload();await ready(page)
        assert await page.locator('#worldWelcome').is_hidden()
        await page.goto(urljoin(BASE,'farm.html?place=fishing&source=bookmark#river'));await ready(page)
        assert await page.evaluate("BackyardWorld.position.region==='fishing'")
        assert page.url.endswith('world.html?source=bookmark#river'),page.url
        # The pier extends past the old standalone map's save boundary.
        await page.mouse.click(*await page.evaluate('BackyardWorld.project(1030,710)'))
        await page.wait_for_function('BackyardWorld.position.x>1025')
        await page.wait_for_timeout(100)
        pier_position=await page.evaluate('BackyardWorld.position')
        await page.reload();await ready(page)
        assert await page.evaluate('BackyardWorld.position')==pier_position

        await page.goto(urljoin(BASE,'world.html?place=__proto__'));await ready(page)
        assert await page.evaluate("BackyardWorld.position.region==='fishing'")
        print('PASS first visit, continuing visits, old bookmarks and invalid destinations')
        await browser.close()

asyncio.run(main())
