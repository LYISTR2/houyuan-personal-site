"""Exercise the outdoor games through real map clicks and controls."""
import json
import sys
import time
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8081/'

def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('pixelfarm-v1'))")

def open_world(browser,x,y,mobile=False):
    context=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':960}, reduced_motion='reduce')
    errors=[]
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    farm=dict(v=2,coins=100,day=3,hour=8,harv=20,
              plots=[dict(x=x,y=y,s=None,st=0,w=0,p=0) for y in range(5) for x in range(7)],
              town=dict(stock=dict(wood=7,bait=3),buildings={}))
    position=dict(v=1,x=x,y=y,visited=['farm'],started=True)
    context.add_init_script(f"""if(!sessionStorage.getItem('outdoors-fixture')){{
      localStorage.setItem('pixelfarm-v1',{json.dumps(json.dumps(farm))});
      localStorage.setItem('backyard-world-v1',{json.dumps(json.dumps(position))});
      sessionStorage.setItem('outdoors-fixture','1');
    }}""")
    page.goto(urljoin(BASE,'world.html'));page.locator('#worldStart').click();page.wait_for_timeout(250)
    return context,page,errors

def click_world(page,x,y):
    page.mouse.click(*page.evaluate(f'BackyardWorld.project({x},{y})'))

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context,page,errors=open_world(browser,845,244)
    before=saved(page)
    for _ in range(3):
        click_world(page,845,220);page.wait_for_timeout(420)
    state=saved(page)
    assert state['town']['stock']['wood']==11,state['town']['stock']
    assert state['town']['stock']['sap']==1
    assert state['hour']==before['hour']+1
    page.reload();page.locator('#worldStart').click();page.wait_for_timeout(200)
    click_world(page,845,220);page.wait_for_timeout(420)
    assert saved(page)['town']['stock']['wood']==11
    assert page.evaluate("BackyardActivities.treeStage('pine-1')")=='stump'
    for _ in range(3): page.locator('#skip').click()
    assert page.evaluate("BackyardActivities.treeStage('pine-1')")=='grown'
    assert not errors,errors
    print('PASS real tree chopping, shared wood/sap, reload, no duplicate and regeneration')
    context.close()

    context,page,errors=open_world(browser,115,177)
    click_world(page,115,160)
    page.wait_for_function("BackyardActivities.current?.kind==='rings'")
    clock=saved(page)['hour'];coins=saved(page)['coins']
    for _ in range(5):
        page.wait_for_function("Math.abs(parseFloat(document.querySelector('#ringCursor').style.left)-(parseFloat(document.querySelector('#ringGoal').style.left)+13))<5",timeout=5000)
        page.keyboard.press('Space');page.wait_for_timeout(30)
    assert page.locator('#activityResult').is_visible()
    state=saved(page);assert state['town']['outdoors']['tickets']>=3
    assert state['coins']>coins and state['hour']==clock+1
    tickets=state['town']['outdoors']['tickets']
    page.keyboard.press('Escape')
    page.locator('#worldOverview').click();page.wait_for_timeout(100)
    click_world(page,333,233);page.wait_for_function("BackyardActivities.current?.kind==='prizes'",timeout=15000)
    page.locator('[data-prize="seeds"]').click()
    assert saved(page)['town']['seedPackets']['wheat']==3
    assert saved(page)['town']['outdoors']['tickets']==tickets-3
    page.keyboard.press('Escape')
    click_world(page,336,145);page.wait_for_function("BackyardActivities.current?.kind==='memory'",timeout=10000)
    # Learn faces by revealing cards, then solve using remembered observations.
    known={};matched=set()
    while len(matched)<8:
        pair=None
        for a,face in known.items():
            candidates=[b for b,f in known.items() if b!=a and f==face and b not in matched]
            if a not in matched and candidates: pair=(a,candidates[0]);break
        if pair:
            for i in pair: page.locator(f'[data-card="{i}"]').click()
            matched.update(pair)
        else:
            unknown=[i for i in range(8) if i not in known and i not in matched]
            a=unknown[0];page.locator(f'[data-card="{a}"]').click()
            face=page.locator(f'[data-card="{a}"]').get_attribute('aria-label').split(' · ')[0];known[a]=face
            candidates=[b for b,f in known.items() if b!=a and f==face and b not in matched]
            b=candidates[0] if candidates else next(i for i in range(8) if i!=a and i not in matched and i not in known)
            page.locator(f'[data-card="{b}"]').click();known[b]=page.locator(f'[data-card="{b}"]').get_attribute('aria-label').split(' · ')[0]
            if known[a]==known[b]: matched.update((a,b))
            else: page.wait_for_timeout(750)
    assert page.locator('#activityResult').is_visible()
    assert page.locator('#activityAction').is_visible()
    page.locator('#activityAction').click();click_world(page,239,151)
    page.wait_for_function("BackyardActivities.current?.kind==='targets'",timeout=10000)
    deadline=time.monotonic()+24
    while page.evaluate("BackyardActivities.current?.phase")!='result':
        up=page.locator('[data-target].up')
        if up.count(): up.click()
        page.wait_for_timeout(100)
        assert time.monotonic()<deadline
    assert saved(page)['town']['outdoors']['best']['targets']>=10
    assert saved(page)['town']['outdoors']['parkRewards']==3
    page.screenshot(path='/tmp/backyard-park.png')
    page.keyboard.press('Escape');page.reload();page.locator('#worldStart').click()
    assert saved(page)['town']['seedPackets']['wheat']==3
    assert not errors,errors
    print('PASS ring timing, ticket redemption, memory matching, target hits and saved rewards')
    context.close()

    context,page,errors=open_world(browser,973,705,True)
    click_world(page,972,705);page.wait_for_function("BackyardActivities.current?.kind==='fishing'")
    assert page.locator('#activityPanel').bounding_box()['x']>=0
    assert saved(page)['town']['stock']['bait']==2
    page.wait_for_function("BackyardActivities.current?.phase==='bite'",timeout=6000)
    page.keyboard.press('e');page.wait_for_function("BackyardActivities.current?.phase==='reeling'")
    deadline=time.monotonic()+20;held=False
    while page.evaluate("BackyardActivities.current?.phase")=='reeling':
        center,fish=page.evaluate("[parseFloat(document.querySelector('#fishingZone').style.left)+18,parseFloat(document.querySelector('#fishingFish').style.left)]")
        need_hold=center<fish
        if need_hold!=held:
            (page.keyboard.down if need_hold else page.keyboard.up)('e');held=need_hold
        page.wait_for_timeout(50)
        assert time.monotonic()<deadline
    page.keyboard.up('e')
    state=saved(page)
    assert state['town']['outdoors']['catches']==1,state['town']
    assert state['town']['stock']['fish']+state['town']['stock']['carp']==1
    assert state['hour']==10 and state['town']['fishingCount']==1
    assert page.locator('#activityResult').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path='/tmp/backyard-fishing-mobile.png')
    page.locator('#activityAction').click();assert page.locator('#activityPanel').is_hidden()
    page.reload();page.locator('#worldStart').click()
    assert saved(page)['town']['outdoors']['catches']==1
    click_world(page,972,705);page.wait_for_function("BackyardActivities.current?.kind==='fishing'")
    page.keyboard.press('Escape')
    assert saved(page)['hour']==12 and saved(page)['town']['fishingCount']==2
    assert not errors,errors
    print('PASS mobile casting, bite, controlled reeling, inventory, reload and cancelled cast')
    context.close();browser.close()
