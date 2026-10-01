"""Check sunrise entry, postcard transition, responsive layout and fallbacks."""
import sys
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8081/'
PAINT_PROBE = """window.openingPaints=0;
const fill=CanvasRenderingContext2D.prototype.fillRect;
CanvasRenderingContext2D.prototype.fillRect=function(...args){
  if(this.canvas.classList.contains('op-canvas'))window.openingPaints++;
  return fill.apply(this,args);
};"""

def assert_home(page):
    assert page.locator('#opening').is_hidden()
    assert page.locator('#opening').get_attribute('aria-hidden') == 'true'
    assert not page.evaluate("document.querySelector('.site').inert")
    assert not page.evaluate("document.documentElement.classList.contains('op-lock')")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

def assert_visible_bounds(page, selector):
    rect = page.locator(selector).bounding_box()
    viewport = page.viewport_size
    assert rect and rect['x'] >= -1 and rect['y'] >= -1, (selector, rect)
    assert rect['x'] + rect['width'] <= viewport['width'] + 1, (selector, rect)
    assert rect['y'] + rect['height'] <= viewport['height'] + 1, (selector, rect)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':960})
    context.add_init_script(PAINT_PROBE)
    page = context.new_page(); errors = []; requests = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    page.goto(urljoin(BASE,'index.html'))
    assert page.locator('#opening').is_visible()
    assert page.evaluate("document.querySelector('.site').inert")
    assert page.locator('#opening').get_attribute('aria-hidden') == 'false'
    page.keyboard.press('Tab')
    assert page.evaluate("document.activeElement.matches('.op-skip')")
    page.wait_for_function("document.querySelector('#opening').classList.contains('is-ready')")
    assert page.evaluate("document.activeElement.matches('.op-enter')")
    page.keyboard.press('Tab')
    assert page.evaluate("document.activeElement.matches('.op-skip')")
    page.keyboard.press('Shift+Tab')
    assert page.evaluate("document.activeElement.matches('.op-enter')")
    assert page.locator('#postcardScene').is_visible()
    page.screenshot(path='/tmp/backyard-opening-desktop.png')
    page.locator('.op-enter').click()
    assert page.locator('.postcard').evaluate("e=>e.style.visibility==='hidden'")
    page.locator('#opening').wait_for(state='hidden')
    assert_home(page)
    assert page.evaluate("document.activeElement.matches('.mark')")
    assert page.locator('.postcard').evaluate("e=>e.style.visibility===''")
    paints = page.evaluate('openingPaints')
    page.wait_for_timeout(150)
    assert page.evaluate('openingPaints') == paints
    page.reload(); assert_home(page)
    assert all(urlparse(url).netloc == urlparse(BASE).netloc for url in requests), requests
    assert not errors, errors
    print('PASS sunrise, postcard landing, focus trap/restoration, session memory and stopped rendering')

    page.evaluate('window.scrollTo(0,1200)')
    page.locator('#replayOpening').click()
    assert page.evaluate('scrollY===0')
    page.keyboard.press('Escape'); page.locator('#opening').wait_for(state='hidden')
    assert_home(page)
    assert page.evaluate("document.activeElement.id==='replayOpening'")
    page.locator('#replayOpening').click()
    page.wait_for_function("document.querySelector('#opening').classList.contains('is-ready')")
    page.locator('.op-enter').click()
    page.evaluate('YardOpening.replay()')
    page.wait_for_timeout(1800)
    assert page.locator('#opening').is_visible()
    page.keyboard.press('Escape'); page.locator('#opening').wait_for(state='hidden')
    assert_home(page)
    print('PASS replay resets scroll, early escape and interrupted transition cannot close a new opening')
    context.close()

    context = browser.new_context(reduced_motion='reduce')
    page = context.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for width,height in [(320,568),(360,640),(375,667),(390,844),(430,932),(768,1024),(844,390),(640,320),(568,320),(480,320),(1280,720)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(urljoin(BASE,'index.html'))
        if page.locator('#opening').is_hidden(): page.locator('#replayOpening').click()
        assert page.locator('.op-enter').is_visible()
        assert_visible_bounds(page,'.op-title')
        assert_visible_bounds(page,'.op-card')
        assert_visible_bounds(page,'.op-enter')
        assert_visible_bounds(page,'.op-skip')
        if width == 390: page.screenshot(path='/tmp/backyard-opening-phone.png')
        page.locator('.op-enter').click(); assert_home(page)
        assert_visible_bounds(page,'.top-tools')
        if width == 390: page.screenshot(path='/tmp/backyard-home-phone.png',full_page=True)
        if width <= 600:
            assert all(box['height'] >= 44 for box in page.locator('.atlas-pin').evaluate_all('(nodes)=>nodes.map(e=>({height:e.getBoundingClientRect().height}))'))
    page.goto(urljoin(BASE,'index.html#notes')); assert_home(page)
    page.locator('#capIn').fill('日出后，记下今天。'); page.locator('#noteForm button').click()
    page.reload(); assert '日出后，记下今天。' in page.locator('#capList').inner_text()
    page.locator('#themeBtn').click()
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    page.locator('.note-list .text').click()
    assert page.locator('.note-list .text').get_attribute('class') == 'text done'
    page.locator('.note-list .delete').click()
    assert page.locator('.note-list .empty').is_visible()
    assert not errors, errors
    print('PASS eleven viewport sizes, portrait/landscape, reduced motion, theme and persistent notes')
    context.close()

    context = browser.new_context(viewport={'width':390,'height':844})
    context.add_init_script("""HTMLCanvasElement.prototype.getContext=function(){return null;};""")
    page = context.new_page(); errors = []
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(urljoin(BASE,'index.html'))
    assert page.locator('.op-fallback').is_visible()
    assert page.locator('.op-enter').is_visible()
    page.locator('.op-enter').click(); page.locator('#opening').wait_for(state='hidden')
    assert_home(page)
    assert page.locator('.postcard-fallback').is_visible()
    assert not errors,errors
    print('PASS unavailable canvas shows image fallback and keeps entry usable')
    context.close()

    context = browser.new_context()
    context.add_init_script('Element.prototype.animate=undefined')
    page = context.new_page(); page.goto(urljoin(BASE,'index.html'))
    page.locator('.op-skip').click(); assert_home(page)
    page.locator('#replayOpening').click()
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function("!document.querySelector('.site').inert")
    assert_home(page)
    print('PASS unavailable animation API and live reduced-motion change release the page')
    context.close()

    context = browser.new_context()
    context.add_init_script("""Object.defineProperty(window,'sessionStorage',{get(){throw new Error('storage blocked')}});""")
    page = context.new_page(); page.goto(urljoin(BASE,'index.html#notes')); assert_home(page)
    page.goto(urljoin(BASE,'index.html')); assert page.locator('#opening').is_visible()
    page.locator('.op-skip').click(); page.locator('#opening').wait_for(state='hidden'); assert_home(page)
    print('PASS blocked session storage still respects direct anchors and skip')
    context.close()

    context = browser.new_context()
    context.route('**/assets/js/opening.js',lambda route:route.abort())
    page = context.new_page(); page.goto(urljoin(BASE,'index.html')); assert_home(page)
    assert page.locator('.postcard-fallback').is_visible()
    assert page.locator('#replayOpening').is_hidden()
    page.locator('#capIn').fill('脚本失败仍能记下一句。'); page.locator('#noteForm button').click()
    assert '脚本失败仍能记下一句。' in page.locator('#capList').inner_text()
    print('PASS failed opening script leaves the homepage and notes available')
    context.close()

    context = browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
    page = context.new_page(); page.goto(urljoin(BASE,'index.html'))
    assert page.locator('#opening').is_hidden()
    assert page.locator('.postcard-fallback').is_visible()
    assert page.locator('.valley-chapters a').count() == 7
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    print('PASS homepage and seven destinations remain visible without JavaScript')
    context.close(); browser.close()
