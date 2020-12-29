(this.webpackJsonptofu=this.webpackJsonptofu||[]).push([[0],{380:function(e,t,n){"use strict";n.r(t);var r=n(1),s=n(14),o=n(2),c=n.n(o),i=n(52),a=n.n(i),l=n(16),d=n(6),u=n(386),h=n(42),p=n.n(h),m=n(3);const f=["altKey","ctrlKey","metaKey","shiftKey"];class g{constructor(e,t=null){this.start=void 0,this._end=void 0,this.toString=()=>null==this._end?this.start:this.start+" - "+this._end,this.start=e,this._end=t}get end(){var e;return null!==(e=this._end)&&void 0!==e?e:this.start}isSingle(){return this.start==this.end}includes(e){return e>=this.start&&e<=this.end}equals(e){return this.start==e.start&&this.end==e.end}}function b(e){return Array.isArray(e)?new g(e[0].start,e[e.length-1].end):new g(e.start,e.end)}const j=(...e)=>b(v(...e));function x(e,t){const n=e.left.end+t.slice(e.left.end,e.right.start).indexOf(e.operator);return new g(n,n+e.operator.length)}const y=(...e)=>(({start:e,name:t})=>new g(e,e+t.length))(v(...e)),O=({start:e,kind:t})=>new g(e,e+t.length);function S(e,t,n=[]){const r=[];for(const{key:o,value:c}of function*(e){for(const t in e)new Set(["__clone"]).has(t)||(yield{value:e[t],key:t,computed:!1})}(e))if(Array.isArray(c))for(let e=0;e<c.length;e++){const s=c[e];m.isNode(s)&&b(s).includes(t)&&r.push([s,[...n,o,e]])}else m.isNode(c)&&b(c).includes(t)&&r.push([c,[...n,o]]);const s=1==r.length?r[0]:!r.every((([e])=>m.isJSXOpeningElement(e)&&m.isJSXClosingElement(e)))&&r.find((([e])=>r.every((([t])=>e.start>=t.start))));return s?[s,...S(s[0],t,s[1])]:[]}function w(e,t){return S(e,t).map((([e])=>e))}function E(e,t,n=-1){const r=S(e,t);return r[r.length+n][0]}function v(e,t){return t.reduce(((e,t)=>e[t]),e)}var k=n(165),I=n(96);class A{constructor(e){this.source=void 0,this.source=e}replaceSource({start:e,end:t},n){return R(this.source.slice(0,Math.max(e,0))+n+this.source.slice(t))}}class C extends A{constructor(e,t){super(e),this.error=void 0,this.error=t}}class T extends A{constructor(e,t){super(e),this.ast=void 0,this.ast=t}mutateAST(e){this.ast[I.b]=!0;const t=Object(I.a)(this.ast,e);return new T(p()(t,{retainLines:!0}).code,t)}}function L(e){return e instanceof T}function R(e){try{return new T(e,Object(k.parse)(e,{sourceType:"module",plugins:["jsx","typescript"]}))}catch(t){if(!(t instanceof SyntaxError)&&"Assert fail"!=t.message)throw new Error(t);return new C(e,t)}}var D=n(166),$=n.n(D);const F=({node:e,path:t,code:n,cursor:r},s)=>r.isSingle()&&{code:n.mutateAST((e=>{const n=m.jsxIdentifier(s),r=v(e,t.slice(0,-1));v(e,t.slice(0,-2))[t[t.length-2]]=m.jsxElement(m.jsxOpeningElement(n,[]),m.jsxClosingElement(n),r.children)})),cursor:n=>new g(v(n.ast,[...t.slice(0,-1),m.isJSXOpeningFragment(e)?"openingElement":"closingElement","name"]).end)};function N(e,t,n){const r=m.jsxIdentifier(n),s=v(e,t.slice(0,-1));v(e,t.slice(0,-2))[t[t.length-2]]=n?m.jsxElement(m.jsxOpeningElement(r,s.openingElement.attributes),m.jsxClosingElement(r),s.children):m.jsxFragment(m.jsxOpeningFragment(),m.jsxClosingFragment(),s.children)}const M=(e,t)=>e.name.start<=t.start&&e.name.end>=t.end,P=({node:e,path:t,code:n,cursor:r})=>!(m.isJSXOpeningElement(e)&&e.selfClosing)&&M(e,r)&&m.isJSXIdentifier(e.name)&&["Backspace","Delete"].map((s=>({on:{code:s},do:()=>({code:n.mutateAST((n=>{const{name:o}=e.name;N(n,t,o.slice(0,r.start-e.name.start-("Backspace"==s&&r.isSingle()?1:0))+o.slice(r.end-e.name.start+("Delete"==s&&r.isSingle()?1:0)))})),cursor:n=>new g(v(n.ast,t).name.start+(r.start-e.name.start)-("Backspace"==s&&r.isSingle()?1:0))})}))),W=({node:e,path:t,code:n,cursor:r},s)=>{if(!m.isJSXIdentifier(e.name)||!M(e,r)||m.isJSXOpeningElement(e)&&e.selfClosing)return!1;const o=e.name;return{code:n.mutateAST((e=>{const n=o.start,c=o.name.slice(0,r.start-n)+s+o.name.slice(r.end-n);N(e,t,c)})),cursor:n=>new g(v(n.ast,[...t.slice(0,-1),m.isJSXOpeningElement(e)?"openingElement":"closingElement","name"]).end)}};function _(e,t){const n=e.end;return e.selfClosing&&t==n-2?new g(n-2,n-1):t==n-1}function K(e,t){let n=e.findIndex((e=>e&&e.start>t));return-1==n&&(n=e.length),n}const G=({node:e,path:t,code:n,cursor:{start:r,end:s}},o,c)=>r>e.start&&s<e.end&&{info:{type:"ADD_ELEMENT"},on:{key:","},do:()=>{let i=K(e[o],r);return(r==e.start&&s==e.start||E(n.ast,r).start==r)&&(i=Math.max(0,i-1)),{code:n.mutateAST((e=>{v(e,t)[o].splice(i,0,c)})),cursor:({ast:e})=>j(e,[...t,o,i])}}},B=e=>(Array.isArray(e)?e:[e]).flat(1/0);const U=e=>p()(e,{retainLines:!0}).code.trim(),J=({node:e,code:t,cursor:n})=>x(e,t.source).includes(n.start)&&["&","|","+","-","*","/","=","<",">"].map((r=>({info:{type:"CHANGE_OPERATION",operator:r},on:{key:r},do:()=>({code:t.mutateAST((t=>{const s=E(t,n.start),o=["&","|","="].includes(r);s.operator="="===r?">"==e.operator||"<"==e.operator?e.operator+"=":r.repeat("=="==e.operator?3:2):!o||1!=s.operator.length&&s.operator[0]===r?r:r+r})),cursor:({ast:e,source:t},{start:n})=>x(E(e,n),t)})}))),H=[{type:"ARRAY",key:"[",wrap:e=>`[${e}]`},{type:"OBJECT",key:"{",wrap:e=>`({key: ${e||'""'}})`},{type:"FUNCTION_CALL",key:"(",wrap:e=>`fn(${e})`},{type:"ARROW_FUNCTION",key:">",wrap:e=>`(() => (${e}))`},{type:"JSX_ELEMENT",key:"<",wrap:e=>`<>{${e}}</>`}],X=(e,t)=>t==e.start||t==e.end,z=({node:e,path:t,code:n,cursor:{start:r,end:s}})=>B([e.start==r&&e.end==s&&[H.map((({type:e,key:o,wrap:c})=>({info:{type:"WRAP",wrapper:e},on:{key:o},do:()=>{const e=n.source.slice(r,s);return{code:n.replaceSource(new g(r,s),c("null"==e?"":e)),cursor:({ast:e})=>j(e,t)}}}))),{info:{type:"WRAP",wrapper:"TERNARY"},on:{key:"?"},do:()=>({code:n.replaceSource(b(e),n.source.slice(e.start,e.end)+" ? null : null"),cursor:({ast:e})=>j(e,[...t,"consequent"])})}],e.end==r&&[{info:{type:"MAKE_MEMBER"},on:{key:"."},do:()=>({code:n.replaceSource(new g(e.start,e.end),`${n.source.slice(e.start,e.end)}.p`),cursor:({ast:e})=>j(e,[...t,"property"])})},!m.isNumericLiteral(e)&&[!m.isObjectExpression(e)&&{info:{type:"MAKE_CALL"},on:{key:"("},do:()=>({code:n.replaceSource(new g(r),"()"),cursor:({ast:e},{start:t})=>new g(t+1)})},{info:{type:"MAKE_COMPUTED_MEMBER"},on:{key:"["},do:()=>({code:n.replaceSource(new g(r),"[0]"),cursor:({ast:e})=>j(e,[...t,"property"])})}]]]).map((e=>({...e,do:(t,n)=>{const s=e.do(t,n),[[o],[c]]=S(t.ast,r).reverse();return m.isStringLiteral(o)&&m.isJSXAttribute(c),s}}))),Z={NumericLiteral:{hasSlot:()=>!0,actions:({node:e,code:t,cursor:n})=>Number.isInteger(e.value)&&n.isSingle()&&n.start==e.end&&{info:{type:"DOT"},on:{key:"."},do:()=>({code:t.replaceSource(n,".0"),cursor:()=>new g(n.start+1,n.start+2)})}},StringLiteral:{hasSlot:(e,t)=>!0},TemplateLiteral:{hasSlot:()=>!0},BooleanLiteral:{hasSlot:b},NullLiteral:{hasSlot:b},Identifier:{hasSlot:()=>!0},UnaryExpression:{hasSlot:()=>!0},BinaryExpression:{hasSlot:(e,t,{source:n})=>{const r=x(e,n);return!!r.includes(t)&&r},actions:J},LogicalExpression:{hasSlot(e,t,{source:n}){const r=x(e,n);return!!r.includes(t)&&r},actions:J},ArrayExpression:{hasSlot:(e,t)=>0==e.elements.length&&t==e.start+1||t==e.end||function(e,t){const n=[],r=[];for(let s=0;s<e.elements.length;s++){const t=e.elements[s];t?r.push(t.end):(n.push(s),r.push(0==s?e.start+1:r[s-1]+2))}return r.filter(((e,t)=>n.includes(t))).includes(t)}(e,t),actions:({node:e,path:t,code:n,cursor:r})=>[r.start>e.start&&r.end<e.end&&["LEFT","RIGHT"].map((s=>{const o=K(e.elements,r.start)-1;let c=null;if("LEFT"==s&&o>0&&(c=-1),"RIGHT"==s&&o<e.elements.length-1&&(c=1),null===c)return null;const i=o+c,a=e.elements[Math.min(o,i)],l=e.elements[Math.max(o,i)];return{info:{type:"MOVE_ELEMENT",direction:s},on:{key:"LEFT"==s?"ArrowLeft":"ArrowRight",altKey:!0},do:()=>({code:n.replaceSource(new g(a.start,l.end),U(l)+","+U(a)),cursor:({ast:e})=>j(e,[...t,"elements",i])})}})),G({node:e,path:t,code:n,cursor:r},"elements",m.nullLiteral())]},ObjectExpression:{hasSlot:(e,t)=>0==e.properties.length&&t==e.start+1||t==e.end,actions:e=>G(e,"properties",m.objectProperty(m.identifier("p"),m.identifier("p"),!1,!0))},ObjectProperty:{actions:({node:e,path:t,code:n})=>e.shorthand&&{on:{key:":"},do:()=>({code:n.mutateAST((e=>{v(e,t).value=m.nullLiteral()})),cursor:e=>j(e.ast,t.concat("value"))})}},MemberExpression:{hasSlot:(e,t)=>e.computed&&t==e.end},FunctionExpression:{hasSlot:(e,t,n)=>t==e.start+n.source.slice(e.start,e.body.start).indexOf("function ")+"function ".length||0==e.params.length&&t==e.start+n.source.slice(e.start,e.body.start).indexOf("()")+1,actions:e=>G(e,"params",m.identifier("p"))},ArrowFunctionExpression:{hasSlot:(e,t)=>0==e.params.length&&e.start+1==t,actions:({node:e,cursor:t,code:n,path:r})=>[t.start<e.body.start&&G({node:e,path:r,code:n,cursor:t},"params",m.identifier("p")),{info:{type:"CONVERT",to:"FunctionExpression"},do:()=>({code:n.mutateAST((t=>{v(t,r.slice(0,-1))[r[r.length-1]]=Object.assign(m.functionExpression(null,[],m.blockStatement([])),$()(e,"params","async","body"))}))})}]},CallExpression:{hasSlot:(e,t)=>0==e.arguments.length&&e.end-1==t,actions:({node:e,cursor:t,...n})=>t.start>e.callee.end&&G({node:e,cursor:t,...n},"arguments",m.nullLiteral())},...{JSXIdentifier:{hasSlot:()=>!0},JSXText:{hasSlot:e=>!!e.value.trim(),actions:({code:e,cursor:t})=>({on:{key:"{"},do:()=>({code:e.replaceSource(t,"{}"),cursor:()=>new g(t.start+1)})})},JSXFragment:{hasSlot:(e,t)=>e.openingFragment.end==t},JSXOpeningFragment:{hasSlot:(e,t)=>e.start+1==t,onInput:F},JSXClosingFragment:{hasSlot:(e,t)=>e.start+2==t,onInput:F},JSXElement:{hasSlot:(e,t)=>e.openingElement.end==t,actions:({code:e,cursor:t})=>({on:{key:"{"},do:()=>({code:e.replaceSource(t,"{}"),cursor:()=>new g(t.start+1)})})},JSXOpeningElement:{hasSlot:_,actions:({node:e,path:t,code:n,cursor:r})=>[P({node:e,path:t,code:n,cursor:r}),_(e,r.start)&&{on:e.selfClosing?[{code:"Backspace"},{code:"Delete"}]:{key:"/"},do:()=>({code:n.mutateAST((n=>{const r=v(n,t.slice(0,-1));e.selfClosing?(e.selfClosing=!1,r.closingElement=m.jsxClosingElement(e.name)):(e.selfClosing=!0,r.closingElement=null)})),cursor(e){const n=v(e.ast,t);return n.selfClosing?new g(n.end-2,n.end-1):new g(n.end-1)}})}],onInput:W},JSXClosingElement:{actions:P,onInput:W},JSXAttribute:{actions:({node:e,path:t,code:n,cursor:r})=>r.start==e.end&&!e.value&&{on:{key:"="},do:()=>({code:n.replaceSource(r,'=""'),cursor:e=>new g(v(e.ast,t).value.start+1)})},onInput:({node:e,path:t,code:n,cursor:r},s)=>m.isStringLiteral(e.value)&&r.equals(e.value)&&{code:n.replaceSource(r,`{${s}}`),cursor:new g(e.value.start+1+s.length)}},JSXExpressionContainer:{hasSlot:(e,t)=>e.start==t||e.end==t},JSXEmptyExpression:{hasSlot:(e,t)=>e.start==t}}},V={ArrayPattern:{hasSlot:(e,t)=>0==e.elements.length&&t==e.start+1,actions:e=>G(e,"elements",m.identifier("a"))}},q=(e,t)=>!e.alternate&&e.consequent.end==t,Y=(e,t,n)=>e.alternate&&t==e.consequent.end+n.slice(e.consequent.end,e.alternate.start).indexOf("else")+"else".length,Q=(e,t)=>(m.isIfStatement(e)||m.isFor(e)||m.isDeclaration(e))&&t==e.start,ee={Program:{actions:({code:e,cursor:t})=>[["[]","{}","''",'""'].map((n=>({on:{key:n[0]},do:()=>({code:e.replaceSource(t,`(${n})`)})}))),{on:{key:">"},do:()=>({code:e.replaceSource(t,"(() => null)")})},{on:{key:"<"},do:()=>({code:e.replaceSource(t,"<></>")})}]},VariableDeclaration:{hasSlot(e,t){const n=O(e);return!!n.includes(t)&&n},actions:({node:e,code:t,cursor:n})=>O(e).equals(n)?["const","let","var"].filter((t=>e.kind!=t)).map((n=>({info:{type:"CHANGE_DECLARATION_KIND",kind:n},on:{code:"Key"+n[0].toUpperCase()},do:()=>({code:t.replaceSource(new g(e.start,e.start+e.kind.length),n),cursor:({ast:e},{start:t})=>O(E(e,t))})}))):null},VariableDeclarator:{actions:({node:e,path:t,code:n,cursor:r})=>!e.init&&r.start==e.id.end&&{on:[{code:"Space"},{key:"="}],do:()=>({code:n.replaceSource(new g(e.end),"= null"),cursor:({ast:e})=>j(e,[...t,"init"])})}},BlockStatement:{hasSlot:(e,t)=>0==e.body.length&&e.start+1==t},IfStatement:{hasSlot:(e,t,{source:n})=>Boolean(q(e,t)||Y(e,t,n)),actions:({node:e,path:t,cursor:n,code:r})=>[q(e,n.start)&&[{info:{type:"ADD_ELSE"},on:{code:"KeyE"},do:()=>({code:r.replaceSource(new g(e.end),"else {}"),cursor:({ast:e})=>new g(v(e,[...t,"alternate"]).start-1)})},{info:{type:"ADD_ELSE_IF"},on:{code:"KeyI"},do:()=>({code:r.replaceSource(new g(e.end),"else if (null) {}"),cursor:({ast:e})=>j(e,[...t,"alternate","test"])})}],Y(e,n.start,r.source)&&{info:{type:"CHANGE_ELSE_TO_ELSE_IF"},on:{code:"KeyI"},do:()=>({code:r.replaceSource(n," if (t)"),cursor:({ast:e})=>b(v(e,[...t,"alternate","test"]))})}]},ForStatement:{hasSlot:(e,t)=>{const n=e.init?e.init.end:e.start+5,r=e.test?e.test.end:n+(e.init?2:1),s=e.update?e.update.end:r+(e.test?2:1);return!e.init&&t==n||!e.test&&t==r||!e.update&&t==s}},ForOfStatement:{actions:({node:e,path:t,code:n})=>({info:{type:"CONVERT",to:"ForStatement"},on:{code:"KeyO"},do:()=>({code:n.mutateAST((n=>{const r=m.identifier("i");v(n,t.slice(0,-1))[t[t.length-1]]=m.forStatement(m.variableDeclaration("let",[m.variableDeclarator(r,m.numericLiteral(0))]),m.binaryExpression("<",r,m.memberExpression(e.right,m.identifier("length"))),m.updateExpression("++",r),m.blockStatement([m.variableDeclaration("const",[m.variableDeclarator(e.left.declarations[0].id,m.memberExpression(e.right,r,!0))]),...e.body.body]))}))})})},FunctionDeclaration:Z.FunctionExpression,ReturnStatement:{hasSlot:(e,t)=>!e.argument&&e.end-1==t}},te={...Z,...ee,...V},ne=(e,t,n)=>{const r=te[e.type];if(r&&"hasSlot"in r&&r.hasSlot){const s=r.hasSlot(e,t,n);if(s)return s instanceof g?s:new g(t)}for(const[s,o]of[[m.isExpression,X],[m.isStatement,Q]])if(s(e)){const r=o(e,t,n);if(r)return r instanceof g?r:new g(t)}return null},re=(e,t)=>S(e.ast,t.start).reverse().map((([n,r])=>{const s=te[n.type];return{node:n,actions:[...s&&s.actions?B(s.actions({node:n,path:r,code:e,cursor:t})):[],...m.isExpression(n)&&z?B(z({node:n,path:r,code:e,cursor:t})):[]].filter((e=>!!e))}})).filter((e=>e&&e.node&&e.actions.length>0));function se(e,t,n){const{ast:r,source:s}=e,{isLeft:o,isRight:c}={isLeft:"LEFT"===t,isRight:"RIGHT"===t},i=n+(o?-1:c?1:0);if(r.start>i)return new g(r.start);if(r.end<i)return new g(r.end);if("\n"==s[i-1]&&"\n"==s[i])return new g(i);for(const a of w(r,i).reverse()){if(Array.isArray(a))continue;const t=ne(a,i,e);if(t)return t}if(!t||"UP"==t||"DOWN"==t){const r=se(e,"LEFT",n),o=se(e,"RIGHT",n),c=s.slice(r.end,n).includes("\n"),i=s.slice(n,o.start).includes("\n");return("UP"===t&&i||!c)&&("DOWN"!==t&&i||n-r.end<o.start-n)?r:o}return se(e,t,i)}function oe(e,t,n){const r="UP"==n,s=e.split("\n").map(((e,t)=>e.length+(0==t?0:1))),o=s.reduce(((e,t)=>[...e,(e[e.length-1]||0)+t]),[]),c=o.findIndex((e=>e>=t)),i=c+(r?-1:1);return-1==c?e.length:i<0?0:t-(o[c-1]||0)>s[i]?o[i]:t+(r?-s[i]+(0==i?-1:0):s[c]+(0==c?1:0))}const ce=(e,t,n)=>se(e,t,t&&"LEFT"!=t&&"RIGHT"!=t?oe(e.source,n,t):n);function ie(e,t,n){return L(e)?function(e,{start:t,end:n},r){let s=null;return t!=n&&("LEFT"==r?s=new g(t):"RIGHT"==r&&(s=new g(n))),s||(s=ce(e,r,("DOWN"==r?Math.max:Math.min)(t,n))),s}(e,t,n):function(e,{start:t},n){if(!n)return new g(t);const r=(()=>{switch(n){case"LEFT":return t-1;case"RIGHT":return t+1;case"UP":case"DOWN":return oe(e,t,n)}})();return new g(Math.max(Math.min(r,e.length),0))}(e.source,t,n)}var ae=n(387),le=n(15),de=n(170);function ue(e){console.error(e),le.a(e)}ae.a({dsn:"https://2c3ec152a48344829f1aac2c608affe6@o492889.ingest.sentry.io/5561026",autoSessionTracking:!0,integrations:[new de.a.BrowserTracing]});const he=navigator.platform.startsWith("Mac");const pe=[{name:"if",create:e=>`if (someCondition) { ${e} }`,getInitialCursor:(e,t)=>y(e,[...t,"test"]),canWrapStatement:!0},{name:"for",label:"for...of",create:e=>`for (const item of iterable) { ${e} }`,getInitialCursor:(e,t)=>y(e,[...t,"left","declarations","0","id"]),canWrapStatement:!0},{name:"function",create:()=>"function fn() {}",getInitialCursor:(e,t)=>j(e,[...t,"id"]),hidden:!0,canWrapStatement:!0},{name:"return",create:()=>"return null;",getInitialCursor:(e,t)=>j(e,[...t,"argument"]),hidden:!0,canWrapStatement:!1},...["const","let","var"].map((e=>({name:e,create:t=>p()(m.variableDeclaration(e,[m.variableDeclarator(m.identifier("n"),t||("const"==e?m.nullLiteral():null))])).code,getInitialCursor:(e,t)=>y(e,[...t,"declarations","0","id"]),canWrapStatement:!1})))],me=[...[["ArrowLeft","LEFT"],["ArrowRight","RIGHT"],["ArrowUp","UP"],["ArrowDown","DOWN"]].map((([e,t])=>({on:{key:e,shiftKey:!1,altKey:!1},do:(e,n)=>({cursor:ie(e,n,t)})}))),...pe.map((({name:e,create:t,getInitialCursor:n})=>({if:({source:t},{start:n})=>t.slice(n-e.length,n)==e&&"\n"==t[n+1],on:{code:"Space"},do:(r,{start:s})=>({code:r.replaceSource(new g(s-e.length,s),t("")),cursor:(e,t)=>L(e)?n(e.ast,S(e.ast,s).pop()[1]):t})}))),{on:{code:"Space"},do:(e,t)=>({code:e.replaceSource(t," "),cursor:new g(t.start+1),skipFormatting:!0})},{on:{code:"Enter"},do(e,{start:t}){let n=0;if(function(e,t){const n=e.slice(0,t+1).split("").reverse().findIndex((e=>"\n"==e));return!e.slice(t-(n||t),t).trim()}(e.source,t))n=t;else{const r=e.source.split("\n").map(((e,t)=>e.length+(0==t?0:1))).reduce(((e,t)=>[...e,(e[e.length-1]||0)+t]),[]),s=r.findIndex((e=>e>=t));n=-1==s?0:r[s]}return{code:e.replaceSource(new g(n),"\n"),cursor:new g(0==n?0:n+1),skipFormatting:!0}}},{on:{code:"Backspace"},do:({source:e},{start:t,end:n})=>({code:R(e.slice(0,t===n?t-1:t)+e.slice(n)),cursor:ie(R(e.slice(0,t===n?t-1:t)+e.slice(n)),new g(t,n),"LEFT")})},{on:{code:"Delete"},do:({source:e},{start:t,end:n})=>({code:R(e.slice(0,t)+e.slice(t===n?n+1:n))})},{on:{code:"KeyZ",...he?{metaKey:!0}:{ctrlKey:!0}},do:()=>({history:"UNDO"})},{on:{code:"KeyZ",shiftKey:!0,...he?{metaKey:!0}:{ctrlKey:!0}},do:()=>({history:"REDO"})},{on:{code:"KeyA",...he?{metaKey:!0}:{ctrlKey:!0}},do:({source:e})=>({cursor:new g(0,e.length)})},...[["UP","ArrowUp"],["DOWN","ArrowDown"],["LEFT","ArrowLeft"],["RIGHT","ArrowRight"]].map((([e,t])=>({if:e=>L(e),info:{type:"RANGE_SELECT",direction:e},on:{code:t,shiftKey:!0,altKey:!1},do:()=>({rangeSelect:e})}))),{if:e=>L(e),info:{type:"STRETCH"},on:{code:"ArrowUp",altKey:!0},do:(e,t)=>{if(!L(e))return;const n=S(e.ast,t.start).reverse(),r=n.findIndex((([e])=>e.start<=t.start&&e.end>=t.end));if(-1==r)return void ue(new Error("Assertion: there should always be a selected node"));const[s]=n[r],o=[m.isExpression,m.isStatement].find((e=>e(s)));if(!o)return;const c=n.slice(r+1).find((([e])=>o(e)&&e.start<=s.start&&e.end>=s.end));if(!c)return;const[i,a]=c;return{code:e.replaceSource(b(i),e.source.slice(s.start,s.end)),cursor:(e,t)=>L(e)?j(e.ast,a):(ue(new Error("Assertion: move out should always generate valid code")),t)}}}],fe=(e,t)=>me.filter((n=>!n.if||n.if(e,t))),ge=e=>{const t={};for(const n of e){if(!n.info)continue;const{type:e}=n.info;t[e]||(t[e]=[]),t[e].push(n)}return t},be=(e,t)=>({base:ge(fe(e,t)),nodes:L(e)?re(e,t).map((({node:e,actions:t})=>({node:e,actions:ge(t)}))):[]}),je=(e,t)=>e&&(Array.isArray(e)?e:[e]).some((e=>("code"in e?e.code===t.code:e.key===t.key)&&f.every((n=>!e||!(n in e)||e[n]==t[n]))));function xe(e,t,n){const r=L(e)&&function(e,t,n){for(const[r,s]of S(e.ast,t.start).reverse()){const o=te[r.type],c=o&&"onInput"in o&&o.onInput({node:r,path:s,code:e,cursor:t},n);if(c)return c}return null}(e,t,n);if(r)return r;const{source:s}=e,{start:o,end:c}=t,i=s.slice(0,o)+n+s.slice(c),a=o+n.length;return{code:R(i),cursor:new g(a)}}var ye=n(169);const Oe=d.a.div`
  border-radius: ${({theme:e})=>e.borderRadius} 0 0
    ${({theme:e})=>e.borderRadius};
  border: 2px solid ${({theme:e})=>e.c.cardBg};
  border-right: none;
  display: flex;
  flex-direction: row;
  background: white;
  overflow: hidden;
  min-height: 300px;

  .codeflask {
    position: relative;
    width: initial;
    height: initial;

    background: ${({theme:e})=>"light"==e.kind?e.c.cardBg:e.c.bg};

    &.codeflask--has-line-numbers:before,
    & .codeflask__lines {
      background: ${({theme:e})=>e.c.cardBg};
    }

    & textarea {
      position: static;
      width: auto;
      height: 100% !important;
      color: transparent;
      caret-color: ${({theme:e})=>e.c.text};
    }

    & pre {
      position: absolute;
    }

    & .keyword {
      font-weight: bold;
    }

    ${({theme:e})=>"dark"==e.kind&&`\n      color: ${e.c.text};\n  \n      & .token {\n        filter: brightness(200%);\n      }\n    `}
  }
`;function Se(e,t,n){Object(o.useEffect)((()=>{if(e)return e.addEventListener(t,n),()=>{e.removeEventListener(t,n)}}),[e,t,n])}function we({editorState:{code:e,cursor:{start:t,end:n},formattedForPrintWidth:s},cols:c,disabled:i,onKeyDown:a,onClick:l,onCut:d,onPaste:u}){const h=Object(o.useRef)(null),[p,m]=Object(o.useState)(null),f=Object(o.useCallback)((()=>{if(!p)return;const e=p.elTextarea;e.selectionStart=t,e.selectionEnd=n||t,e.blur(),e.focus(),e.style.height="auto",e.style.height=e.scrollHeight+"px"}),[p,t,n]);return Object(o.useEffect)((()=>{h.current&&m(new ye.a(h.current,{language:"js",handleTabs:!1,lineNumbers:!0}))}),[h]),Object(o.useEffect)((()=>{!p||L(e)&&null===s||(p.updateCode(e.source),f())}),[p,e,s,f]),Object(o.useEffect)((()=>{f()}),[f]),Object(o.useEffect)((()=>{p&&(p.elTextarea.cols=c)}),[p,c]),Object(o.useEffect)((()=>{p&&(i?p.enableReadonlyMode():p.disableReadonlyMode())}),[i,p]),Se(null===p||void 0===p?void 0:p.elTextarea,"keydown",a),Se(null===p||void 0===p?void 0:p.elTextarea,"click",l),Se(null===p||void 0===p?void 0:p.elTextarea,"cut",d),Se(null===p||void 0===p?void 0:p.elTextarea,"paste",u),Object(r.jsx)(Oe,{ref:h})}var Ee=n(99);function ve(e,t,n,r,s){if("number"!=typeof t[t.length-1])return;const o=v(e,t.slice(0,-1));if(!Array.isArray(o))return;const[c,i,a]=[r||n,new g(n.start),new g(n.end)].map((e=>((e,{start:t,end:n})=>e.findIndex((e=>e.start<=t&&e.end>=n)))(o,e))),l=o.length-1;let d,u;s?i==c?(d=i,u=Math.min(a+1,l)):(d=Math.min(i+1,l),u=a):a==c?(d=Math.max(i-1,0),u=a):(d=i,u=a-1);const h=new g(o[d].start,o[u].end);return h.equals(n)?void 0:h}function ke(){const[e,t]=Object(o.useState)(null);return function(n,r,s){if(!L(n))return e||r;const{ast:o}=n;if(e&&!r.isSingle()||t(r),"UP"==s)return function(e,t){for(const n of w(e,t.start).reverse()){const e=b(n);if(t.start>e.start||t.end<e.end)return e}return t}(o,r);if("DOWN"==s)return function(e,t,n){let r=!1;if(!n||t.isSingle())return t;for(const s of w(e,n.start)){const e=b(s),n=t.start==e.start&&t.end==e.end;if(!n&&r)return e;r=n}return n}(o,r,e);const c=E(o,r.start),i="RIGHT"==s,a=ce(n,s,(i?Math.max:Math.min)(r.start,r.end)),l=E(o,a.start);if(c==l&&(m.isLiteral(l)||m.isIdentifier(l))&&l.start<=a.start&&l.end>=a.end)return new g(Math.min(r.start,a.start),Math.max(r.end,a.end));const d=S(o,r.start).reverse();for(const[,t]of d){const n=ve(o,t,r,e,i);if(n)return n}return r}}const Ie=Ee.format||(new Ee).format;function Ae(e,t=80){const[[n,r],s]=Object(o.useState)((()=>[0,[{code:R(e),cursor:new g(0),formattedForPrintWidth:null}]])),c=r[n],[i,a]=Object(o.useState)([]),l=ke();return Object(o.useEffect)((()=>{const{code:e,cursor:o,formattedForPrintWidth:i}=c;if(!L(e)||i==t)return;Ie({code:e.source,cursorOffset:o.start,printWidth:t}).then((o=>{if(!o)return void ue(new Error("error while formatting, uck!"));const c=r.slice(),i=R(o.formatted);c[n]={code:i.source===e.source?e:i,cursor:new g(Math.max(o.cursorOffset,0)),formattedForPrintWidth:t},s([n,c])})).catch((e=>ue(e)))}),[c,n,r,t]),Object(o.useEffect)((()=>{if(0==i.length||L(c.code)&&c.formattedForPrintWidth!=t)return;const e=i[0];a(i.slice(1));const{code:o,cursor:d}=c;let u,h;if(e instanceof KeyboardEvent){const t=e;u=function(e,t,n){if(L(e)){const r=re(e,t).map((({actions:e})=>e)).flat().find((e=>je(e.on,n)));if(r)return r.do}for(const r of fe(e,t))if((!r.if||r.if(e,t))&&je(r.on,n))return r.do}(o,d,t),!u&&t.key.length<=2&&(u=()=>xe(o,d,t.key))}else u=e;try{h=u&&u(o,d)}catch(m){ue(m)}if(!h)return;if("history"in h){const e=e=>o.source!==e.code.source;if("UNDO"==h.history){const t=n+1,o=r.slice(t).findIndex(e);-1!=o&&s([t+o,r])}else if("REDO"==h.history){const t=n-1,o=r.slice(0,Math.max(t,0)).reverse().findIndex(e);-1!=o&&s([t-o,r])}return}if("cursor"in h&&"function"==typeof h.cursor){const e=h.cursor;try{a((t=>[(t,n)=>({cursor:e(t,n)}),...t]))}catch(m){ue(m)}}const p={...c,..."code"in h&&{code:h.code},..."cursor"in h&&"function"!==typeof h.cursor&&{cursor:h.cursor},..."rangeSelect"in h&&{cursor:l(c.code,c.cursor,h.rangeSelect)},formattedForPrintWidth:!("code"in h)||h.code.source===c.code.source||"skipFormatting"in h&&h.skipFormatting?c.formattedForPrintWidth:null};s([n,[p,...r.slice(n)]])}),[r,n,c,i,t,l]),[c,e=>a((t=>t.concat(e)))]}const Ce={kind:"light",l:{gap:"5px",space:"10px",abyss:"15px"},c:{text:"hsl(0, 0%, 5%)",softText:"hsla(0, 0%, 10%)",bg:"hsl(0, 0%, 95%)",cardBg:"white",visitedLink:"initial"},borderRadius:"10px"},Te={...Ce,kind:"dark",c:{...Ce.c,text:"hsl(0, 0%, 85%)",softText:"hsla(0, 0%, 70%)",bg:"hsl(0, 0%, 5%)",cardBg:"#2d2d2d",visitedLink:"lightblue"}},Le=e=>l.b`
  width: ${e};
  height: ${e};
  display: inline-block;
`,Re=d.a.div`
  ${({theme:e})=>Le(e.l.gap)}
`,De=d.a.div`
  ${({theme:e})=>Le(e.l.space)}
`,$e=d.a.div`
  ${({theme:e})=>Le(e.l.abyss)}
`,Fe=l.b`
  font-family: "Roboto Mono", monospace;
`,Ne=d.a.div`
  display: inline-block;
  border: 1px solid grey;
  padding: 0 ${({theme:e})=>e.l.gap};
  height: 22px;
  font-weight: normal;
  font-size: 15px;
  ${Fe};
`,Me={ArrowUp:"\u2191",ArrowDown:"\u2193",ArrowLeft:"\u2190",ArrowRight:"\u2192",shiftKey:"\u21e7",altKey:he?"\u2325":"Alt",Enter:"\u21b5"},Pe=({value:e})=>Object(r.jsx)(Ne,{title:e,children:Me[e]||(e.startsWith("Key")?e.slice(3).toLowerCase():e)});function We(e){return e.toLowerCase().split("_").map((e=>e[0].toUpperCase()+e.slice(1))).join(" ")}const _e=d.a.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`,Ke=d.a.button`
  border: none;
  padding: 0;

  background: none;
  color: ${({theme:e})=>e.c.text};
  cursor: pointer;
`,Ge=d.a.span`
  text-decoration: underline;
  font-size: ${e=>e.small?11:13.33}px;
`,Be=({children:e,small:t,...n})=>Object(r.jsx)(Ke,{...n,children:Object(r.jsx)(Ge,{children:e,small:t})}),Ue=e=>{switch(e.type){case"RANGE_SELECT":return{UP:"Surrounding",DOWN:"inner",LEFT:"Previous",RIGHT:"Next"}[e.direction];case"MOVE_ELEMENT":return We(e.direction);case"CHANGE_OPERATION":return{UP:"Surrounding",DOWN:"inner",LEFT:"Previous",RIGHT:"Next"}[e.operator]||e.operator;case"WRAP":return We(e.wrapper);case"CHANGE_DECLARATION_KIND":return e.kind;case"ADD_ELSE":return Object(r.jsxs)(r.Fragment,{children:["Add ",Object(r.jsxs)("code",{children:["else ","{}"]})]});case"ADD_ELSE_IF":return Object(r.jsxs)(r.Fragment,{children:["Add ",Object(r.jsxs)("code",{children:["else if (t) ","{}"]})]});case"CHANGE_ELSE_TO_ELSE_IF":return Object(r.jsxs)(r.Fragment,{children:["Change ",Object(r.jsx)("code",{children:"else"})," to ",Object(r.jsx)("code",{children:"else if"})]});default:{const{type:t,...n}=e;return We(t)+(Object.keys(n).length?` (${JSON.stringify(n)})`:"")}}},Je=d.a.li`
  margin-bottom: ${({theme:e})=>e.l.gap};
  display: flex;
  align-items: center;
`,He=Object(d.a)(_e)`
  margin-bottom: ${({theme:e})=>e.l.space};
`,Xe=d.a.span`
  margin-bottom: ${({theme:e})=>e.l.gap};
  display: flex;
  justify-content: space-between;
  align-items: center;
`,ze=d.a.div`
  ${({single:e,theme:t})=>e?`margin-bottom: ${t.l.gap};`:""};

  width: 100%;

  display: flex;
  justify-content: space-between;
  align-items: center;

  ${Fe};
`,Ze=({info:e,on:t,hideModifiers:n,single:s,toggleItem:o,...c})=>Object(r.jsxs)(ze,{single:s,children:[Object(r.jsxs)("div",{children:[Object(r.jsx)(Ke,{...c,children:Object(r.jsx)(Ge,{children:Ue(e)})}),Object(r.jsx)(Re,{}),s&&Object(r.jsx)(Be,{small:!0,onClick:()=>o(e.type),children:"\u2573"})]}),Object(r.jsx)(Ke,{...c,children:t&&(Array.isArray(t)?t:[t]).map(((e,t)=>Object(r.jsx)(Pe,{value:"key"in e?e.key:e.code},t)))})]}),Ve=({actions:e,onAction:t,hiddenItems:n,toggleItem:s})=>Object(r.jsx)(r.Fragment,{children:Object.entries(e).map((([e,c],i)=>{if(n.has(e))return null;if(1==c.length&&1==Object.keys(c[0].info).length)return Object(r.jsx)(Ze,{...c[0],single:!0,toggleItem:s},i);const a=c.reduce(((e,t)=>e.filter((e=>t.on&&(Array.isArray(t.on)?t.on:[t.on]).every((t=>t[e]))))),f);return Object(r.jsxs)(o.Fragment,{children:[Object(r.jsxs)(Xe,{children:[Object(r.jsxs)("div",{children:[We(e),Object(r.jsx)(De,{}),Object(r.jsx)(Be,{small:!0,onClick:()=>s(e),children:"\u2573"})]}),Object(r.jsx)("div",{style:{cursor:"default"},children:a.map((e=>Object(r.jsxs)(o.Fragment,{children:[Object(r.jsx)("span",{style:{padding:"0 5px"},children:"+"}),Object(r.jsx)(Pe,{value:e})]},e)))})]}),Object(r.jsx)(He,{children:c.map(((e,n)=>Object(r.jsxs)(Je,{children:[Object(r.jsx)("span",{style:{paddingRight:5},children:"-"}),Object(r.jsx)(Ze,{...e,toggleItem:()=>null,hideModifiers:a,onClick:()=>t(e)})]},n)))})]},i)}))}),qe="DEBUG_BOX",Ye=e=>Array.isArray(e)?e.map(Ye):"object"==typeof e&&null!==e?Object.entries(e).filter((([e])=>"loc"!=e)).map((([e,t])=>[e,Ye(t)])).reduce(((e,[t,n])=>(e[t]=n,e)),{}):e,Qe=d.a.div`
  margin-bottom: ${({theme:e})=>e.l.space};
  display: flex;
  justify-content: space-between;
`,et=({ast:e})=>Object(r.jsx)(Ke,{onClick:()=>{console.log(JSON.stringify(Ye(e),null,2))},children:Object(r.jsx)(Ge,{children:"Log AST"})});function tt({code:e,cursor:t,hiddenItems:n,toggleItem:s}){return n.has(qe)?null:Object(r.jsxs)(Qe,{children:[L(e)&&Object(r.jsx)(et,{ast:e.ast}),Object(r.jsxs)("div",{style:{whiteSpace:"nowrap"},children:["Cursor: ",Object(r.jsx)("em",{children:t.toString()})]}),Object(r.jsx)(Be,{small:!0,onClick:()=>{s(qe)},children:"\u2573"})]})}const nt=l.c`
  0%, 100% {
    transform: scale(1);
  }

  50% {
    transform:scale(1.5);
  }
`,rt=Object(d.a)(Be)`
  animation: ${nt} 300ms ease-in-out infinite;
  animation-play-state: ${({play:e})=>e?"running":"paused"};
`;function st({hiddenItems:e,toggleItem:t}){const[n,s]=Object(o.useState)(!1),[c,i]=Object(o.useState)(!1);Object(o.useEffect)((()=>{i(!0)}),[e]);const a=e.size;return 0==a?null:Object(r.jsxs)("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",marginBottom:10},onAnimationIteration:()=>i(!1),children:[Object(r.jsx)(rt,{onClick:()=>s(!n),style:{width:"fit-content"},play:c,children:"..."}),n&&Object(r.jsxs)(r.Fragment,{children:[a," item",a>1&&"s"," hidden:",Object(r.jsx)(_e,{children:Array.from(e).reverse().map((e=>Object(r.jsx)("li",{children:Object(r.jsx)(Be,{onClick:()=>{1==a&&s(!1),t(e)},children:We(e)})},e)))})]})]})}const ot=d.a.div`
  border: 1px solid transparent;
  border-radius: 0 ${({theme:e})=>e.borderRadius}
    ${({theme:e})=>e.borderRadius} 0;
  border-left: none;
  padding: ${({theme:e})=>e.l.abyss} 20px;
  min-width: 300px;
  box-sizing: border-box;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  ${Fe};
  font-size: 13.333px;
  background: ${({theme:e})=>e.c.cardBg};
  overflow: auto;
`,ct=d.a.li`
  margin-bottom: ${({theme:e})=>e.l.abyss};
`,it=d.a.div`
  margin-bottom: ${({theme:e})=>e.l.gap};
  width: 100%;
  display: flex;
  justify-content: center;
  font-size: 15px;
`;function at({editorState:{code:e,cursor:t,formattedForPrintWidth:n},runtimeError:s,onAction:c}){const[i,a]=function(e,t){const[n,r]=Object(o.useState)((()=>{const n=localStorage.getItem(e);return new Set(n?JSON.parse(n):t)}));return[n,function(t){const s=new Set(n);n.has(t)?s.delete(t):s.add(t),r(s),localStorage.setItem(e,JSON.stringify(Array.from(s)))}]}("hiddenItems",[qe]),[l,d]=Object(o.useState)((()=>be(e,t)));return Object(o.useEffect)((()=>{L(e)&&null===n||d(be(e,t))}),[e,t,n]),Object(r.jsxs)(ot,{children:[Object(r.jsx)(st,{hiddenItems:i,toggleItem:a}),s&&Object(r.jsxs)("div",{style:{color:"red"},children:[Object(r.jsx)("br",{}),s.stack.split("\n").slice(0,2).join("\n"),Object(r.jsx)(Re,{})]}),e instanceof C&&Object(r.jsx)("div",{style:{color:"red"},children:e.error.message}),Object(r.jsx)(tt,{code:e,cursor:t,hiddenItems:i,toggleItem:a}),Object(r.jsx)(Ve,{actions:l.base,onAction:c,hiddenItems:i,toggleItem:a}),Object(r.jsx)(_e,{children:l.nodes.map((({node:e,actions:t},n)=>0==Object.keys(t).length?Object(r.jsx)(it,{children:"..."},n):Object(r.jsxs)(ct,{children:[Object(r.jsx)(it,{children:e.type}),Object(r.jsx)(Ve,{actions:t,onAction:c,hiddenItems:i,toggleItem:a})]},n)))})]})}const lt=d.a.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  ${Fe};
`,dt=d.a.div`
  border-top: 1px solid ${({theme:e})=>e.c.cardBg};
  border-bottom: 1px solid ${({theme:e})=>e.c.cardBg};
  border-left: 3px dashed ${({theme:e})=>e.c.cardBg};
  background: ${({theme:e})=>e.c.bg};
  cursor: col-resize;
  user-select: none;
`,ut=({initialSource:e,runtimeError:t,onChange:n},s)=>{const[c,i]=Object(o.useState)(80),[a,d]=Object(o.useState)(null),[u,h]=Ae(e,c);return Object(o.useImperativeHandle)(s,(()=>({setSource(e){h((()=>({code:R(e)})))}}))),Object(o.useEffect)((()=>{n(u.code.source)}),[n,u.code]),Object(o.useEffect)((()=>{if(null==a)return;const e=e=>{const t=Math.round((e.clientX-a)/2.9);0!=t&&(d(e.clientX),i(Math.max(20,c+t)))},t=()=>d(null);return document.addEventListener("mousemove",e),document.addEventListener("mouseup",t),()=>{document.removeEventListener("mousemove",e),document.removeEventListener("mouseup",t)}}),[c,a]),Object(r.jsxs)(lt,{children:[Object(r.jsx)(l.a,{styles:l.b`
          ::selection {
            background: yellow;
          }
        `}),Object(r.jsx)(we,{editorState:u,cols:c,onKeyDown:e=>{(he?e.metaKey:e.ctrlKey)&&["c","v","r","t","w","l"].some((t=>e.code==`Key${t.toUpperCase()}`))||(e.preventDefault(),h(e))},onCut:e=>{e.preventDefault(),h((({source:t},{start:n,end:r})=>{if(n!==r)return e.clipboardData.setData("text/plain",t.substr(n,r-n)),{code:R(t.substr(0,n)+t.substr(r)),cursor:new g(n)}}))},onPaste:e=>{e.preventDefault();const t=e.clipboardData.getData("text/plain");h((({source:e},{start:n,end:r})=>({code:R(e.slice(0,n)+t+e.slice(r)),cursor:()=>new g(n+t.length)})))},onClick:e=>{const t=e.target;h((e=>({cursor:ie(e,new g(t.selectionStart,t.selectionEnd),null)})))}}),Object(r.jsx)(dt,{title:c.toString(),onMouseDown:e=>d(e.clientX)}),Object(r.jsx)(at,{editorState:u,runtimeError:t,onAction:e=>{h(((t,n)=>e.do(t,n)))}})]})},ht=c.a.forwardRef(ut),pt={id:"js",label:"JS Console",docsURL:"https://developer.mozilla.org/en-US/docs/Web/JavaScript",example:'\nfunction greet(who) {\n  return `Hello ${who}!`;\n}\n\nconsole.log(greet("World"));\n',run(e,t){e.textContent="";const n=document.createElement("iframe");Object.assign(n.style,{display:"none"}),e.appendChild(n);const r=document.createElement("div");r.classList.add("console-log"),e.appendChild(r);const s=document.createElement("code");s.textContent="console.log(value)";let o=document.createElement("em");o.append("Nothing has been logged yet. Use ",s," to see your logs here."),r.appendChild(o),n.contentWindow.console.log=(...e)=>{o&&(o.remove(),o=null);const t=document.createElement("div");t.textContent=e.map((e=>e.toString())).join(" "),r.appendChild(t)},n.contentWindow.eval(t)},cleanUp(e){e.innerText=""}},mt={id:"p5",label:"p5.js",docsURL:"https://p5js.org/get-started/",example:"\nconst TOTAL = 10;\nconst WEIGHT = 3;\n\nfunction setup() {\n  createCanvas(300, 300);\n  fill(0, 0);\n}\n\nfunction draw() {\n  const now = performance.now() / 100;\n\n  clear();\n  stroke(0);\n  strokeWeight(WEIGHT);\n\n  for (let i = 0; i < TOTAL; i++) {\n    let n = 1 - i / TOTAL;\n    let radius = width - ((now * i) % width) - WEIGHT;\n    circle(width / 2, height / 2, radius);\n  }\n}",run(e,t){e.textContent="";const n=document.createElement("iframe");Object.assign(n.style,{width:"100%","min-height":"300px",border:"none"}),e.appendChild(n),n.contentWindow.eval(t);const r=document.createElement("script");r.src="https://cdn.jsdelivr.net/npm/p5@1.1.9/lib/p5.min.js";const{body:s}=n.contentDocument;Object.assign(s.style,{margin:0,display:"flex","justify-content":"center"}),s.appendChild(r)},cleanUp(e){e.innerText=""}};var ft=n(69);class gt extends c.a.Component{constructor(...e){super(...e),this.state={errorAtIteration:-1}}componentDidCatch(){this.setState({errorAtIteration:this.props.iteration})}render(){const{children:e,iteration:t}=this.props;return this.state.errorAtIteration==t?Object(r.jsx)("h1",{children:"Something went wrong."}):e}}const bt={id:"react",label:"React",docsURL:"https://reactjs.org/docs",example:'function App() {\n  const [value, setValue] = useState("");\n  const [items, setItems] = useState(\n    ["Delete actions"].map((text) => ({\n      text,\n      checked: false,\n    })),\n  );\n\n  return (\n    <div>\n      <input\n        type="text"\n        placeholder="Search/enter new item"\n        value={value}\n        onChange={(e) => setValue(e.target.value)}\n        onKeyDown={(e) => {\n          if (e.key === "Enter") {\n            setValue("");\n            setItems(items.concat({ text: value }));\n          }\n        }}\n        style={{ marginBottom: 10 }}\n      />\n      <ul>\n        {items\n          .filter((i) => i.text.includes(value))\n          .map((item, i) => (\n            <li\n              key={i}\n              style={{\n                textDecoration: item.checked ? "line-through" : undefined,\n                cursor: "pointer",\n              }}\n              onClick={() => {\n                const newItems = items.slice();\n                newItems[i] = {\n                  ...item,\n                  checked: !item.checked,\n                };\n\n                setItems(newItems);\n              }}\n            >\n              {item.text}\n            </li>\n          ))}\n      </ul>\n    </div>\n  );\n}\n',run(e,t,n,s){const o=ft.transform(t,{plugins:[ft.availablePlugins["syntax-jsx"],ft.availablePlugins["transform-react-jsx"]]});try{const t=new Function("React",`{${Object.keys(c.a).join(", ")}}`,o.code+"return typeof App == 'undefined' ? null : App;")(c.a,c.a)||(()=>Object(r.jsxs)("p",{children:["Declare a component named ",Object(r.jsx)("code",{children:"App"})," to see results. For example:",Object(r.jsx)("pre",{children:Object(r.jsxs)("code",{children:["function App() ","{\n","  ","return ","<h1>Hello World</h1>",";","\n}"]})})]}));a.a.render(Object(r.jsx)(gt,{iteration:s,children:Object(r.jsx)(t,{})}),e)}catch(i){n(i)}},cleanUp(e){a.a.unmountComponentAtNode(e)}},jt=d.a.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`,xt=d.a.section`
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  padding: 20px;
  max-width: 600px;
  width: 100%;
  background: ${({theme:e})=>e.c.cardBg};
  font-family: "Open Sans", sans-serif;
`,yt=d.a.div`
  max-height: 100vh;
`,Ot=d.a.span`
  font-weight: bold;
  ${Fe};
`,St=d.a.h3`
  margin-top: 0;
`,wt=()=>Object(r.jsxs)(xt,{children:[Object(r.jsx)(St,{children:"What is this?"}),Object(r.jsx)("p",{children:"Tofu is an exploration in fluid code editing. It manages syntax and code style for you. Thus keypresses are wholly reserved for meaningful actions:"}),Object(r.jsxs)("ul",{children:[Object(r.jsx)("li",{children:"Cursor keys only take you to places where you can make meaningful edits."}),Object(r.jsxs)("li",{children:["Switching between ",Object(r.jsx)(Ot,{children:"const"}),"/",Object(r.jsx)(Ot,{children:"let"})," ","declaration requires only a single keypress."]}),Object(r.jsxs)("li",{children:["Putting a space after ",Object(r.jsx)(Ot,{children:"if"})," always creates a complete if-statement (that being the only syntactically valid option since"," ",Object(r.jsx)(Ot,{children:"if"})," can't be used as an identifier). Other keywords behave similarly."]}),Object(r.jsxs)("li",{children:[Object(r.jsx)(Pe,{value:"Enter"})," always creates a new line underneath. Compare that to other editors, where Enter either breaks syntax or code style (unless you're already at the start/end of a line)."]})]})]}),Et=d.a.button`
  border: 2px solid #dddddd;
  margin-right: ${({theme:e})=>e.l.abyss};
  padding: ${({theme:e})=>e.l.space};
  display: flex;
  align-items: center;
  font-weight: bold;
  cursor: pointer;
  background: ${({theme:e})=>"light"==e.kind?e.c.cardBg:e.c.bg};

  ${e=>e.isActive&&"border-color: "+e.theme.c.softText+";"}
`,vt=d.a.a`
  color: ${({theme:e})=>e.c.visitedLink};
`,kt=({activeRunner:e,onSelectRunner:t})=>Object(r.jsxs)(xt,{children:[Object(r.jsx)(St,{children:"Examples"}),Object(r.jsxs)("p",{children:["Click one of those buttons to change the editor runtime environment and see the sample code below.",Object(r.jsx)("br",{}),"Current selection is:"," ",Object(r.jsxs)(vt,{href:e.docsURL,target:"_blank",rel:"noreferrer",children:[e.label," (click here to see the docs)"]})]}),Object(r.jsxs)("div",{style:{display:"flex"},children:[Object(r.jsx)(Et,{isActive:e.id==pt.id,onClick:()=>t(pt),style:{color:"#f0d000"},children:pt.label}),Object(r.jsxs)(Et,{isActive:e.id==bt.id,onClick:()=>t(bt),style:{color:"#5cceed"},children:[Object(r.jsx)("img",{src:"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xMS41IC0xMC4yMzE3NCAyMyAyMC40NjM0OCI+CiAgPHRpdGxlPlJlYWN0IExvZ288L3RpdGxlPgogIDxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyLjA1IiBmaWxsPSIjNjFkYWZiIi8+CiAgPGcgc3Ryb2tlPSIjNjFkYWZiIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiPgogICAgPGVsbGlwc2Ugcng9IjExIiByeT0iNC4yIi8+CiAgICA8ZWxsaXBzZSByeD0iMTEiIHJ5PSI0LjIiIHRyYW5zZm9ybT0icm90YXRlKDYwKSIvPgogICAgPGVsbGlwc2Ugcng9IjExIiByeT0iNC4yIiB0cmFuc2Zvcm09InJvdGF0ZSgxMjApIi8+CiAgPC9nPgo8L3N2Zz4K",height:"20",style:{marginRight:5},alt:"React"}),bt.label]}),Object(r.jsx)(Et,{isActive:e.id==mt.id,onClick:()=>t(mt),style:{color:"#ed225d"},children:mt.label})]})]}),It=()=>Object(r.jsxs)(xt,{children:[Object(r.jsx)(St,{children:"Links"}),Object(r.jsxs)("ul",{children:[Object(r.jsx)("li",{children:Object(r.jsx)("a",{href:"https://github.com/Gregoor/tofu",children:"Source"})}),Object(r.jsx)("li",{children:Object(r.jsx)("a",{href:"https://github.com/Gregoor/tofu/issues",children:"Issues"})}),Object(r.jsxs)("li",{children:[Object(r.jsx)("a",{href:"https://gregoor.github.io/syntactor/",children:"Syntactor"})," - My previous attempt at tackling this"]}),Object(r.jsxs)("li",{children:[Object(r.jsx)("a",{href:"https://dflate.io/code-is-not-just-text",children:"Code is not just text"})," ","- A blog post I wrote in early 2017, lining out my thinking at the time about code editing"]})]})]});function At(){const[e,t]=function(){const[e,t]=Object(o.useState)((()=>[pt,bt,mt].find((e=>e.id==localStorage.getItem("runner")))||bt)),n=Object(o.useRef)(0);return[{...e,run:(...t)=>{e.run(...t,n.current++)}},e=>{localStorage.setItem("runner",e.id),t(e)}]}(),[n]=Object(o.useState)((()=>localStorage.getItem("source")||e.example)),[c,i]=Object(o.useState)(null),a=Object(o.useRef)(null),d=Object(o.useRef)(null),h=Object(s.f)(),p=Object(u.a)((t=>{try{e.run(a.current,t,(e=>{i(e)}))}catch(n){console.error("asd",n)}}),200);return Object(r.jsxs)(jt,{children:[Object(r.jsx)(l.a,{styles:l.b`
          body {
            background: ${h.c.bg};
            color: ${h.c.text};
          }

          h2 {
            color: ${h.c.softText};
          }

          a:visited {
            color: ${h.c.visitedLink};
          }

          p {
            margin-block-start: ${h.l.abyss};
            margin-block-end: ${h.l.abyss};
          }

          body > iframe {
            display: none !important;
          }

          .console-log {
            margin: 0 -${h.l.abyss};
            padding: 0 ${h.l.abyss};
            width: 100%;

            & > * {
              border-bottom: 1px solid #dbdbdb;
              margin: ${h.l.gap} 0;
              width: 100%;

              &:last-child {
                border-bottom: none;
              }
            }
          }
        `}),Object(r.jsx)($e,{}),Object(r.jsx)(wt,{}),Object(r.jsx)($e,{}),Object(r.jsx)(kt,{activeRunner:e,onSelectRunner:n=>{e.cleanUp(a.current),t(n),d.current.setSource(n.example)}}),Object(r.jsx)($e,{}),Object(r.jsxs)(xt,{children:[Object(r.jsx)(St,{children:"Result"}),Object(r.jsx)(yt,{ref:a})]}),Object(r.jsx)($e,{}),Object(r.jsx)(ht,{ref:d,initialSource:n,runtimeError:c,onChange:e=>{p.callback(e),localStorage.setItem("source",e)}}),Object(r.jsx)($e,{}),Object(r.jsx)(It,{})]})}const Ct=window.matchMedia("(prefers-color-scheme: dark)");function Tt(){const[e,t]=Object(o.useState)((()=>Ct.matches?Te:Ce));return Object(o.useEffect)((()=>{Ct.addEventListener("change",(()=>{t(Ct.matches?Te:Ce)}))}),[t]),Object(r.jsx)(s.c,{theme:e,children:Object(r.jsx)(At,{})})}a.a.render(Object(r.jsx)(c.a.StrictMode,{children:Object(r.jsx)(Tt,{})}),document.getElementById("root"))},99:function(e,t,n){var r=n(379),s=["format"];e.exports=function(){var e=new Worker(n.p+"74a8553848b150efd6a6.worker.js",{name:"[hash].worker.js"});return r(e,s),e}}},[[380,1,2]]]);
//# sourceMappingURL=main.b1211b2d.chunk.js.map