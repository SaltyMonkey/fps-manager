/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
/* eslint-disable no-magic-numbers */
"use strict";

// ignore these files for making manifest
const IGNORED_FILES = [
	"package-lock.json",
	"module.json",
	"manifest.json",
	"manifest-generator.js",
	"manifest-generator.bat",
	"manifest-generator.exe",
	"node.exe"
];

// ignore files/folders which start with these characters: i.e. ".git" or "_old"
const IGNORED_CHARACTERS = [
	".",
	"_"
];

////////////////////
//  CODE          //
////////////////////

const crypto = require("crypto"),
	fs = require("fs"),
	path = require("path");

// set directory to launch argument or local directory
let directory = __dirname;
if (process.argv[2]) {
	directory = process.argv[2];
	// check if valid directory
	try {
		fs.readdirSync(directory, "utf8");
	}
	catch (err) {
		return;
	}
}

// read existing module.json
let modulejson = null;
try {
	modulejson = require(path.join(directory, "module.json"));
}
catch (error) {
	modulejson = {};
}

modulejson.disableAutoUpdate = false;


modulejson.name = "fps-manager";
modulejson.options = {
	niceName: "FPM",
	guiName: "FPS Manager",
};
modulejson.author = "SaltyMonkey";
modulejson.description = "FPS Manager is modern and extremely customizable module for Tera Toolbox which can help to solve annoynce by some ingame messages and fps drops.";
modulejson.servers = ["https://raw.githubusercontent.com/SaltyMonkey/fps-manager/master/"];
modulejson.supportUrl = ["https://github.com/SaltyMonkey/fps-manager/issues"];

fs.writeFileSync(path.join(directory, "module.json"), jsonify(modulejson), "utf8");

// read existing manifest.json
let manifest = null;
try {
	// sanitize input
	manifest = require(path.join(directory, "manifest.json"));
	if (manifest && typeof manifest === "object") {
		if (!manifest.files) manifest.files = {};
	}
	else {
		manifest = {
			"files": {}
		};
	}
}
catch (error) {
	// make new manifest
	manifest = {
		"files": {}
	};
}

// delete removed file entries
let checking = 0;
for (let entry of Object.keys(manifest.files)) {
	// check if file exists
	checking += 1;
	fs.access(path.join(directory, entry), fs.constants.F_OK, (err) => {
		checking -= 1;
		if (err) delete manifest.files[entry];
		checkProg();
		return;
	});
}

let reading = 0;
getFiles();

// get all files in folder and subfolder
function getFiles(relativePath = "", files) {
	let dir = path.join(directory, relativePath);
	if (!files) files = fs.readdirSync(dir, "utf8");
	for (let file of files) {
		// if not ignored file or begins with ignored character
		if (!IGNORED_FILES.includes(file) && !IGNORED_CHARACTERS.includes(file[0])) {
			reading += 1;
			fs.readdir(path.join(dir, file), "utf8", (err, moreFiles) => {
				if (moreFiles) {
					getFiles(path.join(relativePath, file), moreFiles);
				}
				else {
					getHash(path.join(relativePath, file));
				}
				reading -= 1;
				checkProg();
			});
		}
	}
}

// get sha256 hash
function getHash(file, type = "sha256") {
	file = file.replace(/\\/g, "/");
	if (manifest.files[file] && typeof manifest.files[file] === "object") {
		manifest.files[file].hash = crypto.createHash(type).update(fs.readFileSync(path.join(directory, file))).digest("hex");
	}
	else {
		manifest.files[file] = crypto.createHash(type).update(fs.readFileSync(path.join(directory, file))).digest("hex");
	}
}


// JSON.stringify but make lists single line
function jsonify(obj) {
	obj = JSON.stringify(obj, null, "    ");
	let lists = obj.match(/\[[^]+?\].*/igm);
	if (lists) for (let list of lists) {
		obj = obj.substring(0,obj.indexOf(list)) + list.replace(/[ \n\t]*/igm, "") + obj.substring(obj.indexOf(list) + list.length);
	}
	return obj;
}

// alphabetize object keys
function alphabetizeObject(obj) {
	let keys = Object.keys(obj);
	keys.sort();
	let newObj = {};
	for (let key of keys) {
		newObj[key] = obj[key];
	}
	return newObj;
}

// check if process completed
function checkProg() {
	if (reading === 0 && checking === 0) {
		manifest.files = alphabetizeObject(manifest.files);
		fs.writeFileSync(path.join(directory, "manifest.json"), jsonify(manifest), "utf8");
	}
}