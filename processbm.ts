// To compile: tsc processbm.ts --module commonjs
// To use: 
//   0. make benchall > octanebench 2>&1
//   1. node processbm.js
///<reference path='./samples/node/node.d.ts' />
import fs = require('fs');

var get_t = function(name: string) :string {
    var str = fs.readFileSync(name, "utf8").split('\n')[1].split(' ')[0];
    var num = str.substring(0, str.length - 4);
    return num;
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

var html_data = function() :string {
    var safe = get_t("dump.safe.boot");
    var opt = get_t("dump.opt.boot");
    var weak = get_t("dump.weak.boot");
    var tsstar = get_t("dump.tsstar.boot");
    
    var x = new StringBuilder("");
    var get_row = function(name: string, s: string) :void {
	x.add("<tr>");
	x.add("<td>").add(name).add("</td>").add("<td>").add(s).add("</td>");
	x.add("</tr>");
    }

    var x = new StringBuilder("");
    get_row("Safe", safe);
    get_row("Safe Optimized", opt);
    get_row("Safe with Weak Maps", weak);
    get_row("Safe*", tsstar);

    return x.get();
}

fs.writeFileSync("data.html", html_data());