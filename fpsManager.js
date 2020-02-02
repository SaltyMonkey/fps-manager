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
* @property {import('./lib/unitControl')} cmd
* @property {*} mod
*/

const units = [
	["proto", require("./lib/unitProto")],
	["data", require("./lib/unitState")],
	["tracker", require("./lib/unitTracker")],
	["fps", require("./lib/unitFps")],
	["cmd", require("./lib/unitControl")]
];

class FpsManager {
	constructor(mod) {
		//check compatibility (only warning atm)
		if (mod.proxyAuthor !== "caali") 
			mod.error("This mod using possibly will be broken with this runtime.");
		else if(mod.proxyAuthor === "caali" && !mod.clientInterface) 
			mod.error("Proxy runtime detected. Proper work not guaranteed.");
		
		mod.game.initialize("me");

		/** 
		* @type {deps}
		*/
		let deps = {};
		units.forEach(unit => {
			// eslint-disable-next-line no-magic-numbers
			deps[unit[0]] = new unit[1](deps);
		});

		//just in case units will need custom destructors, register them
		this.destructor = () => {
			Object.keys(deps).forEach(key => {
				if (typeof deps[key].destructor === "function") { deps[key].destructor(); }
			});
		};
	}
}

module.exports = FpsManager;