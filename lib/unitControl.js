"use strict";

/*
* Unit for Fps Manager. Adds support for manual module control 
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/
const rfdc = require("rfdc")({ "proto": true });

class unitControl {
	/**
	 *Creates an instance of Control.
	 * @param {deps} deps
	 * @memberof unitControl
	*/
	constructor(deps) {
		let prefixes = ["fm", "fps"];

		const info = () => {
			deps.mod.command.message("FPS Manager information.");
		};

		const help = () => {
			deps.mod.command.message("FPS Manager help.");
		};

		const auto = () => {
			deps.data.settings.applyTriggers = !deps.data.settings.applyTriggers;
			deps.mod.command.message(`Triggers ${deps.data.settings.applyTriggers ? "a" : "dea"}ctivated.`);
		};

		const classs = () => {
			deps.data.settings.classBasedPresets = !deps.data.settings.classBasedPresets;
			deps.mod.command.message(`Class based presets will be ${deps.data.settings.classBasedPresets ? "a" : "dea"}ctivated after relog.`);
		};

		const debug = () => {
			deps.data.settings.debug = !deps.data.settings.debug;
			deps.mod.command.message(`Debug ${deps.data.settings.debug ? "a" : "dea"}ctivated.`);
		};

		const mode = (str) => {
			if(deps.data.preset[str]) {
				deps.data.prevMode = rfdc(deps.data.activeMode);
				deps.data.activeMode = deps.data.preset[str];
				deps.data._eventTrigger();
				deps.mod.command.message("Mode changed.");
			}
			else {
				deps.mod.command.message("Incorrect mode.");
			}
		};

		const commands = {
			"i": info,
			"info": info,
			"a": auto,
			"auto": auto,
			"c": classs,
			"class": classs,
			"h": help,
			"help": help,
			"m": mode,
			"mode": mode,
			"d": debug,
			"debug": debug
		};

		deps.mod.command.add(prefixes, commands);
	}
}
module.exports = unitControl;