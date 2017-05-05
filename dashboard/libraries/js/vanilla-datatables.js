/*!
 *
 * Vanilla-DataTables
 * Copyright (c) 2015-2017 Karl Saunders (http://mobiuswebdesign.co.uk)
 * Licensed under MIT (http://www.opensource.org/licenses/mit-license.php)
 *
 * Version: 1.1.6
 *
 */
!function(a,b){var c="DataTable";"function"==typeof define&&define.amd?define([],b(c)):"object"==typeof exports?module.exports=b(c):a[c]=b(c)}(this,function(a){"use strict";function n(a,d){var e=this,f={perPage:10,perPageSelect:[5,10,15,20,25],sortable:!0,searchable:!0,nextPrev:!0,firstLast:!1,prevText:"&lsaquo;",nextText:"&rsaquo;",firstText:"&laquo;",lastText:"&raquo;",truncatePager:!0,pagerDelta:2,fixedColumns:!0,fixedHeight:!1,header:!0,footer:!1,labels:{placeholder:"Search...",perPage:"{select} entries per page",noRows:"No entries found",info:"Showing {start} to {end} of {rows} entries"},layout:{top:"{select}{search}",bottom:"{info}{pager}"}};if(e.options=b.extend(f,d),!a)throw new Error("The plugin requires a table as the first parameter");if("string"==typeof a){var g=a;if(a=document.querySelector(a),!a)throw new Error("The element '"+g+"' can not be found.")}if("table"!==a.tagName.toLowerCase())throw new Error("The selected element is not a table.");if(e.options.header||(e.options.sortable=!1),null===a.tHead&&(!e.options.data||e.options.data&&!e.options.data.headings)&&(e.options.sortable=!1),!a.tBodies.length){if(!e.options.data)throw new Error("You don't seem to have a tbody in your table.");if(!e.options.data.rows)throw new Error("You seem to be using the data option, but you've not defined any rows.")}if(a.tBodies.length&&!a.tBodies[0].rows.length){if(!e.options.data)throw new Error("You don't seem to have any rows in your table.");if(!e.options.data.rows)throw new Error("You seem to be using the data option, but you've not defined any rows.")}e.table=a,e.isIE=!!/(msie|trident)/i.test(navigator.userAgent),e.currentPage=1,e.onFirstPage=!0,c.call(e),setTimeout(function(){e.emit("datatable.init")},10)}var b={extend:function(a,c){var d;for(d in c)c.hasOwnProperty(d)&&("[object Object]"===Object.prototype.toString.call(a[d])?b.extend(a[d],c[d]):a[d]=c[d]);return a},each:function(a,b,c){if("[object Object]"===Object.prototype.toString.call(a))for(var d in a)Object.prototype.hasOwnProperty.call(a,d)&&b.call(c,d,a[d],a);else for(var e=0,f=a.length;e<f;e++)b.call(c,e,a[e],a)},createElement:function(a,b){var c=document,d=c.createElement(a);if(b&&"object"==typeof b){var e;for(e in b)"html"===e?d.innerHTML=b[e]:"text"===e?d.appendChild(c.createTextNode(b[e])):d.setAttribute(e,b[e])}return d},createFragment:function(){return document.createDocumentFragment()},hasClass:function(a,b){return a.classList?a.classList.contains(b):!!a.className&&!!a.className.match(new RegExp("(\\s|^)"+b+"(\\s|$)"))},addClass:function(a,c){b.hasClass(a,c)||(a.classList?a.classList.add(c):a.className=a.className.trim()+" "+c)},removeClass:function(a,c){b.hasClass(a,c)&&(a.classList?a.classList.remove(c):a.className=a.className.replace(new RegExp("(^|\\s)"+c.split(" ").join("|")+"(\\s|$)","gi")," "))},append:function(a,b){return a&&b&&a.appendChild(b)},listen:function(a,b,c,d){a.addEventListener(b,function(a){c.call(d||this,a)},!1)},getBoundingRect:function(a){var b=window,c=document,d=c.body,e=a.getBoundingClientRect(),f=void 0!==b.pageXOffset?b.pageXOffset:(c.documentElement||d.parentNode||d).scrollLeft,g=void 0!==b.pageYOffset?b.pageYOffset:(c.documentElement||d.parentNode||d).scrollTop;return{bottom:e.bottom+g,height:e.height,left:e.left+f,right:e.right+f,top:e.top+g,width:e.width}},preventDefault:function(a){if(a=a||window.event,a.preventDefault)return a.preventDefault()},includes:function(a,b){return a.indexOf(b)>-1},button:function(a,c,d){return b.createElement("li",{class:a,html:'<a href="#" data-page="'+c+'">'+d+"</a>"})},flush:function(a,c){if(a instanceof NodeList)b.each(a,function(a,d){b.flush(d,c)});else if(c)for(;a.hasChildNodes();)a.removeChild(a.firstChild);else a.innerHTML=""}},c=function(){var a=this,c=a.options,f="";if(m.mixin(a),c.data&&l.call(a),a.tbody=a.table.tBodies[0],a.tHead=a.table.tHead,a.tFoot=a.table.tFoot,!a.tHead){var g=b.createElement("thead"),h=b.createElement("tr");b.each(a.tbody.rows[0].cells,function(a,c){b.append(h,b.createElement("th"))}),b.append(g,h),a.tHead=g}if(c.header||a.tHead&&a.table.removeChild(a.table.tHead),c.footer?a.tHead&&!a.tFoot&&(a.tFoot=b.createElement("tfoot",{html:a.tHead.innerHTML}),a.table.appendChild(a.tFoot)):a.tFoot&&a.table.removeChild(a.table.tFoot),a.wrapper=b.createElement("div",{class:"dataTable-wrapper"}),f+="<div class='dataTable-top'>",f+=c.layout.top,f+="</div>",f+="<div class='dataTable-container'></div>",f+="<div class='dataTable-bottom'>",f+=c.layout.bottom,f+="</div>",f=f.replace("{info}","<div class='dataTable-info'></div>"),c.perPageSelect){var i="<div class='dataTable-dropdown'><label>";i+=c.labels.perPage,i+="</label></div>";var k=b.createElement("select",{class:"dataTable-selector"});b.each(c.perPageSelect,function(a,b){var d=b===c.perPage,e=new Option(b,b,d,d);k.add(e)}),i=i.replace("{select}",k.outerHTML),f=f.replace("{select}",i)}else f=f.replace("{select}","");if(c.searchable){var n="<div class='dataTable-search'><input class='dataTable-input' placeholder='"+c.labels.placeholder+"' type='text'></div>";f=f.replace("{search}",n)}else f=f.replace("{search}","");var o=a.tHead.rows[0].cells;b.each(o,function(a,d){if(d.idx=a,c.sortable){var e=b.createElement("a",{href:"#",class:"dataTable-sorter",html:d.innerHTML});d.innerHTML="",b.append(d,e)}}),b.addClass(a.table,"dataTable-table");var p=b.createElement("div",{class:"dataTable-pagination"}),q=b.createElement("ul");if(b.append(p,q),f=f.replace(/\{pager\}/g,p.outerHTML),a.wrapper.innerHTML=f,a.container=a.wrapper.querySelector(".dataTable-container"),a.paginators=a.wrapper.querySelectorAll(".dataTable-pagination"),a.label=a.wrapper.querySelector(".dataTable-info"),a.table.parentNode.replaceChild(a.wrapper,a.table),a.container.appendChild(a.table),a.rect=b.getBoundingRect(a.table),a.rows=Array.prototype.slice.call(a.tbody.rows),a.update(),c.fixedHeight&&j.call(a),c.fixedColumns){var r,s=!1;if(a.table.tHead)r=a.table.tHead.rows[0].cells,b.each(r,function(c,d){var e=b.getBoundingRect(d),f=e.width/a.rect.width*100;d.style.width=f+"%"});else{r=[],s=b.createElement("thead");var t=b.createElement("tr"),u=a.table.tBodies[0].rows[0].cells;b.each(u,function(a,c){var d=b.createElement("th");t.appendChild(d),r.push(d)}),s.appendChild(t),a.table.insertBefore(s,a.table.tBodies[0]);var v=[];b.each(r,function(c,d){var e=b.getBoundingRect(d),f=e.width/a.rect.width*100;v.push(f)}),b.each(this.rows,function(a,c){b.each(c.cells,function(a,b){b.style.width=v[a]+"%"})}),a.table.removeChild(s)}}d.call(a),e.call(a)},d=function(){var a=this.options;a.header||b.addClass(this.wrapper,"no-header"),a.footer||b.addClass(this.wrapper,"no-footer"),a.sortable&&b.addClass(this.wrapper,"sortable"),a.searchable&&b.addClass(this.wrapper,"searchable"),a.fixedHeight&&b.addClass(this.wrapper,"fixed-height"),a.fixedColumns&&b.addClass(this.wrapper,"fixed-columns")},e=function(){var a=this,c=a.options;if(c.perPageSelect){var d=a.wrapper.querySelector(".dataTable-selector");d&&b.listen(d,"change",function(b){c.perPage=parseInt(this.value,10),a.update(),c.fixedHeight&&j.call(a),a.emit("datatable.perpage")})}c.searchable&&(a.input=a.wrapper.querySelector(".dataTable-input"),a.input&&b.listen(a.input,"keyup",function(b){a.search(this.value)})),b.listen(a.wrapper,"click",function(c){var d=c.target;"a"===d.nodeName.toLowerCase()&&d.hasAttribute("data-page")&&(b.preventDefault(c),a.page(d.getAttribute("data-page")))}),c.sortable&&b.listen(a.tHead,"click",function(c){c=c||window.event;var d=c.target;"a"===d.nodeName.toLowerCase()&&b.hasClass(d,"dataTable-sorter")&&(b.preventDefault(c),a.sortColumn(d.parentNode.idx+1))})},f=function(){var a=this,b=a.options.perPage,c=a.searching?a.searchData:a.rows;a.pages=c.map(function(a,d){return d%b===0?c.slice(d,d+b):null}).filter(function(a){return a}),a.totalPages=a.lastPage=a.pages.length},g=function(){var a=this;if(a.totalPages){a.currentPage>a.totalPages&&(a.currentPage=1);var c=a.currentPage-1,d=b.createFragment();switch(b.each(a.pages[c],function(a,c){b.append(d,c)}),a.clear(d),a.onFirstPage=!1,a.onLastPage=!1,a.currentPage){case 1:a.onFirstPage=!0;break;case a.lastPage:a.onLastPage=!0}}var h,e=0,f=0,g=0;if(a.totalPages&&(e=a.currentPage-1,f=e*a.options.perPage,g=f+a.pages[e].length,f+=1,h=a.searching?a.searchData.length:a.rows.length),a.label&&a.options.labels.info.length){var i=a.options.labels.info.replace("{start}",f).replace("{end}",g).replace("{page}",a.currentPage).replace("{pages}",a.totalPages).replace("{rows}",h);a.label.innerHTML=h?i:""}a.options.fixedHeight&&1==a.currentPage&&j.call(a)},h=function(){var a=this;if(b.flush(a.paginators,a.isIE),!(a.totalPages<=1)){var c="pager",d=b.createFragment(),e=a.onFirstPage?1:a.currentPage-1,f=a.onlastPage?a.totalPages:a.currentPage+1;a.options.firstLast&&b.append(d,b.button(c,1,a.options.firstText)),a.options.nextPrev&&b.append(d,b.button(c,e,a.options.prevText));var g=a.links;a.options.truncatePager&&(g=k(a.links,a.currentPage,a.pages.length,a.options.pagerDelta)),b.addClass(a.links[a.currentPage-1],"active"),b.each(g,function(a,c){b.removeClass(c,"active"),b.append(d,c)}),b.addClass(a.links[a.currentPage-1],"active"),a.options.nextPrev&&b.append(d,b.button(c,f,a.options.nextText)),a.options.firstLast&&b.append(d,b.button(c,a.totalPages,a.options.lastText)),b.each(a.paginators,function(a,c){b.append(c,d.cloneNode(!0))})}},i=function(a,b){var c,d;1===b?(c=0,d=a.length):b===-1&&(c=a.length-1,d=-1);for(var e=!0;e;){e=!1;for(var f=c;f!=d;f+=b)if(a[f+b]&&a[f].value>a[f+b].value){var g=a[f],h=a[f+b],i=g;a[f]=h,a[f+b]=i,e=!0}}return a},j=function(){this.container.style.height=null,this.rect=b.getBoundingRect(this.container),this.container.style.height=this.rect.height+"px"},k=function(a,c,d,e){e=e||2;var f,g=2*e,h=c-e,i=c+e,j=[],k=[];c<4-e+g?i=3+g:c>d-(3-e+g)&&(h=d-(2+g));for(var l=1;l<=d;l++)if(1==l||l==d||l>=h&&l<=i){var m=a[l-1];b.removeClass(m,"active"),j.push(m)}return b.each(j,function(c,d){var e=d.children[0].getAttribute("data-page");if(f){var g=f.children[0].getAttribute("data-page");if(e-g==2)k.push(a[g]);else if(e-g!=1){var h=b.createElement("li",{class:"ellipsis",html:'<a href="#">&hellip;</a>'});k.push(h)}}k.push(d),f=d}),k},l=function(){var a=this.options.data,c=!1,d=!1;if(a.headings){c=b.createElement("thead");var e=b.createElement("tr");b.each(a.headings,function(a,c){var d=b.createElement("th",{html:c});e.appendChild(d)}),c.appendChild(e)}a.rows&&(d=b.createElement("tbody"),b.each(a.rows,function(c,e){if(a.headings&&a.headings.length!==e.length)throw new Error("The number of rows do not match the number of headings.");var f=b.createElement("tr");b.each(e,function(a,c){var d=b.createElement("td",{html:c});f.appendChild(d)}),d.appendChild(f)})),c&&(null!==this.table.tHead&&this.table.removeChild(this.table.tHead),b.append(this.table,c)),d&&(this.table.tBodies.length&&this.table.removeChild(this.table.tBodies[0]),b.append(this.table,d))},m=function(){};return m.prototype={on:function(a,b){this._events=this._events||{},this._events[a]=this._events[a]||[],this._events[a].push(b)},off:function(a,b){this._events=this._events||{},a in this._events!=!1&&this._events[a].splice(this._events[a].indexOf(b),1)},emit:function(a){if(this._events=this._events||{},a in this._events!=!1)for(var b=0;b<this._events[a].length;b++)this._events[a][b].apply(this,Array.prototype.slice.call(arguments,1))}},m.mixin=function(a){for(var b=["on","off","emit"],c=0;c<b.length;c++)"function"==typeof a?a.prototype[b[c]]=m.prototype[b[c]]:a[b[c]]=m.prototype[b[c]];return a},n.prototype.update=function(){var a=this;f.call(a),g.call(a),a.links=[];for(var c=a.pages.length;c--;){var d=c+1;a.links[c]=b.button(0===c?"active":"",d,d)}h.call(a),a.emit("datatable.update")},n.prototype.search=function(a){var c=this;return a=a.toLowerCase(),c.currentPage=1,c.searching=!0,c.searchData=[],a.length?(c.clear(),b.each(c.rows,function(d,e){var f=b.includes(c.searchData,e);b.includes(e.textContent.toLowerCase(),a)&&!f&&c.searchData.push(e)}),b.addClass(this.wrapper,"search-results"),c.searchData.length||(b.removeClass(this.wrapper,"search-results"),c.setMessage(c.options.labels.noRows)),c.update(),void c.emit("datatable.search",a,c.searchData)):(c.searching=!1,c.update(),c.emit("datatable.search",a,c.searchData),b.removeClass(this.wrapper,"search-results"),!1)},n.prototype.page=function(a){var b=this;return a!=b.currentPage&&(isNaN(a)||(b.currentPage=parseInt(a,10)),!(a>b.pages.length||a<0)&&(g.call(b),h.call(b),void b.emit("datatable.page",a)))},n.prototype.sortColumn=function(a,c){if(a<1||a>this.tHead.rows[0].cells.length)return!1;a-=1;var e,d=this,f=d.searching?d.searchData:d.rows,g=[],h=[],j=0,k=0,l=d.tHead.rows[0].cells[a];b.each(f,function(b,c){var d=c.cells[a],e=d.textContent,f=e.replace(/(\$|\,|\s)/g,"");parseFloat(f)==f?h[k++]={value:Number(f),row:c}:g[j++]={value:e,row:c}});var m,n;b.hasClass(l,"asc")||"asc"==c?(m=i(g,-1),n=i(h,-1),e="descending",b.removeClass(l,"asc"),b.addClass(l,"desc")):(m=i(h,1),n=i(g,1),e="ascending",b.removeClass(l,"desc"),b.addClass(l,"asc")),this.lastTh&&l!=this.lastTh&&(b.removeClass(this.lastTh,"desc"),b.removeClass(this.lastTh,"asc")),this.lastTh=l,f=m.concat(n),d.searching?(d.searchData=[],b.each(f,function(a,b){d.searchData.push(b.row)})):(d.rows=[],b.each(f,function(a,b){d.rows.push(b.row)})),d.update(),d.emit("datatable.sort",a,e)},n.prototype.addRows=function(a){if("[object Object]"!==Object.prototype.toString.call(a))throw new Error("Function addRows: The method requires an object.");if(!a.rows)throw new Error("Function addRows: Your object is missing the 'rows' property.");var c=this;b.each(a.rows,function(a,d){var e=b.createElement("tr");b.each(d,function(a,c){var d=b.createElement("td",{html:c});e.appendChild(d)}),c.rows.push(e)}),this.update()},n.prototype.refresh=function(){this.options.searchable&&(this.input.value="",this.searching=!1),this.currentPage=1,this.onFirstPage=!0,this.update(),this.emit("datatable.refresh")},n.prototype.clear=function(a){this.tbody&&b.flush(this.tbody,this.isIE);var c=this.tbody;this.tbody||(c=this.table),a&&b.append(c,a)},n.prototype.setMessage=function(a){var c=this.rows[0].cells.length;this.clear(b.createElement("tr",{html:'<td class="dataTables-empty" colspan="'+c+'">'+a+"</td>"}))},n});