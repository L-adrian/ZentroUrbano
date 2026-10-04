// Pixel house for the splash: R roof, W wall, K window, D door, G ground.
const houseRows = [
  ".....R.....",
  "....RRR....",
  "...RRRRR...",
  "..RRRRRRR..",
  ".RRRRRRRRR.",
  "RRRRRRRRRRR",
  ".WWWWWWWWW.",
  ".WKKWWWKKW.",
  ".WKKWDWKKW.",
  ".WWWWDWWWW.",
  "GGGGGGGGGGG",
];
const kinds = { R: "roof", W: "wall", K: "window", D: "door", G: "ground" } as const;

// Built from the ground up, left to right within each row.
export const splashHousePixels = houseRows
  .flatMap((row, y) => [...row].map((cell, x) => ({ x, y, cell })))
  .filter(({ cell }) => cell in kinds)
  .sort((a, b) => b.y - a.y || a.x - b.x)
  .map(({ x, y, cell }, order) => ({ x, y, order, kind: kinds[cell as keyof typeof kinds] }));

// Runs in <head> before the first paint. Shows the splash once per session; the bar follows the
// real load (document parsed, images done, window load) and never holds the page more than ~5 s.
export const splashScript = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem("zu-splash")||matchMedia("(prefers-reduced-motion: reduce)").matches)return;sessionStorage.setItem("zu-splash","1")}catch(e){return}
d.classList.add("zu-splash-on");var start=Date.now(),shown=0,loaded=false,MIN=1800,MAX=4200;
function real(){var s=document.readyState,r=s==="loading"?25:55,imgs=document.images,n=imgs.length,c=0;for(var i=0;i<n;i++)if(imgs[i].complete)c++;if(s!=="loading")r+=n?35*c/n:35;return Math.min(r,92)}
function tick(){var t=Date.now()-start,goal=loaded?100:Math.max(real(),Math.min(88,t/MAX*88));shown+=(goal-shown)*0.1;if(goal-shown<0.6)shown=goal;d.style.setProperty("--zu-splash-pct",String(Math.round(shown)));
if((loaded&&t>=MIN&&shown>=100)||t>MAX+800){d.style.setProperty("--zu-splash-pct","100");d.classList.add("zu-splash-out");setTimeout(function(){d.classList.remove("zu-splash-on","zu-splash-out")},700);return}requestAnimationFrame(tick)}
addEventListener("load",function(){loaded=true});requestAnimationFrame(tick)})();`;
