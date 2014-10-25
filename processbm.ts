// To compile: tsc processbm.ts --module commonjs
// To use: 
//   0. make benchall > octanebench 2>&1
//   1. node processbm.js
///<reference path='./samples/node/node.d.ts' />
import fs = require('fs');

var get_t = function(name, is_new) {
    var line = is_new ? 2 : 1;
    var num = fs.readFileSync(name, "utf8").split('\n')[line].split(' ')[1];
    return Number(num);
}

class StringBuilder
{
    value: string;

    constructor(init: string) {
	this.value = init;	
    }

    add(s: string) :StringBuilder {
	this.value += "\n" + s;
	return this;
    }

    get() :string {
	return this.value;
    }
}

var get_row = function(name, s, x: StringBuilder) :void {
    x.add("<tr>");
    x.add("<td>").add(name).add("</td>").add("<td>").add(s).add("</td>");
    x.add("</tr>");
}

var overhead = function(v1, v2) {
    return ((((v2 - v1)/v1) * 100).toFixed(2) + "%");
}

var html_data = function() :string {
    var plain = get_t("dump.safe", false);
    var safe = get_t("dump.safe.boot", false);
    var opt = get_t("dump.opt.boot", false);
    var weak = get_t("dump.weak.boot", false);
    var tsstar = get_t("dump.tsstar.boot", false);

    var x = new StringBuilder("");
    get_row("Plain", plain, x);
    get_row("Safe", safe + " (" + overhead(plain, safe) + ")", x);
    get_row("Safe Optimized", opt + " (" + overhead(safe, opt) + ")", x);
    get_row("Safe with Weak Maps", weak + " (" + overhead(safe, weak) + ")", x);
    get_row("Safe*", tsstar + " (" + overhead(safe, tsstar) + ")", x);    

    return x.get();
}

var new_html_data = function() :string {
    var plain = get_t("dump.newts", true);
    var safe = get_t("dump.safe.newts", true);
    var opt = get_t("dump.opt.newts", true);
    var weak = get_t("dump.weak.newts", true);
    var tsstar = get_t("dump.tsstar.newts", true);
    
    var x = new StringBuilder("");
    get_row("Plain", plain, x);
    get_row("Safe", safe + " (" + overhead(plain, safe) + ")", x);
    get_row("Safe Optimized", opt + " (" + overhead(safe, opt) + ")", x);
    get_row("Safe with Weak Maps", weak + " (" + overhead(safe, weak) + ")", x);
    get_row("Safe*", tsstar + " (" + overhead(safe, tsstar) + ")", x);

    return x.get();
}

fs.writeFileSync("data.html", html_data());
fs.writeFileSync("newtsdata.html", new_html_data());
