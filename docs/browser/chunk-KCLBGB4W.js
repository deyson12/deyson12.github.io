import{Aa as $,Da as F,Ea as L,a as P,la as k,pa as A,ua as u,yb as j}from"./chunk-I64CR7NR.js";import{A as f,Ab as I,Fa as B,Ic as M,Qb as w,S as i,Sa as d,T as h,Ta as y,Wa as l,X as s,Y as b,eb as a,fb as H,ga as U,hb as G,ia as p,ib as C,jb as c,n as x,o as g,pb as D,qb as S,r as E,rb as O,zb as v}from"./chunk-UWJN7WDY.js";var R=class t{constructor(r){this.http=r}apiUrl=`${j.apiUrl}/api/products`;getProductById(r){return this.http.get(`${this.apiUrl}/${r}`).pipe(f(e=>g(()=>new Error("Ocurri\xF3 un error al obtener el producto"))))}saveOrUpdateProduct(r){return console.log("Vamos a crear: ",r),this.http.post(`${this.apiUrl}/saveOrUpdate`,r).pipe(E(e=>e.token),f(this.handleError))}handleError(r){return g(()=>new Error("Ocurri\xF3 un error creando el producto"))}getAllProducts(){return this.http.get(this.apiUrl)}getAllProductsByQuery(r){return this.http.get(`${this.apiUrl}/search/${r}`).pipe(f(e=>(console.error("Error fetching products by query:",e),g(()=>new Error("Ocurri\xF3 un error al buscar productos")))))}getProductsByCategory(r){let e="";return r==="all"?e=`${this.apiUrl}`:e=`${this.apiUrl}/category/:categoryCode`.replace(":categoryCode",r),this.http.get(e)}getFeaturedProductsByCategory(r){let e="";return r==="all"?e=`${this.apiUrl}/featured`:e=`${this.apiUrl}/featured/category/:categoryCode`.replace(":categoryCode",r),this.http.get(e)}getDiscount(r){let e=r.price,o=r.originalPrice;return!r||e===void 0||o===void 0||o==null||o<=0?"0%":((o-e)/o*100).toFixed(0)+"%"}getSalesDetail(r){return r===void 0||r<0?"0":r>0&&r<100?r+"":r>=100&&r<1e3?"100+":"1000+"}getProductsBySellerId(r){let e=`${this.apiUrl}/seller/:sellerId`.replace(":sellerId",r);return this.http.get(e)}deleteProduct(r){return this.http.delete(`${this.apiUrl}/${r}`).pipe(f(e=>(console.error("Error deleting product:",e),g(()=>new Error("Ocurri\xF3 un error al eliminar el producto")))))}updateProduct(r){return console.log("Vamos a actualizar: ",r),x(r)}static \u0275fac=function(e){return new(e||t)(s(P))};static \u0275prov=i({token:t,factory:t.\u0275fac,providedIn:"root"})};var N=class t{constructor(r){this.http=r}apiUrl=`${j.apiUrl}/api/categories`;getAllCategories(){return this.http.get(this.apiUrl)}getActiveCategories(){return this.http.get(`${this.apiUrl}/active`)}static \u0275fac=function(e){return new(e||t)(s(P))};static \u0275prov=i({token:t,factory:t.\u0275fac,providedIn:"root"})};var T=class t{constructor(r){this.messageService=r}showInfo(r,e){this.messageService.add({severity:"success",summary:r,detail:e,life:3e3})}showError(r,e){this.messageService.add({severity:"error",summary:r,detail:e,life:3e3})}static \u0275fac=function(e){return new(e||t)(s(A))};static \u0275prov=i({token:t,factory:t.\u0275fac,providedIn:"root"})};var st=(()=>{class t extends L{pathId;ngOnInit(){this.pathId="url(#"+k()+")"}static \u0275fac=(()=>{let e;return function(n){return(e||(e=p(t)))(n||t)}})();static \u0275cmp=d({type:t,selectors:[["TimesCircleIcon"]],features:[l],decls:6,vars:7,consts:[["width","14","height","14","viewBox","0 0 14 14","fill","none","xmlns","http://www.w3.org/2000/svg"],["fill-rule","evenodd","clip-rule","evenodd","d","M7 14C5.61553 14 4.26215 13.5895 3.11101 12.8203C1.95987 12.0511 1.06266 10.9579 0.532846 9.67879C0.00303296 8.3997 -0.13559 6.99224 0.134506 5.63437C0.404603 4.2765 1.07129 3.02922 2.05026 2.05026C3.02922 1.07129 4.2765 0.404603 5.63437 0.134506C6.99224 -0.13559 8.3997 0.00303296 9.67879 0.532846C10.9579 1.06266 12.0511 1.95987 12.8203 3.11101C13.5895 4.26215 14 5.61553 14 7C14 8.85652 13.2625 10.637 11.9497 11.9497C10.637 13.2625 8.85652 14 7 14ZM7 1.16667C5.84628 1.16667 4.71846 1.50879 3.75918 2.14976C2.79989 2.79074 2.05222 3.70178 1.61071 4.76768C1.16919 5.83358 1.05367 7.00647 1.27876 8.13803C1.50384 9.26958 2.05941 10.309 2.87521 11.1248C3.69102 11.9406 4.73042 12.4962 5.86198 12.7212C6.99353 12.9463 8.16642 12.8308 9.23232 12.3893C10.2982 11.9478 11.2093 11.2001 11.8502 10.2408C12.4912 9.28154 12.8333 8.15373 12.8333 7C12.8333 5.45291 12.2188 3.96918 11.1248 2.87521C10.0308 1.78125 8.5471 1.16667 7 1.16667ZM4.66662 9.91668C4.58998 9.91704 4.51404 9.90209 4.44325 9.87271C4.37246 9.84333 4.30826 9.8001 4.2544 9.74557C4.14516 9.6362 4.0838 9.48793 4.0838 9.33335C4.0838 9.17876 4.14516 9.0305 4.2544 8.92113L6.17553 7L4.25443 5.07891C4.15139 4.96832 4.09529 4.82207 4.09796 4.67094C4.10063 4.51982 4.16185 4.37563 4.26872 4.26876C4.3756 4.16188 4.51979 4.10066 4.67091 4.09799C4.82204 4.09532 4.96829 4.15142 5.07887 4.25446L6.99997 6.17556L8.92106 4.25446C9.03164 4.15142 9.1779 4.09532 9.32903 4.09799C9.48015 4.10066 9.62434 4.16188 9.73121 4.26876C9.83809 4.37563 9.89931 4.51982 9.90198 4.67094C9.90464 4.82207 9.84855 4.96832 9.74551 5.07891L7.82441 7L9.74554 8.92113C9.85478 9.0305 9.91614 9.17876 9.91614 9.33335C9.91614 9.48793 9.85478 9.6362 9.74554 9.74557C9.69168 9.8001 9.62748 9.84333 9.55669 9.87271C9.4859 9.90209 9.40996 9.91704 9.33332 9.91668C9.25668 9.91704 9.18073 9.90209 9.10995 9.87271C9.03916 9.84333 8.97495 9.8001 8.9211 9.74557L6.99997 7.82444L5.07884 9.74557C5.02499 9.8001 4.96078 9.84333 4.88999 9.87271C4.81921 9.90209 4.74326 9.91704 4.66662 9.91668Z","fill","currentColor"],[3,"id"],["width","14","height","14","fill","white"]],template:function(o,n){o&1&&(U(),D(0,"svg",0)(1,"g"),O(2,"path",1),S(),D(3,"defs")(4,"clipPath",2),O(5,"rect",3),S()()()),o&2&&(c(n.getClassNames()),a("aria-label",n.ariaLabel)("aria-hidden",n.ariaHidden)("role",n.role),B(),a("clip-path",n.pathId),B(3),H("id",n.pathId))},encapsulation:2})}return t})();var q=["*"],Q=({dt:t})=>`
.p-inputgroup,
.p-inputgroup .p-floatlabel,
.p-inputgroup .p-iftalabel {
    display: flex;
    align-items: stretch;
    width: 100%;
}

.p-inputgroup .p-inputtext,
.p-inputgroup .p-inputwrapper {
    flex: 1 1 auto;
    width: 1%;
}

.p-inputgroupaddon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${t("inputgroup.addon.padding")};
    background: ${t("inputgroup.addon.background")};
    color: ${t("inputgroup.addon.color")};
    border-block-start: 1px solid ${t("inputgroup.addon.border.color")};
    border-block-end: 1px solid ${t("inputgroup.addon.border.color")};
    min-width: ${t("inputgroup.addon.min.width")};
}

.p-inputgroupaddon:first-child,
.p-inputgroupaddon + .p-inputgroupaddon {
    border-inline-start: 1px solid ${t("inputgroup.addon.border.color")};
}

.p-inputgroupaddon:last-child {
    border-inline-end: 1px solid ${t("inputgroup.addon.border.color")};
}

.p-inputgroupaddon:has(.p-button) {
    padding: 0;
    overflow: hidden;
}

.p-inputgroupaddon .p-button {
    border-radius: 0;
}

.p-inputgroup > .p-component,
.p-inputgroup > .p-inputwrapper > .p-component,
.p-inputgroup:first-child > p-button > .p-button,
.p-inputgroup > .p-floatlabel > .p-component,
.p-inputgroup > .p-floatlabel > .p-inputwrapper > .p-component,
.p-inputgroup > .p-iftalabel > .p-component,
.p-inputgroup > .p-iftalabel > .p-inputwrapper > .p-component {
    border-radius: 0;
    margin: 0;
}

.p-inputgroupaddon:first-child,
.p-inputgroup > .p-component:first-child,
.p-inputgroup > .p-inputwrapper:first-child > .p-component,
.p-inputgroup > .p-floatlabel:first-child > .p-component,
.p-inputgroup > .p-floatlabel:first-child > .p-inputwrapper > .p-component,
.p-inputgroup > .p-iftalabel:first-child > .p-component,
.p-inputgroup > .p-iftalabel:first-child > .p-inputwrapper > .p-component {
    border-start-start-radius: ${t("inputgroup.addon.border.radius")};
    border-end-start-radius: ${t("inputgroup.addon.border.radius")};
}

.p-inputgroupaddon:last-child,
.p-inputgroup > .p-component:last-child,
.p-inputgroup > .p-inputwrapper:last-child > .p-component,
.p-inputgroup > .p-floatlabel:last-child > .p-component,
.p-inputgroup > .p-floatlabel:last-child > .p-inputwrapper > .p-component,
.p-inputgroup > .p-iftalabel:last-child > .p-component,
.p-inputgroup > .p-iftalabel:last-child > .p-inputwrapper > .p-component {
    border-start-end-radius: ${t("inputgroup.addon.border.radius")};
    border-end-end-radius: ${t("inputgroup.addon.border.radius")};
}

.p-inputgroup .p-component:focus,
.p-inputgroup .p-component.p-focus,
.p-inputgroup .p-inputwrapper-focus,
.p-inputgroup .p-component:focus ~ label,
.p-inputgroup .p-component.p-focus ~ label,
.p-inputgroup .p-inputwrapper-focus ~ label {
    z-index: 1;
}

.p-inputgroup > .p-button:not(.p-button-icon-only) {
    width: auto;
}

/*For PrimeNG*/

.p-inputgroup p-button:first-child, .p-inputgroup p-button:last-child {
    display: inline-flex;
}

.p-inputgroup:has(> p-button:first-child) .p-button{
    border-start-start-radius: ${t("inputgroup.addon.border.radius")};
    border-end-start-radius: ${t("inputgroup.addon.border.radius")};
}

.p-inputgroup:has(> p-button:last-child) .p-button {
    border-start-end-radius: ${t("inputgroup.addon.border.radius")};
    border-end-end-radius: ${t("inputgroup.addon.border.radius")};
}
`,J={root:({props:t})=>["p-inputgroup",{"p-inputgroup-fluid":t.fluid}]},V=(()=>{class t extends ${name="inputgroup";theme=Q;classes=J;static \u0275fac=(()=>{let e;return function(n){return(e||(e=p(t)))(n||t)}})();static \u0275prov=i({token:t,factory:t.\u0275fac})}return t})();var K=(()=>{class t extends F{style;styleClass;_componentStyle=b(V);static \u0275fac=(()=>{let e;return function(n){return(e||(e=p(t)))(n||t)}})();static \u0275cmp=d({type:t,selectors:[["p-inputgroup"],["p-inputGroup"],["p-input-group"]],hostAttrs:[1,"p-inputgroup"],hostVars:5,hostBindings:function(o,n){o&2&&(a("data-pc-name","inputgroup"),C(n.style),c(n.styleClass))},inputs:{style:"style",styleClass:"styleClass"},features:[w([V]),l],ngContentSelectors:q,decls:1,vars:0,template:function(o,n){o&1&&(v(),I(0))},dependencies:[M,u],encapsulation:2})}return t})(),vt=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275mod=y({type:t});static \u0275inj=h({imports:[K,u,u]})}return t})();var W=["*"],X={root:"p-inputgroupaddon"},Z=(()=>{class t extends ${name="inputgroupaddon";classes=X;static \u0275fac=(()=>{let e;return function(n){return(e||(e=p(t)))(n||t)}})();static \u0275prov=i({token:t,factory:t.\u0275fac})}return t})(),Y=(()=>{class t extends F{style;styleClass;_componentStyle=b(Z);get hostStyle(){return this.style}static \u0275fac=(()=>{let e;return function(n){return(e||(e=p(t)))(n||t)}})();static \u0275cmp=d({type:t,selectors:[["p-inputgroup-addon"],["p-inputGroupAddon"]],hostVars:7,hostBindings:function(o,n){o&2&&(a("data-pc-name","inputgroupaddon"),C(n.hostStyle),c(n.styleClass),G("p-inputgroupaddon",!0))},inputs:{style:"style",styleClass:"styleClass"},features:[w([Z]),l],ngContentSelectors:W,decls:1,vars:0,template:function(o,n){o&1&&(v(),I(0))},dependencies:[M],encapsulation:2})}return t})(),xt=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275mod=y({type:t});static \u0275inj=h({imports:[Y,u,u]})}return t})();export{st as a,K as b,vt as c,Y as d,xt as e,R as f,N as g,T as h};
