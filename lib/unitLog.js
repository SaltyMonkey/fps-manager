"use strict";

/*
* Unit for Fps Manager. Log wrapper
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/

class unitLog {
	/**
	 *Creates an instance of unitLog.
	 * @param {deps} deps dependencies
	 * @memberof unitLog
	 */
	constructor(deps) {
		this.__mod = deps.mod;
	}

	/**
	 * @description writes log line into console/game based on settings
	 * @param {*} msg message
	 * @memberof unitLog
	 */
	send(...msg) {
		if(this.__mod.settings.cleanChat) this.__mod.log(...msg);
		else this.__mod.command.message(...msg);
	}

}

module.exports = unitLog;