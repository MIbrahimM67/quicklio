import{test,expect}from'@playwright/test';
import fs from'node:fs';

const sitemap=fs.readFileSync('sitemap.xml','utf8');
const paths=[...sitemap.matchAll(/<loc>https:\/\/quicklio\.app(\/en\/[^<]+)<\/loc>/g)]
  .map(m=>m[1])
  .filter(path=>/^\/en\/[^/]+\/[^/]+\/$/.test(path));

test('sitemap exposes a meaningful tool set',()=>{
  expect(paths.length).toBeGreaterThanOrEqual(30);
});

for(const path of paths){
  test(path+' has guided flow and stable responsive layout',async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    await page.goto(path,{waitUntil:'domcontentloaded'});
    await expect(page.locator('body.tool-page')).toBeVisible();
    await expect(page.locator('[data-tool-flow-guide]')).toBeVisible();
    await expect(page.locator('[data-tool-flow-guide] li').first()).toContainText(/Add|Enter/);

    const desktop=await page.evaluate(()=>{
      const doc=document.documentElement;
      const wb=document.querySelector('.tool-workbench');
      const surface=wb||document.querySelector('main');
      const overflow=doc.scrollWidth-doc.clientWidth;
      let halfColumnTrap=false;
      if(wb&&wb.children.length===1){
        const style=getComputedStyle(wb);
        const child=wb.firstElementChild;
        if(style.display==='grid'&&child){
          const ratio=child.getBoundingClientRect().width/Math.max(1,wb.getBoundingClientRect().width);
          halfColumnTrap=ratio<.68;
        }
      }
      const clipped=[...document.querySelectorAll('main button,main .button')].filter(el=>{
        if(el.closest('[hidden],[aria-hidden="true"]'))return false;
        const r=el.getBoundingClientRect();
        const s=getComputedStyle(el);
        if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||!el.getClientRects().length)return false;
        if(!(r.left<-2||r.right>innerWidth+2))return false;
        let parent=el.parentElement;
        while(parent&&parent!==document.body){
          const ps=getComputedStyle(parent);
          if(['auto','scroll'].includes(ps.overflowX)&&parent.scrollWidth>parent.clientWidth)return false;
          parent=parent.parentElement;
        }
        return true;
      }).map(el=>(el.textContent||el.getAttribute('aria-label')||el.id||el.className).replace(/\s+/g,' ').trim());
      return{overflow,halfColumnTrap,clipped,surfaceWidth:surface?.getBoundingClientRect().width||0};
    });
    expect(desktop.overflow).toBeLessThanOrEqual(2);
    expect(desktop.halfColumnTrap).toBe(false);
    expect(desktop.clipped).toEqual([]);
    expect(desktop.surfaceWidth).toBeGreaterThan(260);

    await page.setViewportSize({width:375,height:812});
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('[data-tool-flow-guide]')).toBeVisible();
    const mobile=await page.evaluate(()=>{
      const clipped=[...document.querySelectorAll('main button,main .button')].filter(el=>{
        if(el.closest('[hidden],[aria-hidden="true"]'))return false;
        const r=el.getBoundingClientRect();
        const s=getComputedStyle(el);
        if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||!el.getClientRects().length)return false;
        if(!(r.left<-2||r.right>innerWidth+2))return false;
        let parent=el.parentElement;
        while(parent&&parent!==document.body){
          const ps=getComputedStyle(parent);
          if(['auto','scroll'].includes(ps.overflowX)&&parent.scrollWidth>parent.clientWidth)return false;
          parent=parent.parentElement;
        }
        return true;
      }).map(el=>(el.textContent||el.getAttribute('aria-label')||el.id||el.className).replace(/\s+/g,' ').trim());
      return{overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,clipped};
    });
    expect(mobile.overflow).toBeLessThanOrEqual(2);
    expect(mobile.clipped).toEqual([]);
  });
}
