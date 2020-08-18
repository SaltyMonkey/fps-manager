/* eslint-disable global-require */
"use strict";

/*
* Fps Manager loader. Managing units start and prerequisites
* Author: SaltyMonkey
* Contributors:
*/

/**
* Dependencies
* @typedef {Object} deps
* @property {import('./lib/unitProto')} proto
* @property {import('./lib/unitState')} data
* @property {import('./lib/unitTracker')} tracker
* @property {import('./lib/unitFps')} fps
* @property {import('./lib/management/cmd')} cmd
* @property {*} mod
*/

const msg = {
	"proxyWarning": "Proxy runtime detected. Proper work not guaranteed.",
	"runtimeWarning": "Outdated runtime detected. Proper work not guaranteed.",
	"runtimeOld": "Runtime is so old."
};

const units = [
	["log", require("./lib/unitLog")],
	["proto", require("./lib/unitProto")],
	["data", require("./lib/unitState")],
	["tracker", require("./lib/unitTracker")],
	["fps", require("./lib/unitFps")],
	["cmd", require("./lib/management/cmd")]
];

class FpsManager {
	constructor(mod) {
		/** 
		* @type {deps}
		*/

		let deps = { "mod": mod };

		//check compatibility (only warning atm)
		if (mod.isProxyCompat)
			mod.error(msg.proxyWarning);
		// eslint-disable-next-line node/no-missing-require
		else if (!require("tera-data-parser").types)
			mod.error(msg.runtimeOld);

		mod.game.initialize("me");
		mod.game.initialize("party");
		
		units.forEach(unit => {
			// eslint-disable-next-line no-magic-numbers
			deps[unit[0]] = new unit[1](deps);
		});

		//just in case units will need custom destructors, register them
		this.destructor = () => {
			Object.keys(deps).forEach(key => {
				if (key !== "mod" && typeof deps[key].destructor === "function") { deps[key].destructor(); }
			});
		};
	}
}

module.exports = FpsManager;