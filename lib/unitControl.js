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

		console.log("DEBUG: unitControl -> constructor");

		if(deps.data.settings.customCommandTag && deps.data.settings.customCommandTag.length)
			prefixes.push(deps.data.settings.customCommandTag);

		const infoHandler = () => {
			deps.mod.command.message("FPS Manager information.");
		};

		const helpHandler = () => {
			deps.mod.command.message("FPS Manager help.");
		};

		const autoSettingHandler = () => {
			deps.data.settings.applyTriggers = !deps.data.settings.applyTriggers;
			deps.mod.command.message(`Triggers ${deps.data.settings.applyTriggers ? "a" : "dea"}ctivated.`);
		};

		const classBasedPresetSettingHandler = () => {
			deps.data.settings.classBasedPresets = !deps.data.settings.classBasedPresets;
			deps.mod.command.message(`Class based presets will be ${deps.data.settings.classBasedPresets ? "a" : "dea"}ctivated after relog.`);
		};

		const debugSettingsHandler = () => {
			deps.data.settings.debugMode = !deps.data.settings.debugMode;
			deps.mod.command.message(`Debug ${deps.data.settings.debugMode ? "a" : "dea"}ctivated.`);
		};

		const activeModeHandler = (str) => {
			if(deps.data.preset[str]) {
				deps.data.prevMode = rfdc(deps.data.activeMode);
				deps.data.activeMode = deps.data.preset[str];
				deps.mod.command.message(`Mode was changed to ${str}.`);
				deps.data._eventTrigger();
			}
			else {
				deps.mod.command.message(`Mode ${str} was not found.`);
			}
		};

		const commands = {
			"i": infoHandler,
			"info": infoHandler,
			"a": autoSettingHandler,
			"auto": autoSettingHandler,
			"c": classBasedPresetSettingHandler,
			"class": classBasedPresetSettingHandler,
			"h": helpHandler,
			"help": helpHandler,
			"m": activeModeHandler,
			"mode": activeModeHandler,
			"d": debugSettingsHandler,
			"debug": debugSettingsHandler
		};

		if(deps.data.settings.enableCommands)
			deps.mod.command.add(prefixes, commands);
	}
}
module.exports = unitControl;