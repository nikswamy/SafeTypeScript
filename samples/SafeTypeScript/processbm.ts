// To compile: tsc processbm.ts --module commonjs
// To use: 
//   0. make benchall > octanebench 2>&1
//   1. node processbm.js
///<reference path='../node/node.d.ts' />
import fs = require('fs');
var lines = fs.readFileSync("octanebench", "utf8").split('\n');

enum Cfg {
    RAW, 
    SAFE, 
    OPT, 
    WEAK, 
    TSSTAR
}
function str2cfg(x:string) {
    switch (x) {
        case "safe": return Cfg.SAFE;
        case "safeopt" : return Cfg.OPT;
        case "weak": return Cfg.WEAK;
        case "tsstar": return Cfg.TSSTAR;
        default: return Cfg.RAW;
    }
}
function cfg2str(c:Cfg) {
    switch (c) {
        case Cfg.SAFE: return "safe";
        case Cfg.OPT: return "opt";
        case Cfg.WEAK: return "weak";
        case Cfg.TSSTAR: return "tsstar";
        default: return "raw";
    }
}

interface Run {
    program:string;
    config:Cfg;
    typed:boolean;
    time:number;
    moe:number;
}

interface Progs {
    [name:string] : Run[];
}

function run2str(r:Run) {
    return "Run{ " +r.program+ ", " +(cfg2str(r.config))+ ", typed?=" +r.typed+ ", mean time= " +r.time+" (+/- " +r.moe + ")}";
}

function parseFile(lines:string[]) : Progs {
    var runs : Run[] = [];
    var progs : Progs = {};
    var mkRun = (j:number) => {
        var fullProgram = lines[j].trim();
        var components = fullProgram.substring(5).split('.');
        var cfg = str2cfg(components[2]);
        var typed = fullProgram.toLowerCase().match(/typed/);
        var time = parseFloat(lines[j + 2].substring(6));
        var moe = parseFloat(lines[j + 3].substring(5));
        var name = components[0] + "." + components[1];
        var r = {program:name,
                 config:cfg,
                 typed:typed && typed.length !== 0,
                 time:time,
                 moe:moe};
        if (progs[name]) {
            progs[name].push(r);
        } else {
            progs[name] = [r];
        }
        return r;
    };
    for (var i =0; i < lines.length; i++) {
        if (lines[i].trim() === "Safe TypeScript") {
            runs.push(mkRun(i+4));
        }
    }
    //runs.forEach((r) => console.log(run2str(r)));
    return progs;
}



function getConfig(r:Run[], cfg:Cfg) :Run {
    var c = r.filter((p) => p.config===cfg)[0];
    if (!c) {
        console.log("Could not find config " + cfg2str(cfg) + " for " +r[0].program);
    }
    return c;
}

function percent(n:number) {
    return new Number(n * 100).toFixed(2);
}
function timeDiff(r1:Run, r2:Run) : any {
    if (!r1 || !r2) { return "UNKNOWN"; }
    var mean = (r2.time - r1.time) / r1.time;
    var up = ((r2.time + r2.moe) - (r1.time - r1.moe)) / (r1.time - r1.moe);
    var down = ((r2.time - r2.moe) - (r1.time + r1.moe)) / (r1.time + r1.moe);
    var mean = (up + down) / 2;
    return percent(mean) + "%";
}

function stats(p:Progs) {
    /*for (var prog in p) {
        console.log("Program " +prog);
        console.log("\t Safe  (wrt Raw): " +timeDiff(getConfig(p[prog], Cfg.RAW), getConfig(p[prog], Cfg.SAFE)));
        console.log("\t Opt  (wrt Safe): " +timeDiff(getConfig(p[prog], Cfg.SAFE), getConfig(p[prog], Cfg.OPT)));
        console.log("\t Weak (wrt Safe): " +timeDiff(getConfig(p[prog], Cfg.SAFE), getConfig(p[prog], Cfg.WEAK)));
        console.log("\t TS*  (wrt Safe): " +timeDiff(getConfig(p[prog], Cfg.SAFE), getConfig(p[prog], Cfg.TSSTAR)));
    }*/
    var x = new StringBuilder("");
    for (var prog in p) {
	x.add("<tr>");
	x.add("<td>").add(prog.split(".")[1]).add("</td>");
        x.add("<td>").add(timeDiff(getConfig(p[prog], Cfg.RAW), getConfig(p[prog], Cfg.SAFE)).toString()).add("</td>");
        x.add("<td>").add(timeDiff(getConfig(p[prog], Cfg.SAFE), getConfig(p[prog], Cfg.OPT)).toString()).add("</td>");
        x.add("<td>").add(timeDiff(getConfig(p[prog], Cfg.SAFE), getConfig(p[prog], Cfg.WEAK)).toString()).add("</td>");
        x.add("<td>").add(timeDiff(getConfig(p[prog], Cfg.SAFE), getConfig(p[prog], Cfg.TSSTAR)).toString()).add("</td>");
	x.add("</tr>");
    }
    return x.get();
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

function html_data(progs: Progs) :string
{
    var x = new StringBuilder("");

    for(var name in progs) {
	var prog = progs[name];
	var def = getConfig(prog, Cfg.RAW);
	var safe = getConfig(prog, Cfg.SAFE);
	var opt = getConfig(prog, Cfg.OPT);
	var weak = getConfig(prog, Cfg.WEAK);
	var tsstar = getConfig(prog, Cfg.TSSTAR);

	x.add("<tr>");
	x.add("<td>").add(name.split(".")[1]).add("</td>");
	x.add("<td>").add(def.time.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(def.moe.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(safe.time.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(safe.moe.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(opt.time.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(opt.moe.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(weak.time.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(weak.moe.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(tsstar.time.toPrecision(3).toString()).add("</td>");
	x.add("<td>").add(tsstar.moe.toPrecision(3).toString()).add("</td>");
	x.add("</tr>");
    }

    return x.get();
}

var progs = parseFile(lines);
fs.writeFileSync("data.html", html_data(progs));
fs.writeFileSync("slowdowns.html", stats(progs));
