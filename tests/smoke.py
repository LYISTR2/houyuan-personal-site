"""Run against the static server: python3 tests/smoke.py [base_url]."""
import json
import sys
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8081/'
ROOT = Path(__file__).resolve().parents[1]

def legacy_farm():
    return dict(v=2, coins=220, day=3, hour=8, harv=18, honey=2,
                plots=[dict(x=x, y=y, s='tomato' if (x,y)==(0,0) else None,
                            st=3 if (x,y)==(0,0) else 0, w=24, p=0, care=30)
                       for y in range(5) for x in range(7)],
                store={'wheat':[5,1,0]},town=dict(hens=2,cows=1,stock=dict(wood=7,stone=3,iron=2),
                    friends={'mian':25},buildings={'barn':1}))

for asset in list(ROOT.glob('*.html')) + list((ROOT/'assets').rglob('*')):
    if not asset.is_file(): continue
    with urlopen(urljoin(BASE,asset.relative_to(ROOT).as_posix())) as response:
        assert response.status == 200 and response.read() == asset.read_bytes(), asset
print('PASS static pages and every extracted asset served intact')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':960},reduced_motion='reduce')
    errors=[]
    context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
    page=context.new_page()
    page.goto(urljoin(BASE,'game.html'))
    assert page.evaluate('BackyardAdventure.flush()')
    mine=page.evaluate("JSON.parse(localStorage.getItem('yard-world-v1'))")
    mine['inv']={'4':5,'2':4,'iron':6,'coal':3,'potion':3,'5':4}
    # Fixtures are installed before scripts load, preserving real migration paths.
    farm=legacy_farm()
    context.add_init_script(f"""if(location.pathname.endsWith('/world.html')&&!sessionStorage.getItem('smoke-seeded')){{
      localStorage.setItem('pixelfarm-v1',{json.dumps(json.dumps(farm))});
      localStorage.setItem('yard-world-v1',{json.dumps(json.dumps(mine))});
      sessionStorage.setItem('smoke-seeded','1');
    }}""")
    page.goto(urljoin(BASE,'farm.html'))
    page.wait_for_url('**/world.html')
    page.locator('#worldStart').click()
    state=page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1'))")
    assert state['coins']==220 and state['plots'][0]['s']=='tomato'
    assert state['store']['wheat']==[5,1,0] and state['town']['friends']['mian']==25
    assert len(state['town']['ranch']['animals'])==3
    print('PASS old farm, quality bins, friends and chicken/cow migration')

    # Click a real plot, walk to it, harvest, then sow into the same soil.
    point=page.evaluate('toScreen(0,0)')
    page.mouse.click(*point)
    page.wait_for_function("JSON.parse(localStorage.getItem('pixelfarm-v1')).plots[0].s===null",timeout=15000)
    assert page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1')).harv") == 19
    point=page.evaluate('toScreen(0,0)');page.mouse.click(*point)
    page.wait_for_function("JSON.parse(localStorage.getItem('pixelfarm-v1')).plots[0].s==='wheat'")
    page.locator('#worldQuestBtn').click()
    assert page.locator('[data-farm-deliver]').is_enabled()
    page.locator('[data-farm-deliver]').click()
    assert page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1')).deliveries")==1
    page.keyboard.press('Escape')
    print('PASS click-to-walk, harvest, sow, and shared commission board')

    page.locator('#worldMapBtn').click();page.locator('[data-travel="mine"]').click()
    page.wait_for_function("BackyardWorld.position.region==='mine' && document.querySelector('#worldInteract').disabled===false",timeout=20000)
    page.locator('#worldInteract').click()
    page.wait_for_function("BackyardWorld.caveOpen && document.querySelector('#leaveCave').disabled===false",timeout=10000)
    frame=page.frame_locator('#caveMount iframe')
    game=page.frames[-1]
    inventory=game.evaluate("JSON.parse(localStorage.getItem('yard-world-v1')).inv")
    assert inventory['4']==12 and inventory['2']==7 and inventory['iron']==8
    assert page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1')).town.stock.wood")==0
    frame.locator('#touchCraft').evaluate('(button)=>button.click()')
    frame.locator('#cr [data-i="1"]').click() # Real torch recipe spends one wood and coal.
    page.locator('#leaveCave').click()
    page.wait_for_function('BackyardWorld.caveOpen===false')
    state=page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1'))")
    assert state['town']['stock']['wood']==11 and state['town']['stock']['iron']==8
    assert state['town']['stock']['coal']==2
    print('PASS mine entry, real crafting, and material settlement')
    page.locator('#worldInteract').click()
    page.wait_for_function("document.querySelector('#leaveCave').disabled===false")
    page.locator('#leaveCave').click();page.wait_for_function('BackyardWorld.caveOpen===false')
    assert page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1')).town.stock.wood")==11
    print('PASS repeated visits do not duplicate materials')

    page.locator('#worldMapBtn').click();page.locator('[data-travel="town"]').click()
    page.wait_for_function("BackyardWorld.position.region==='town'",timeout=20000)
    page.wait_for_timeout(6000)
    page.locator('#worldBagBtn').click();assert '铁矿' in page.locator('#townContent').inner_text()
    page.keyboard.press('Escape')
    page.locator('#worldMapBtn').click();page.locator('[data-travel="ranch"]').click()
    page.wait_for_function("BackyardWorld.position.region==='ranch'",timeout=20000)
    page.wait_for_timeout(5000)
    page.locator('#worldBagBtn').click();assert '鸡蛋' in page.locator('#townContent').inner_text()
    page.keyboard.press('Escape')
    print('PASS walking between town and ranch and opening their inventories')

    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-season="winter"]').click()
    assert page.locator('[data-season="winter"]').get_attribute('aria-pressed')=='true'
    page.locator('#worldMapBtn').click()
    assert page.locator('#worldMap').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.keyboard.press('Escape')
    page.screenshot(path='/tmp/backyard-mobile.png')
    print('PASS mobile controls, map, winter palette, and reduced-motion walking')
    page.goto(urljoin(BASE,'index.html#notes'))
    page.locator('#capIn').fill('河谷测试随手记');page.locator('#noteForm button').click();page.reload()
    assert '河谷测试随手记' in page.locator('#capList').inner_text()
    page.locator('#themeBtn').click();assert page.locator('html').get_attribute('data-theme')=='dark'
    assert not errors,errors
    print('PASS homepage notes, theme, and no JavaScript exceptions')
    browser.close()
