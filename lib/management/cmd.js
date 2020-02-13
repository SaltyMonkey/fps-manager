"use strict";

/*
* Unit for Fps Manager. Adds support for manual module control 
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../../fpsManager.js").deps} deps
*/
const rfdc = require("rfdc")({ "proto": true });
const stringSimilarity = require("string-similarity");

class Commands {
	/**
	 *Creates an instance of Control.
	 * @param {deps} deps
	 * @memberof Commands
	*/
	constructor(deps) {

		const helpHandler = () => {
			deps.log.send("FPS Manager help.");

		};

		const autoSettingHandler = () => {
			deps.mod.settings.enableEvents = !deps.mod.settings.enableEvents;
			deps.log.send(`Triggers ${deps.mod.settings.enableEvents ? "a" : "dea"}ctivated.`);
		};

		const classBasedPresetSettingHandler = () => {
			deps.mod.settings.classBasedPresets = !deps.mod.settings.classBasedPresets;
			deps.log.send(`Class based presets will be ${deps.mod.settings.classBasedPresets ? "a" : "dea"}ctivated after relog.`);
		};

		const debugSettingsHandler = () => {
			deps.mod.settings.debugMode = !deps.mod.settings.debugMode;
			deps.log.send(`Debug mode was ${deps.mod.settings.debugMode ? "a" : "dea"}ctivated.`);
		};

		const activeModeHandler = (str) => {
			let res = stringSimilarity.findBestMatch(str, Object.keys(deps.data.preset.modes));

			// eslint-disable-next-line no-magic-numbers
			if(res.bestMatch.rating < 0.2) { deps.log.send("Mode was not found"); return; }

			deps.data.prevMode = rfdc(deps.data.activeMode);
			deps.data.activeMode = deps.data.preset.modes[res.bestMatch.target];
			
			deps.log.send(`Mode was changed to "${res.bestMatch.target}".`);
			deps.data._eventTrigger();
		};

		const modeListHandler = () => {
			deps.log.send("Current preset contains:");
			Object.keys(deps.data.preset.modes).forEach(key => {
				deps.log.send(`${key}`);
			});
		};

		const commands = {
			"a": autoSettingHandler,
			"auto": autoSettingHandler,
			"c": classBasedPresetSettingHandler,
			"class": classBasedPresetSettingHandler,
			"h": helpHandler,
			"help": helpHandler,
			"m": activeModeHandler,
			"mode": activeModeHandler,
			"l": modeListHandler,
			"list": modeListHandler,
			"d": debugSettingsHandler,
			"debug": debugSettingsHandler
		};

		let prefixes = ["fm"];
		if(deps.mod.settings.fpsUtilsCommandsPrefix) prefixes.push("fps");
		if(deps.mod.settings.registerCommands) deps.mod.command.add("fm", commands, this);
	}
}
module.exports = Commands;