// ==UserScript==
// @namespace         https://www.github.com/Cat7373/remove-web-limits/
// @name              网页限制解除
// @description       解除大部分网站禁止复制、剪切、选择文本、右键菜单的限制。
// @homepageURL       https://github.com/xinggsf/gm/
// @supportURL        https://github.com/Cat7373/remove-web-limits/issues/
// @author            Cat73  xinggsf
// @version           1.5
// @license           LGPLv3
// @include           http*
// @grant             GM_addStyle
// @run-at            document-start
// ==/UserScript==

'use strict';
if (!Array.prototype.includes) {
	Array.prototype.includes = function(s, pos) {
		return this.indexOf(s, pos)> -1;
	};
}

// 域名规则列表
let rules = {
	white_rule: {
		name: "white",
		hook_eventNames: "",
		unhook_eventNames: ""
	},
	default_rule: {
		name: "default",
		hook_eventNames: "contextmenu|select|selectstart|copy|cut|dragstart",
		unhook_eventNames: "mousedown|mouseup|keydown|keyup",
		dom0: true,
		hook_addEventListener: true,
		hook_preventDefault: true,
		hook_set_returnValue: true,
		add_css: true
	}
};
// 不作处理的域名列表
let white_list = [
	'.youtube.com',
	'.wikipedia.org',
	'mail.qq.com',
	'translate.google.'
];

// 返回true的函数
let returnTrue = e => true;
// 获取随机字符串
let getRandStr = () => '_X'+ Math.random().toString(36).slice(2);
// 要处理的 event 列表
let hook_eventNames, unhook_eventNames, eventNames;
// 储存名称
let storageName = getRandStr();
// 储存被 Hook 的函数
let EventTarget_addEventListener = EventTarget.prototype.addEventListener;
let document_addEventListener = document.addEventListener;
let Event_preventDefault = Event.prototype.preventDefault;

// Hook addEventListener proc
function addEventListener(type, func, useCapture) {
	let _addEventListener = this === document ? document_addEventListener : EventTarget_addEventListener;
	if (hook_eventNames.includes(type)) {
		_addEventListener.apply(this, [type, returnTrue, useCapture]);
	} else if (unhook_eventNames.includes(type)) {
		let funcsName = storageName + type + (useCapture ? 't' : 'f');

		if (this[funcsName] === undefined) {
			this[funcsName] = [];
			_addEventListener.apply(this, [type, useCapture ? unhook_t : unhook_f, useCapture]);
		}

		this[funcsName].push(func);
	} else {
		_addEventListener.apply(this, arguments);
	}
}

// 清理或还原DOM节点的onxxx属性
function clearLoop() {
	let e, k, prop,
	c = [document,document.body, ...document.getElementsByTagName('div')];
	// https://life.tw/?app=view&no=746862
	e = document.querySelector('iframe[src="about:blank"]');
	if (e && e.clientWidth>99 && e.clientHeight>99) c.push(e.contentWindow.document);

	for (e of c) for (k of eventNames) {
		prop = 'on' + k;
		if (e && e[prop] !== null && e[prop] !== onxxx) {
			if (unhook_eventNames.includes(k)) {
				e[storageName + prop] = e[prop];
				e[prop] = onxxx;
			} else {
				e[prop] = null;
			}
		}
	}
}

function unhook_t(e) {
	return unhook(e, this, storageName + e.type + 't');
}
function unhook_f(e) {
	return unhook(e, this, storageName + e.type + 'f');
}
function unhook(e, self, funcsName) {
	for (let func of self[funcsName]) func(e);
	e.returnValue = true;
	return true;
}
function onxxx(e) {
	let name = storageName + 'on' + e.type;
	this[name](e);
	e.returnValue = true;
	return true;
}

// 获取目标域名应该使用的规则
function getRule(host) {
	if (white_list.some(k => host.includes(k)))
		return rules.white_rule;
	return rules.default_rule;
}

// 初始化
function init() {
	// 获取当前域名的规则
	let rule = getRule(location.host);

	// 设置 event 列表
	hook_eventNames = rule.hook_eventNames.split("|");
	// TODO Allowed to return value
	unhook_eventNames = rule.unhook_eventNames.split("|");
	eventNames = hook_eventNames.concat(unhook_eventNames);

	// 调用清理 DOM0 event 方法的循环
	if (rule.dom0) {
		setInterval(clearLoop, 9e3);
		setTimeout(clearLoop, 1e3);
		window.addEventListener('load', clearLoop, true);
	}

	// hook addEventListener
	if (rule.hook_addEventListener) {
		EventTarget.prototype.addEventListener = addEventListener;
		document.addEventListener = addEventListener;
	}

	// hook preventDefault
	if (rule.hook_preventDefault) {
		Event.prototype.preventDefault = function () {
			if (!eventNames.includes(this.type)) {
				Event_preventDefault.apply(this, arguments);
			}
		};
	}

	// Hook set returnValue
	if (rule.hook_set_returnValue) {
		Object.defineProperty(Event.prototype, 'returnValue', {
			set() {
				if (this.returnValue !== true && eventNames.includes(this.type)) {
					this.returnValue = true;
				}
			}
		});
	}

	/*  Hook HTMLElement's setter  fail to hook! why?
	for (let p of eventNames) {
		Object.defineProperty(HTMLElement.prototype, 'on'+ p, {
			set(val) {
				if (val !== null) this['on'+ p] = null;
			}
		});
	} */

	console.debug('url: ' + location.href, 'storageName：' + storageName, 'rule: ' + rule.name);
	if (rule.add_css) GM_addStyle(
	`html, * {
		-webkit-user-select:text !important; -moz-user-select:text !important;
	}
	::selection {color:#111; background:#05D3F9; !important;}`);
}

init();