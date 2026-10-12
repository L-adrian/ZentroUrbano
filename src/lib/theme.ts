export const themeScript = `(function(){try{var t=localStorage.getItem('zu-theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

// Colors follow the chosen department (its flag): the session cookie is read before paint so there is no green flash.
export const departmentThemeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )zu_departamento=([^;]*)/);document.documentElement.dataset.departamento=m?m[1]:'santa-cruz'}catch(e){}})()`;
