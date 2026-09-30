"""Check the opening lifecycle, original valley renderer and graceful fallback."""
import sys
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8081/'

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':800})
    page=context.new_page();errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.goto(urljoin(BASE,'index.html'))
    page.wait_for_function("document.querySelector('#opening').classList.contains('has-scene')",timeout=20000)
    assert page.evaluate("document.querySelector('.site').inert")
    assert page.locator('#opening').get_attribute('aria-hidden')=='false'
    page.locator('[data-opening-stop="0"]').click()
    page.wait_for_function("document.querySelector('#opening').classList.contains('is-arrived')")
    page.wait_for_timeout(700)
    assert page.locator('#openingTitle').inner_text()=='后院'
    assert page.evaluate("document.querySelector('#openingValley').width>1")
    page.screenshot(path='/tmp/backyard-opening-desktop.png')
    page.keyboard.press('Escape')
    assert page.locator('#opening').is_hidden()
    assert page.locator('#openingInvitation').is_hidden()
    assert not page.evaluate("document.querySelector('.site').inert")
    assert page.evaluate("document.activeElement.matches('.mark')")
    page.reload();assert page.locator('#opening').is_hidden()
    print('PASS original pixel valley, title, skip, focus restoration and session memory')

    page.locator('#replayOpening').click()
    page.locator('[data-opening-stop="1"]').click()
    assert page.locator('[data-opening-stop="1"]').get_attribute('aria-current')=='step'
    page.keyboard.press('ArrowRight')
    assert page.locator('[data-opening-stop="2"]').get_attribute('aria-current')=='step'
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-opening-stop="0"]').click();page.wait_for_timeout(700)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    rect=page.locator('#openingSkip').bounding_box();assert rect['y']+rect['height']<=844
    page.screenshot(path='/tmp/backyard-opening-phone.png')
    page.locator('[data-opening-stop="2"]').click()
    page.locator('#openingEnter').wait_for(state='visible')
    page.locator('#openingSkip').focus();page.keyboard.press('Tab')
    assert page.evaluate("document.activeElement.id==='openingEnter'")
    page.keyboard.press('Enter')
    page.wait_for_function("document.querySelector('#opening').getAttribute('aria-hidden')==='true'",timeout=5000)
    assert page.locator('#opening').is_hidden()
    assert page.evaluate("document.activeElement.id==='replayOpening'")
    assert all(urlparse(url).netloc==urlparse(BASE).netloc for url in requests),requests
    assert not errors,errors
    print('PASS replay, chapter navigation, mobile, focus containment, enter and no external requests')
    context.close()

    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=context.new_page();requests=[];page.on('request',lambda r:requests.append(r.url))
    page.goto(urljoin(BASE,'index.html'))
    assert page.locator('#opening').is_hidden() and page.locator('#replayOpening').is_hidden()
    assert not any('opening-scene.js' in url for url in requests)
    page.locator('#themeBtn').click()
    page.locator('#capIn').fill('夜游开场检查');page.locator('#noteForm button').click()
    page.reload();assert '夜游开场检查' in page.locator('#capList').inner_text()
    print('PASS reduced motion skips graphics and keeps homepage theme/notes usable')
    context.close()

    context=browser.new_context()
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    context.add_init_script("""const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        return type==='2d'&&this.id==='openingValley'?null:original.call(this,type,...args);
      };""")
    page.goto(urljoin(BASE,'index.html'));page.wait_for_timeout(1200)
    assert not page.locator('#opening').evaluate("e=>e.classList.contains('has-scene')")
    page.locator('[data-opening-stop="0"]').click();page.wait_for_timeout(400)
    page.screenshot(path='/tmp/backyard-opening-fallback.png')
    page.wait_for_function("document.querySelector('#opening').getAttribute('aria-hidden')==='true'",timeout=20000)
    assert not page.evaluate("document.querySelector('.site').inert")
    assert page.locator('#openingInvitation').is_hidden()
    assert not errors,errors
    print('PASS unavailable-canvas fallback and automatic return without a scroll lock')
    context.close()

    context=browser.new_context();page=context.new_page()
    context.route('**/assets/js/opening-scene.js',lambda route:route.abort())
    page.goto(urljoin(BASE,'index.html'));page.wait_for_timeout(200)
    assert page.locator('#opening').is_visible()
    page.locator('#openingSkip').click();page.locator('#replayOpening').click()
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("!document.querySelector('.site').inert")
    assert page.locator('#opening').is_hidden()
    assert not page.evaluate("document.querySelector('.site').inert")
    page.goto(urljoin(BASE,'index.html#notes'));assert page.locator('#opening').is_hidden()
    print('PASS missing graphics, preference changes and direct homepage anchors')
    context.close()

    # A late script must not reactivate an opening that the visitor already skipped.
    from pathlib import Path
    context=browser.new_context();page=context.new_page();pending=[]
    context.route('**/assets/js/opening-scene.js',lambda route:pending.append(route))
    page.goto(urljoin(BASE,'index.html'),wait_until='domcontentloaded')
    page.locator('#openingSkip').click()
    page.wait_for_function("document.querySelector('#opening').getAttribute('aria-hidden')==='true'")
    assert pending
    pending[0].fulfill(status=200,content_type='text/javascript',body=(Path(__file__).resolve().parents[1]/'assets/js/opening-scene.js').read_text())
    page.wait_for_timeout(250)
    assert page.locator('#opening').is_hidden()
    assert not page.locator('#opening').evaluate("e=>e.classList.contains('has-scene')")
    print('PASS skipping before scene load cannot reopen the overlay')
    context.close();browser.close()
