"use strict";

const proto = require("../data/protoData.json");

/*
* Unit for Fps Manager. Managing definitions versions for game protocol
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/

class unitProto {
	/**
	 *Creates an instance of unitProto.
	 * @param {deps} deps dependencies
	 * @memberof unitProto
	 */
	constructor(deps) {
		this.__mod = deps.mod;
	}

	/**
	 * @description returns def version based on current game patch
	 * @param {*} defName definition string
	 * @returns {Array} definition data with version
	 * @memberof unitProto
	 */
	getData(defName) {
		let version = proto[defName][this.__mod.majorPatchVersion];
		return version ? [defName, version] : [defName, proto[defName].default];
	}

}

module.exports = unitProto;