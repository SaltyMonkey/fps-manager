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
			deps.log.send(`FPS Manager commands:
fm auto / fm a - enables automatic trigger preset settings
fm class / fm c - enables class based presets (after relog)
fm help / fm h - prints this message in chat
fm mode (mode) / fm m - switches current mode
fm list / fm l - prints available modes in chat
fm debug / fm d - enables debug mode
fm clean / fm cl - prints fm messages in toolbox log instead of chat
fm interactive / fm i - enables printing details about auto mode`);
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

		const cleanChatSettingsHandler = () => {
			deps.mod.settings.cleanChat = !deps.mod.settings.cleanChat;
			deps.log.send(`Clean chat mode was ${deps.mod.settings.cleanChat ? "a" : "dea"}ctivated.`);
		};

		const interactiveSettingsHandler = () => {
			deps.mod.settings.interactive = !deps.mod.settings.interactive;
			deps.log.send(`Interactive mode was ${deps.mod.settings.interactive ? "a" : "dea"}ctivated.`);
		};

		const activeModeHandler = (str) => {
			let res = stringSimilarity.findBestMatch((str || ""), Object.keys(deps.data.preset.modes));

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
			"debug": debugSettingsHandler,
			"cl": cleanChatSettingsHandler,
			"clean": cleanChatSettingsHandler,
			"i": interactiveSettingsHandler,
			"interactive": interactiveSettingsHandler
		};

		let prefixes = ["fm"];
		if(deps.mod.settings.fpsUtilsCommandsPrefix) prefixes.push("fps");
		if(deps.mod.settings.registerCommands) deps.mod.command.add(prefixes, commands, this);
	}
}
module.exports = Commands;