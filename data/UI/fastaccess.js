"use strict";
/* eslint-disable node/no-missing-require */
/* eslint-disable global-require */
/* eslint-disable default-case */
/* eslint-disable no-undef */
document.addEventListener("DOMContentLoaded", () => {
	//-----------------------
	// IMPORTS
	//-----------------------
	const { Renderer } = require("tera-mod-ui");
	let mod = new Renderer;

	mod.send("ready");
});
